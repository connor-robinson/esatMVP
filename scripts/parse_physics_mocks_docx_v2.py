# -*- coding: utf-8 -*-
"""Parse ESAT Physics Mock Modules DOCX into structured JSON (v2)."""
from __future__ import annotations

import json
import re
from pathlib import Path

from docx import Document
from docx.oxml.ns import qn
from docx.table import Table

DOCX = Path(r"c:\Users\anson\Downloads\ESAT_Physics_Mock_Modules_A_B.docx")
OUT_DIR = Path(r"c:\Users\anson\Desktop\nocalcMVP2_real\tmp_physics_mocks")
OUT_DIR.mkdir(parents=True, exist_ok=True)

OPTION_RE = re.compile(r"^([A-H])\.\s*(.*)$", re.S)
Q_START_RE = re.compile(r"^(\d+)\.\s*(.*)$", re.S)


def cell_text(cell) -> str:
    return cell.text.replace("\r\n", "\n").replace("\r", "\n").strip()


def unique_cell_texts(table: Table) -> list[str]:
    texts: list[str] = []
    seen: set[str] = set()
    for row in table.rows:
        for cell in row.cells:
            t = cell_text(cell)
            if t and t not in seen:
                seen.add(t)
                texts.append(t)
    return texts


def nested_tables(table: Table) -> list[Table]:
    """Direct nested tables inside this table (not self)."""
    el = table._element
    # Find all descendant tbl elements that are not the root
    found = []
    for child_tbl in el.findall(".//" + qn("w:tbl")):
        if child_tbl is el:
            continue
        found.append(Table(child_tbl, table._parent))
    return found


def parse_options_from_nested(table: Table) -> dict[str, str]:
    options: dict[str, str] = {}
    for nt in nested_tables(table):
        for row in nt.rows:
            for cell in row.cells:
                t = cell_text(cell)
                if not t:
                    continue
                # Options may be one per cell "A. text" or multi-line
                for line in t.split("\n"):
                    om = OPTION_RE.match(line.strip())
                    if om:
                        options[om.group(1)] = om.group(2).strip()
                    elif options and line.strip() and not OPTION_RE.match(line.strip()):
                        # continuation - only if looks like same cell multi-line already handled
                        pass
                # Also handle whole-cell as single option
                om = OPTION_RE.match(t)
                if om and om.group(1) not in options:
                    options[om.group(1)] = om.group(2).strip()
                elif "\n" in t:
                    for line in t.split("\n"):
                        om = OPTION_RE.match(line.strip())
                        if om:
                            options[om.group(1)] = om.group(2).strip()
    return options


def parse_candidate_question(table: Table) -> dict | None:
    texts = unique_cell_texts(table)
    if not texts:
        return None
    first = texts[0]
    m = Q_START_RE.match(first)
    if not m:
        return None
    qnum = int(m.group(1))
    # Stem is everything in first cell before options; options live in nested table
    lines = first.split("\n")
    stem_parts: list[str] = []
    for i, line in enumerate(lines):
        if i == 0:
            rem = Q_START_RE.match(line.strip())
            if rem and rem.group(2).strip():
                stem_parts.append(rem.group(2).strip())
            continue
        if OPTION_RE.match(line.strip()):
            break
        if line.strip():
            stem_parts.append(line.strip())

    options = parse_options_from_nested(table)
    # Fallback: options in same cell
    if not options:
        for line in lines:
            om = OPTION_RE.match(line.strip())
            if om:
                options[om.group(1)] = om.group(2).strip()

    # Detect if table has diagram (drawing)
    has_diagram = "drawing" in table._element.xml or "blip" in table._element.xml

    return {
        "number": qnum,
        "stem": "\n".join(stem_parts).strip(),
        "options": options,
        "hasDiagram": has_diagram,
        "rawFirstCell": first,
    }


