#!/usr/bin/env python3
"""
Tkinter UI: review schema prefix classifier JSONL — approve/reject, export, keyboard shortcuts.

  python schema_prefix_review_ui.py
  python schema_prefix_review_ui.py path/to/schema_prefix_full.jsonl

Shortcuts:
  Ctrl+O     Open JSONL
  Enter / Y  Approve (current row)
  N          Reject
  Right / Down  Next (in batch)
  Left / Up     Previous
  Ctrl+S     Export approved JSON + save review state

Exports:
  <stem>_approved.json
  <stem>_review_state.json
"""

from __future__ import annotations

import argparse
import difflib
import json
import sys
import threading
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, ttk
from typing import Any, Dict, List, Optional, Tuple

_BASE = Path(__file__).resolve().parent
if str(_BASE) not in sys.path:
    sys.path.insert(0, str(_BASE))

from schema_prefix_common import build_final_block, quick_read_schema_block


def load_records(path: Path) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            if row.get("event") in ("run_start", "run_end"):
                continue
            if row.get("schema_id") and row.get("result") is not None:
                out.append(row)
    return out


def scan_classifier_progress(path: Path) -> Tuple[int, int, bool]:
    """(ok_rows_count, total_schemas_from_run_start, has_run_end)."""
    ok_count = 0
    total = 0
    ended = False
    if not path.is_file():
        return 0, 0, False
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            if row.get("event") == "run_start":
                total = int(row.get("total_schemas") or 0)
            if row.get("event") == "run_end":
                ended = True
            if row.get("ok") is True and row.get("schema_id"):
                ok_count += 1
    return ok_count, total, ended


def count_reviewed(decisions: Dict[str, str]) -> Tuple[int, int, int]:
    ap = sum(1 for d in decisions.values() if d == "approved")
    rj = sum(1 for d in decisions.values() if d == "rejected")
    pe = sum(1 for d in decisions.values() if d == "pending")
    return ap, rj, pe


def _diff_ranges(a: str, b: str) -> Tuple[List[Tuple[int, int]], List[Tuple[int, int]]]:
    """Character ranges in a (removed/changed) and b (added/changed) for light highlighting."""
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    orig_ranges: List[Tuple[int, int]] = []
    new_ranges: List[Tuple[int, int]] = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            continue
        if tag in ("delete", "replace"):
            orig_ranges.append((i1, i2))
        if tag in ("insert", "replace"):
            new_ranges.append((j1, j2))
    return orig_ranges, new_ranges