def parse_editor_key_table(table: Table) -> dict | None:
    texts = unique_cell_texts(table)
    if not texts:
        return None
    blob = "\n".join(texts)
    # Skip overview / legend tables
    if blob.startswith("Question") and "Answer" in blob and len(texts) < 5 and "Distractor" not in blob:
        # might be overview header
        pass
    if not re.search(r"\bAnswer\b", blob):
        return None
    if "Distractor map" not in blob and "Distractor" not in blob:
        # overview mini rows sometimes have Answer without full key
        if "Solution" not in blob:
            return None

    # Module letter/number may be in a nearby context - try from answer overview separately
    # Worked solution tables often don't include A1 in the same table - check
    header_match = re.match(r"^([AB])(\d+)\b", texts[0].strip())
    editor_pick = "EDITOR PICK" in blob[:200].upper() or "★" in texts[0]

    def extract_between(start_label: str, end_labels: list[str]) -> str | None:
        pat = rf"(?:^|\n)\s*{start_label}\s+"
        m = re.search(pat, blob)
        if not m:
            # try with colon
            m = re.search(rf"(?:^|\n)\s*{start_label}\s*[:：]\s*", blob)
            if not m:
                return None
        start = m.end()
        ends = []
        for lab in end_labels:
            nm = re.search(rf"(?:^|\n)\s*{lab}\b", blob[start:])
            if nm:
                ends.append(start + nm.start())
        end = min(ends) if ends else len(blob)
        return blob[start:end].strip()

    labels_after = {
        "Answer": ["Tip", "Solution", "Distractor map", "Distractor", "Benchmark", "Topic", "Difficulty", "Target"],
        "Tip": ["Solution", "Distractor map", "Distractor", "Benchmark", "Answer", "Topic"],
        "Solution": ["Distractor map", "Distractor", "Benchmark", "Tip"],
        "Distractor map": ["Benchmark", "Solution", "Tip"],
        "Benchmark": ["Distractor map", "Solution", "Tip", "Answer"],
        "Topic": ["Difficulty", "Target", "Answer", "Tip"],
        "Difficulty": ["Target", "Topic", "Answer", "Tip"],
        "Target": ["Tip", "Difficulty", "Topic", "Answer"],
    }

    answer = extract_between("Answer", labels_after["Answer"])
    tip = extract_between("Tip", labels_after["Tip"])
    solution = extract_between("Solution", labels_after["Solution"])
    distractor_raw = extract_between("Distractor map", labels_after["Distractor map"])
    if distractor_raw is None:
        distractor_raw = extract_between("Distractor", labels_after["Distractor map"])
    benchmark = extract_between("Benchmark", labels_after["Benchmark"])
    topic = extract_between("Topic", labels_after["Topic"])
    difficulty = extract_between("Difficulty", labels_after["Difficulty"])
    target = extract_between("Target", labels_after["Target"])

    distractors: dict[str, str] = {}
    if distractor_raw:
        for line in distractor_raw.split("\n"):
            line = line.strip()
            if not line:
                continue
            dm = re.match(r"^([A-H])\s*[—–\-:\.]\s*(.*)$", line)
            if dm:
                distractors[dm.group(1)] = dm.group(2).strip()
            elif distractors:
                last = list(distractors.keys())[-1]
                distractors[last] = (distractors[last] + " " + line).strip()

    answer_letter = None
    answer_text = answer
    if answer:
        am = re.match(r"^([A-H])\b\s*(.*)$", answer.strip(), re.S)
        if am:
            answer_letter = am.group(1)
            answer_text = am.group(2).strip()

    result = {
        "editorPick": editor_pick,
        "answerLetter": answer_letter,
        "answerText": answer_text,
        "answerRaw": answer,
        "topic": topic,
        "difficulty": difficulty,
        "target": target,
        "tip": tip,
        "solution": solution,
        "distractors": distractors,
        "distractorRaw": distractor_raw,
        "benchmarkNote": benchmark,
        "raw": texts,
    }
    if header_match:
        result["module"] = header_match.group(1)
        result["number"] = int(header_match.group(2))
    return result


def parse_overview_answers(table: Table) -> list[dict]:
    """Parse answer overview grid: Question | Answer | Topic | Difficulty | Target"""
    rows_out = []
    for ri, row in enumerate(table.rows):
        cells = [cell_text(c) for c in row.cells]
        if not cells or cells[0] in ("Question", "Q", ""):
            continue
        # Deduplicate merged cells
        uniq = []
        for c in cells:
            if not uniq or uniq[-1] != c:
                uniq.append(c)
        if len(uniq) < 2:
            continue
        qlabel = uniq[0].strip()
        qm = re.match(r"^([AB])?(\d+)$", qlabel)
        if not qm:
            continue
        rows_out.append(
            {
                "label": qlabel,
                "module": qm.group(1),
                "number": int(qm.group(2)),
                "cells": uniq,
            }
        )
    return rows_out


def main() -> None:
    doc = Document(str(DOCX))

    # Module A candidate: tables 8-34, Module B: 38-64
    # Editor A worked: 68-94, Editor B: 96-122
    # Overview A: around 67, Overview B: 95

    candidate_a = [parse_candidate_question(doc.tables[i]) for i in range(8, 35)]
    candidate_b = [parse_candidate_question(doc.tables[i]) for i in range(38, 65)]

    editor_a = [parse_editor_key_table(doc.tables[i]) for i in range(68, 95)]
    editor_b = [parse_editor_key_table(doc.tables[i]) for i in range(96, 123)]

    overview_a = parse_overview_answers(doc.tables[67])
    overview_b = parse_overview_answers(doc.tables[95])

    # Also dump overview table raw
    ov_a_raw = unique_cell_texts(doc.tables[67])
    ov_b_raw = unique_cell_texts(doc.tables[95])

    # Merge overview metadata into editor keys by index
    def enrich(editor_list, overview_list, module: str):
        out = []
        for i, ek in enumerate(editor_list):
            if ek is None:
                continue
            ek = dict(ek)
            ek["module"] = module
            ek["number"] = i + 1
            if i < len(overview_list):
                ov = overview_list[i]
                cells = ov["cells"]
                # Expect: Question, Answer letter+text?, Topic, Difficulty, Target...
                # Inspect
                ek["overviewCells"] = cells
            out.append(ek)
        return out

    editor_a = enrich(editor_a, overview_a, "A")
    editor_b = enrich(editor_b, overview_b, "B")

    result = {
        "candidateA": candidate_a,
        "candidateB": candidate_b,
        "editorA": editor_a,
        "editorB": editor_b,
        "overviewA": overview_a,
        "overviewB": overview_b,
        "overviewARaw": ov_a_raw,
        "overviewBRaw": ov_b_raw,
        "counts": {
            "candA": len([q for q in candidate_a if q]),
            "candB": len([q for q in candidate_b if q]),
            "optsA": sum(1 for q in candidate_a if q and len(q.get("options", {})) >= 4),
            "optsB": sum(1 for q in candidate_b if q and len(q.get("options", {})) >= 4),
            "edA": len(editor_a),
            "edB": len(editor_b),
            "ovA": len(overview_a),
            "ovB": len(overview_b),
        },
    }
    (OUT_DIR / "parsed_v2.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print("counts", result["counts"])
    print("A1 options", candidate_a[0]["options"] if candidate_a[0] else None)
    print("A7 hasDiagram", candidate_a[6]["hasDiagram"] if candidate_a[6] else None)
    print("EK A1 answer", editor_a[0].get("answerLetter"), editor_a[0].get("answerText"))
    print("EK A1 tip", editor_a[0].get("tip"))
    print("EK A1 distractors", editor_a[0].get("distractors"))
    print("overview A1", overview_a[0] if overview_a else None)
    # Print first overview row cells more carefully
    t = doc.tables[67]
    print("overview table shape", len(t.rows), len(t.columns))
    for ri in range(min(3, len(t.rows))):
        print("ov row", ri, [cell_text(c)[:40] for c in t.rows[ri].cells])


if __name__ == "__main__":
    main()