class ReviewApp:
    def __init__(self, root: tk.Tk, initial_path: Optional[Path], *, live_mode: bool = False) -> None:
        self.root = root
        self.root.title("Schema prefix review")
        self.root.geometry("1320x920")
        self.live_mode = live_mode
        self.jsonl_path: Optional[Path] = None
        self.records: List[Dict[str, Any]] = []
        self.index = 0
        self.decisions: Dict[str, str] = {}
        self.approved_blocks: Dict[str, str] = {}
        self._schemas_by_id: Optional[Dict[str, Any]] = None
        self._last_record_sig: Tuple[int, Optional[str]] = (0, None)

        self.batch_index = 0
        self.batch_size_var = tk.IntVar(value=15)
        self.only_changed_var = tk.BooleanVar(value=True)
        self.subject_vars = {
            "M": tk.BooleanVar(value=True),
            "P": tk.BooleanVar(value=True),
            "B": tk.BooleanVar(value=True),
            "C": tk.BooleanVar(value=True),
        }

        self._prefetch_generation = 0
        self._prefetch_cache: Dict[str, Tuple[str, str]] = {}
        self._prefetch_lock = threading.Lock()

        self._mono_size = tk.IntVar(value=11)

        main = ttk.Frame(root, padding=8)
        main.pack(fill=tk.BOTH, expand=True)

        top = ttk.Frame(main)
        top.pack(fill=tk.X)
        ttk.Button(top, text="Open JSONL…", command=self._open).pack(side=tk.LEFT, padx=(0, 8))
        self.path_label = ttk.Label(top, text="(no file)")
        self.path_label.pack(side=tk.LEFT)
        self.progress_var = tk.StringVar(value="")
        ttk.Label(top, textvariable=self.progress_var, font=("Segoe UI", 9), foreground="#0a5f38").pack(
            side=tk.LEFT, padx=(12, 0)
        )

        filt = ttk.LabelFrame(main, text="Filters & batch", padding=6)
        filt.pack(fill=tk.X, pady=(0, 6))
        f1 = ttk.Frame(filt)
        f1.pack(fill=tk.X)
        ttk.Label(f1, text="Subject (current schema prefix):").pack(side=tk.LEFT, padx=(0, 8))
        for letter in ("M", "P", "B", "C"):
            ttk.Checkbutton(
                f1,
                text=letter,
                variable=self.subject_vars[letter],
                command=self._on_filter_changed,
                width=3,
            ).pack(side=tk.LEFT, padx=2)
        ttk.Checkbutton(
            f1,
            text="Only prefix change / misnamed",
            variable=self.only_changed_var,
            command=self._on_filter_changed,
        ).pack(side=tk.LEFT, padx=(16, 0))

        f2 = ttk.Frame(filt)
        f2.pack(fill=tk.X, pady=(6, 0))
        ttk.Label(f2, text="Batch size").pack(side=tk.LEFT)
        self._batch_spin = ttk.Spinbox(f2, from_=1, to=500, width=5, textvariable=self.batch_size_var)
        self._batch_spin.pack(side=tk.LEFT, padx=6)
        ttk.Button(f2, text="Approve whole batch", command=self._approve_batch).pack(side=tk.LEFT, padx=(12, 4))
        ttk.Button(f2, text="← Prev batch", command=lambda: self._shift_batch(-1)).pack(side=tk.LEFT, padx=2)
        ttk.Button(f2, text="Next batch →", command=lambda: self._shift_batch(1)).pack(side=tk.LEFT, padx=2)
        self.batch_label_var = tk.StringVar(value="Batch — / —")
        ttk.Label(f2, textvariable=self.batch_label_var, font=("Segoe UI", 10, "bold")).pack(side=tk.LEFT, padx=(16, 0))

        mid = ttk.Panedwindow(main, orient=tk.VERTICAL)
        mid.pack(fill=tk.BOTH, expand=True, pady=8)

        read_fr = ttk.LabelFrame(mid, text="Quick read (heading + core move + context)", padding=6)
        mid.add(read_fr, weight=0)
        qr_top = ttk.Frame(read_fr)
        qr_top.pack(fill=tk.X)
        ttk.Label(qr_top, text="Skim here first — full markdown below (differences highlighted).", font=("Segoe UI", 9)).pack(
            side=tk.LEFT
        )
        qwrap = ttk.Frame(read_fr)
        qwrap.pack(fill=tk.BOTH, expand=True)
        self.quick_text = tk.Text(
            qwrap,
            wrap=tk.WORD,
            font=("Segoe UI", 11),
            height=8,
            relief=tk.FLAT,
            padx=6,
            pady=6,
        )
        qsb = ttk.Scrollbar(qwrap, command=self.quick_text.yview)
        qsb.pack(side=tk.RIGHT, fill=tk.Y)
        self.quick_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        self.quick_text.config(yscrollcommand=qsb.set, state=tk.DISABLED)

        body = ttk.Panedwindow(mid, orient=tk.HORIZONTAL)
        mid.add(body, weight=1)

        left = ttk.Frame(body, width=280)
        body.add(left, weight=0)
        self.listbox = tk.Listbox(left, font=("Consolas", 10), selectmode=tk.SINGLE, exportselection=False)
        self.listbox.pack(fill=tk.BOTH, expand=True)
        self.listbox.bind("<<ListboxSelect>>", self._on_select)
        sb = ttk.Scrollbar(left, command=self.listbox.yview)
        sb.pack(side=tk.RIGHT, fill=tk.Y)
        self.listbox.config(yscrollcommand=sb.set)

        right = ttk.Frame(body)
        body.add(right, weight=1)

        info = ttk.LabelFrame(right, text="Meta", padding=6)
        info.pack(fill=tk.X)
        self.meta_var = tk.StringVar(value="")
        ttk.Label(info, textvariable=self.meta_var, font=("Segoe UI", 10)).pack(anchor=tk.W)

        panes = ttk.Panedwindow(right, orient=tk.HORIZONTAL)
        panes.pack(fill=tk.BOTH, expand=True, pady=6)

        o_fr = ttk.LabelFrame(panes, text="Original block (full)", padding=4)
        panes.add(o_fr, weight=1)
        oh = ttk.Frame(o_fr)
        oh.pack(fill=tk.X)
        ttk.Label(oh, text="Font").pack(side=tk.LEFT)
        ttk.Button(oh, text="A−", width=3, command=lambda: self._bump_mono(-1)).pack(side=tk.LEFT, padx=2)
        ttk.Button(oh, text="A+", width=3, command=lambda: self._bump_mono(1)).pack(side=tk.LEFT, padx=2)
        self.orig_text = tk.Text(o_fr, wrap=tk.WORD, height=14)
        self.orig_text.pack(fill=tk.BOTH, expand=True)

        n_fr = ttk.LabelFrame(panes, text="Proposed / approved (edit before single approve — Enter/Y)", padding=4)
        panes.add(n_fr, weight=1)
        self.new_text = tk.Text(n_fr, wrap=tk.WORD, height=14)
        self.new_text.pack(fill=tk.BOTH, expand=True)
        self._apply_mono_font()

        self.orig_text.tag_configure("diff_orig", background="#fde8e8")
        self.new_text.tag_configure("diff_new", background="#e6f7e6")

        btn = ttk.Frame(main)
        btn.pack(fill=tk.X)
        ttk.Button(btn, text="Approve (Y)", command=self._approve).pack(side=tk.LEFT, padx=4)
        ttk.Button(btn, text="Reject (N)", command=self._reject).pack(side=tk.LEFT, padx=4)
        ttk.Button(btn, text="Reset preview from model", command=self._reset_preview).pack(side=tk.LEFT, padx=4)
        ttk.Button(btn, text="Export approved (Ctrl+S)", command=self._export).pack(side=tk.LEFT, padx=4)

        self.status = tk.StringVar(
            value="Open JSONL. Default: only schemas needing prefix change; filter by M/P/B/C; work in batches."
        )
        ttk.Label(main, textvariable=self.status, font=("Segoe UI", 9)).pack(anchor=tk.W)

        self.root.bind("<Control-o>", lambda e: self._open())
        self.root.bind("<Control-s>", lambda e: self._export())
        self.root.bind("y", lambda e: self._approve())
        self.root.bind("Y", lambda e: self._approve())
        self.root.bind("n", lambda e: self._reject())
        self.root.bind("N", lambda e: self._reject())
        self.root.bind("<Down>", lambda e: self._nav(1))
        self.root.bind("<Up>", lambda e: self._nav(-1))
        self.root.bind("<Right>", lambda e: self._nav(1))
        self.root.bind("<Left>", lambda e: self._nav(-1))

        if initial_path:
            self._load_file(initial_path)

        self.batch_size_var.trace_add("write", lambda *_: self._on_batch_size_changed())

        if self.live_mode and self.jsonl_path:
            self.root.after(500, self._tick_live)

    def _record_sig(self, recs: List[Dict[str, Any]]) -> Tuple[int, Optional[str]]:
        if not recs:
            return (0, None)
        return (len(recs), recs[-1].get("schema_id"))

    def _persist_review_state(self) -> None:
        if not self.jsonl_path:
            return
        st_path = self.jsonl_path.with_name(self.jsonl_path.stem + "_review_state.json")
        ap, rj, pe = count_reviewed(self.decisions)
        payload = {
            "decisions": self.decisions,
            "approved_blocks": self.approved_blocks,
            "review_counts": {"approved": ap, "rejected": rj, "pending": pe},
        }
        try:
            st_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        except OSError:
            pass

    def _update_progress_labels(self) -> None:
        if not self.jsonl_path:
            return
        ok_n, total, ended = scan_classifier_progress(self.jsonl_path)
        ap, rj, pe = count_reviewed(self.decisions)
        if total > 0:
            cls = f"Classifier: {ok_n}/{total}"
            if not ended:
                cls += " (running…)"
            else:
                cls += " (done)"
        else:
            cls = "Classifier: waiting for JSONL…" if self.live_mode else f"Rows loaded: {len(self.records)}"
        rev = f"Reviewed: approved {ap} · rejected {rj} · pending {pe}"
        self.progress_var.set(f"{cls}   ·   {rev}")

    def _merge_records_from_disk(self) -> bool:
        """Reload rows from JSONL without clearing decisions. Returns True if data changed."""
        if not self.jsonl_path or not self.jsonl_path.is_file():
            return False
        new_recs = load_records(self.jsonl_path)
        sig = self._record_sig(new_recs)
        if sig == self._last_record_sig:
            return False
        self._last_record_sig = sig
        cur_sid: Optional[str] = None
        if self.records and 0 <= self.index < len(self.records):
            cur_sid = self.records[self.index].get("schema_id")
        self.records = new_recs
        for r in self.records:
            sid = r["schema_id"]
            if sid not in self.decisions:
                self.decisions[sid] = "pending"
        self._clamp_batch_index()
        self._rebuild_list()
        self._update_batch_label()
        self._update_progress_labels()
        if self.records:
            idx = 0
            if cur_sid:
                for i, r in enumerate(self.records):
                    if r.get("schema_id") == cur_sid:
                        idx = i
                        break
            self.index = min(idx, len(self.records) - 1)
            self._show_record(self.index)
        else:
            self._clear_panes()
        self._schedule_prefetch()
        return True

    def _tick_live(self) -> None:
        if not self.live_mode or not self.jsonl_path:
            return
        self._merge_records_from_disk()
        self._update_progress_labels()
        self.root.after(1200, self._tick_live)

    def _on_batch_size_changed(self) -> None:
        if not self.records:
            return
        self._clamp_batch_index()
        self._rebuild_list()
        vis = self._current_batch_global_indices()
        if vis:
            if self.index not in vis:
                self._show_record(vis[0])
            else:
                self._show_record(self.index)
        else:
            self._clear_panes()
        self._update_batch_label()
        self._schedule_prefetch()

    def _apply_mono_font(self) -> None:
        sz = max(8, min(18, int(self._mono_size.get())))
        self._mono_size.set(sz)
        f = ("Consolas", sz)
        self.orig_text.configure(font=f)
        self.new_text.configure(font=f)

    def _bump_mono(self, delta: int) -> None:
        self._mono_size.set(int(self._mono_size.get()) + delta)
        self._apply_mono_font()

    def _parsed_schemas(self) -> Dict[str, Any]:
        if self._schemas_by_id is None:
            from project import load_schemas_esat_markdown, parse_schemas_from_markdown

            _, md = load_schemas_esat_markdown(str(_BASE))
            self._schemas_by_id = parse_schemas_from_markdown(md, allow_prefixes=("M", "P", "B", "C"))
        return self._schemas_by_id

    def _block_for_record(self, r: Dict[str, Any]) -> str:
        b = (r.get("block") or "").strip()
        if b:
            return r.get("block") or ""
        sid = (r.get("schema_id") or "").strip()
        if not sid:
            return ""
        ent = self._parsed_schemas().get(sid)
        return (ent or {}).get("block") or ""

    def _set_quick_read(self, block: str) -> None:
        self.quick_text.config(state=tk.NORMAL)
        self.quick_text.delete("1.0", tk.END)
        self.quick_text.insert(tk.END, quick_read_schema_block(block))
        self.quick_text.config(state=tk.DISABLED)

    def _selected_subjects(self) -> set[str]:
        s = {k for k, v in self.subject_vars.items() if v.get()}
        return s if s else {"M", "P", "B", "C"}

    def _filtered_indices(self) -> List[int]:
        only_ch = self.only_changed_var.get()
        subjects = self._selected_subjects()
        out: List[int] = []
        for i, r in enumerate(self.records):
            sid = r.get("schema_id") or ""
            if len(sid) < 1 or sid[0] not in subjects:
                continue
            res = r.get("result") or {}
            ch = res.get("prefix_change_needed") or res.get("misnamed")
            if only_ch and not ch:
                continue
            out.append(i)
        return out

    def _batch_size(self) -> int:
        try:
            return max(1, int(self.batch_size_var.get()))
        except (tk.TclError, ValueError):
            return 15

    def _batch_count(self) -> int:
        f = self._filtered_indices()
        bs = self._batch_size()
        if not f:
            return 1
        return max(1, (len(f) + bs - 1) // bs)

    def _current_batch_global_indices(self) -> List[int]:
        f = self._filtered_indices()
        bs = self._batch_size()
        if not f:
            return []
        start = self.batch_index * bs
        return f[start : start + bs]

    def _clamp_batch_index(self) -> None:
        bc = self._batch_count()
        if self.batch_index >= bc:
            self.batch_index = max(0, bc - 1)
        if self.batch_index < 0:
            self.batch_index = 0

    def _update_batch_label(self) -> None:
        f = self._filtered_indices()
        bs = self._batch_size()
        bc = self._batch_count()
        n = len(f)
        self.batch_label_var.set(
            f"Batch {self.batch_index + 1}/{bc}  ·  {n} item(s) in filter  ·  ~{bs} per batch"
        )

    def _on_filter_changed(self) -> None:
        self.batch_index = 0
        self._clamp_batch_index()
        self._rebuild_list()
        vis = self._current_batch_global_indices()
        if vis:
            self._show_record(vis[0])
        else:
            self._clear_panes()
        self._update_batch_label()
        self._schedule_prefetch()

    def _clear_panes(self) -> None:
        self.orig_text.delete("1.0", tk.END)
        self.new_text.delete("1.0", tk.END)
        self.quick_text.config(state=tk.NORMAL)
        self.quick_text.delete("1.0", tk.END)
        self.quick_text.config(state=tk.DISABLED)
        self.meta_var.set("No rows match filters.")

    def _shift_batch(self, delta: int) -> None:
        self._clamp_batch_index()
        bc = self._batch_count()
        self.batch_index = max(0, min(bc - 1, self.batch_index + delta))
        self._rebuild_list()
        vis = self._current_batch_global_indices()
        if vis:
            self._show_record(vis[0])
        else:
            self._clear_panes()
        self._update_batch_label()
        self._schedule_prefetch()

    def _schedule_prefetch(self) -> None:
        """Precompute block + preview for the *next* batch in a daemon thread (warm cache for JSONL rows with `block`)."""
        self._prefetch_generation += 1
        gen = self._prefetch_generation
        records = self.records
        bs = self._batch_size()
        f = self._filtered_indices()
        start = (self.batch_index + 1) * bs
        chunk = list(f[start : start + bs])

        def work() -> None:
            cache: Dict[str, Tuple[str, str]] = {}
            for gi in chunk:
                if gen != self._prefetch_generation:
                    return
                r = records[gi]
                sid = r.get("schema_id") or ""
                block = (r.get("block") or "").strip()
                if not block:
                    continue
                res = r.get("result") or {}
                try:
                    preview = build_final_block(block, sid, res)
                except Exception:
                    continue
                cache[sid] = (block, preview)
            with self._prefetch_lock:
                if gen == self._prefetch_generation:
                    self._prefetch_cache = cache

        if chunk:
            threading.Thread(target=work, daemon=True).start()

    def _apply_diff_highlights(self, orig_s: str, new_s: str) -> None:
        self.orig_text.tag_remove("diff_orig", "1.0", tk.END)
        self.new_text.tag_remove("diff_new", "1.0", tk.END)
        if orig_s == new_s:
            return
        o_ranges, n_ranges = _diff_ranges(orig_s, new_s)
        for i1, i2 in o_ranges:
            if i1 < i2:
                self.orig_text.tag_add("diff_orig", f"1.0 + {i1} chars", f"1.0 + {i2} chars")
        for j1, j2 in n_ranges:
            if j1 < j2:
                self.new_text.tag_add("diff_new", f"1.0 + {j1} chars", f"1.0 + {j2} chars")

    def _rebuild_list(self) -> None:
        self.listbox.delete(0, tk.END)
        vis = self._current_batch_global_indices()
        for gi in vis:
            r = self.records[gi]
            sid = r.get("schema_id", "")
            res = r.get("result") or {}
            rec = res.get("recommended_prefix", "?")
            d = self.decisions.get(sid, "pending")
            flag = " *" if (res.get("prefix_change_needed") or res.get("misnamed")) else ""
            self.listbox.insert(tk.END, f"[{d[:1]}] {sid} → {rec}{flag}")

    def _load_file(self, path: Path) -> None:
        self.jsonl_path = path
        if not path.is_file():
            self.records = []
            self._last_record_sig = (0, None)
            self.path_label.config(text=f"{path} (not found yet)")
            self._clear_panes()
            self._update_progress_labels()
            self.status.set("Waiting for JSONL file…")
            return
        self.records = load_records(path)
        self._last_record_sig = self._record_sig(self.records)
        self.decisions = {r["schema_id"]: "pending" for r in self.records}
        self.approved_blocks = {}
        self.batch_index = 0
        state_path = path.with_name(path.stem + "_review_state.json")
        if state_path.is_file():
            try:
                st = json.loads(state_path.read_text(encoding="utf-8"))
                self.decisions.update(st.get("decisions", {}))
                self.approved_blocks.update(st.get("approved_blocks", {}))
            except Exception:
                pass
        self.path_label.config(text=str(path))
        self._clamp_batch_index()
        self._rebuild_list()
        vis = self._current_batch_global_indices()
        if vis:
            self._show_record(vis[0])
        else:
            self._clear_panes()
        self._update_batch_label()
        self._update_progress_labels()
        self.status.set(f"Loaded {len(self.records)} rows from {path.name}")
        self._schedule_prefetch()

    def _open(self) -> None:
        p = filedialog.askopenfilename(
            title="Schema prefix JSONL",
            filetypes=[("JSONL", "*.jsonl"), ("All", "*.*")],
            initialdir=str(_BASE),
        )
        if p:
            self._load_file(Path(p))

    def _on_select(self, _evt=None) -> None:
        sel = self.listbox.curselection()
        if not sel:
            return
        vis = self._current_batch_global_indices()
        if sel[0] < len(vis):
            self._show_record(vis[sel[0]])

    def _show_record(self, global_idx: int) -> None:
        if global_idx < 0 or global_idx >= len(self.records):
            return
        batch_set = set(self._current_batch_global_indices())
        if batch_set and global_idx not in batch_set:
            return
        self.index = global_idx
        r = self.records[global_idx]
        sid = r.get("schema_id", "")
        res = r.get("result") or {}
        block = self._block_for_record(r)
        self.orig_text.delete("1.0", tk.END)
        self.orig_text.insert(tk.END, block)
        self._set_quick_read(block)
        if sid in self.approved_blocks:
            new_content = self.approved_blocks[sid]
        else:
            with self._prefetch_lock:
                hit = self._prefetch_cache.get(sid)
            if hit and hit[0] == block:
                new_content = hit[1]
            else:
                new_content = build_final_block(block, sid, res)
        self.new_text.delete("1.0", tk.END)
        self.new_text.insert(tk.END, new_content)
        self._apply_diff_highlights(block, new_content)
        conf = res.get("confidence", "")
        rs = res.get("reason_short", "")
        self.meta_var.set(
            f"{sid}  |  recommended: {res.get('recommended_prefix')}  "
            f"confidence={conf}  |  {rs}"
        )
        vis = self._current_batch_global_indices()
        try:
            li = vis.index(global_idx)
        except ValueError:
            li = 0
        self.listbox.selection_clear(0, tk.END)
        self.listbox.selection_set(li)
        self.listbox.see(li)
        d = self.decisions.get(sid, "pending")
        self.status.set(
            f"Row in batch {self.batch_index + 1} — global {global_idx + 1}/{len(self.records)} — {sid} — {d}"
        )
        self._update_progress_labels()

    def _reset_preview(self) -> None:
        if not self.records:
            return
        r = self.records[self.index]
        sid = r.get("schema_id", "")
        block = self._block_for_record(r)
        res = r.get("result") or {}
        preview = build_final_block(block, sid, res)
        self.new_text.delete("1.0", tk.END)
        self.new_text.insert(tk.END, preview)
        self._apply_diff_highlights(block, preview)

    def _approve(self) -> None:
        if not self.records:
            return
        r = self.records[self.index]
        sid = r.get("schema_id", "")
        block = self._block_for_record(r)
        self.decisions[sid] = "approved"
        self.approved_blocks[sid] = self.new_text.get("1.0", tk.END).rstrip("\n")
        self._rebuild_list()
        self._persist_review_state()
        self._nav(1)

    def _approve_batch(self) -> None:
        vis = self._current_batch_global_indices()
        if not vis:
            messagebox.showinfo("Batch approve", "No rows in this batch.")
            return
        n = 0
        for gi in vis:
            r = self.records[gi]
            sid = r.get("schema_id", "")
            if self.decisions.get(sid) != "pending":
                continue
            block = self._block_for_record(r)
            res = r.get("result") or {}
            preview = build_final_block(block, sid, res)
            self.decisions[sid] = "approved"
            self.approved_blocks[sid] = preview
            n += 1
        self._rebuild_list()
        self._update_batch_label()
        vis2 = self._current_batch_global_indices()
        if vis2:
            if self.index in vis2:
                self._show_record(self.index)
            else:
                self._show_record(vis2[0])
        else:
            self._clear_panes()
        self.status.set(f"Batch-approved {n} pending row(s). Use “Next batch →” when ready.")
        self._persist_review_state()
        self._schedule_prefetch()

    def _reject(self) -> None:
        if not self.records:
            return
        sid = self.records[self.index].get("schema_id", "")
        self.decisions[sid] = "rejected"
        self.approved_blocks.pop(sid, None)
        self._rebuild_list()
        self._persist_review_state()
        self._nav(1)

    def _nav(self, delta: int) -> None:
        vis = self._current_batch_global_indices()
        if not vis:
            return
        try:
            cur = vis.index(self.index)
        except ValueError:
            cur = 0
        nxt = max(0, min(len(vis) - 1, cur + delta))
        self._show_record(vis[nxt])

    def _export(self) -> None:
        if not self.jsonl_path or not self.records:
            messagebox.showwarning("Export", "Load a JSONL first.")
            return
        base = self.jsonl_path.parent
        stem = self.jsonl_path.stem

        from schema_prefix_common import new_schema_id_from_prefix

        approvals: List[Dict[str, Any]] = []
        for r in self.records:
            sid = r.get("schema_id", "")
            if self.decisions.get(sid) != "approved":
                continue
            res = r.get("result") or {}
            rec = res.get("recommended_prefix", "M").strip().upper()[:1]
            new_id = new_schema_id_from_prefix(sid, rec)
            blk = self._block_for_record(r)
            final_text = self.approved_blocks.get(sid) or build_final_block(blk, sid, res)
            approvals.append(
                {
                    "schema_id": sid,
                    "new_schema_id": new_id,
                    "recommended_prefix": rec,
                    "original_block_markdown": blk,
                    "final_block_markdown": final_text,
                }
            )

        out_path = base / f"{stem}_approved.json"
        payload = {
            "source_jsonl": str(self.jsonl_path),
            "approvals": approvals,
        }
        out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

        self._persist_review_state()
        self.status.set(f"Wrote {out_path.name} ({len(approvals)} approvals) and {stem}_review_state.json")


def main() -> None:
    p = argparse.ArgumentParser(description="Schema prefix review UI")
    p.add_argument("jsonl", nargs="?", type=Path, default=None, help="JSONL from schema_prefix_batch.py")
    p.add_argument(
        "--live",
        action="store_true",
        help="Poll JSONL for new classifier rows (use with schema_prefix_batch.py)",
    )
    args = p.parse_args()
    root = tk.Tk()
    ReviewApp(root, args.jsonl, live_mode=args.live)
    root.mainloop()


if __name__ == "__main__":
    main()
