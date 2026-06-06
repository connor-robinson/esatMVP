#!/usr/bin/env python3
"""
Classify question-bank rows as ESAT vs TMUA using schema corpus + metadata + Gemini.

The M_<hex> schema format is shared by ESAT (Schemas_ESAT*.md) and TMUA
(Schemas_TMUA_*.md) — schema shape alone is not enough.

  python detect_exam_type.py --source paper1 --sample 20
  python detect_exam_type.py --id <uuid> --id <uuid>
  python detect_exam_type.py --source paper1 --sample 50 --output report.json
"""

from __future__ import annotations

import argparse
import json
import os
import random
import re
import sys
import textwrap
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

_BASE = Path(__file__).resolve().parent.parent
_SCHEMA_DIR = _BASE / "esat_question_generator" / "schemas"

if str(_BASE / "esat_question_generator") not in sys.path:
    sys.path.insert(0, str(_BASE / "esat_question_generator"))

for env_path in (_BASE.parent / ".env.local", _BASE / "esat_question_generator" / ".env.local"):
    if env_path.is_file():
        try:
            from dotenv import load_dotenv

            load_dotenv(env_path)
        except ImportError:
            pass
        break

HEX_SCHEMA = re.compile(r"^(M|R)_[0-9a-f]{6,}$", re.I)
SCHEMA_HEADING = re.compile(r"^## \*\*([MR]_[0-9a-f]{6,})\.", re.I | re.M)

SYSTEM_PROMPT = """You classify UK admissions multiple-choice maths questions as ESAT or TMUA.

Exams:
- ESAT (Math 1 / Math 2): Engineering & Science admissions. Applied setups (kinematics, rates, geometry in context), ESAT-style difficulty spread. Math 1 = earlier A-level / no calculus emphasis; Math 2 = calculus, sequences, harder pure/applied mix.
- TMUA Paper 1 (Mathematical Knowledge): Standalone pure maths MCQs in TMUA tone — often cleaner algebraic/calculus/probability tasks without engineering narrative.
- TMUA Paper 2 (Mathematical Reasoning): Logic, proof, deduction, "which statement is true/false", minimal computation.

Use question STEM and OPTIONS content as primary evidence. Metadata (schema corpus, date, difficulty) is supporting only.

Return JSON only:
{
  "exam": "ESAT" | "TMUA",
  "confidence": "high" | "medium" | "low",
  "esat_paper": "Math 1" | "Math 2" | null,
  "tmua_paper": "Paper 1" | "Paper 2" | null,
  "reasoning": "2-4 sentences"
}
"""


@dataclass
class SchemaCorpora:
    esat: Set[str]
    tmua_p1: Set[str]
    tmua_p2: Set[str]

    def lookup(self, schema_id: str) -> str:
        sid = (schema_id or "").strip()
        if sid in self.tmua_p2:
            return "tmua_paper2_file"
        if sid in self.tmua_p1:
            return "tmua_paper1_file"
        if sid in self.esat:
            return "esat_file"
        if HEX_SCHEMA.match(sid):
            return "hex_unknown_file"
        if sid.upper().startswith("M") or sid.upper().startswith("R"):
            return "legacy_numbered"
        return "unknown"


def load_schema_corpora() -> SchemaCorpora:
    def ids_from(*names: str) -> Set[str]:
        found: Set[str] = set()
        for name in names:
            path = _SCHEMA_DIR / name
            if not path.is_file():
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
            found |= set(SCHEMA_HEADING.findall(text))
        return found

    return SchemaCorpora(
        esat=ids_from("Schemas_ESAT.md", "Schemas_ESAT_Top.md", "Schemas_NSAA.md"),
        tmua_p1=ids_from("Schemas_TMUA_Paper1.md"),
        tmua_p2=ids_from("Schemas_TMUA_Paper2.md"),
    )


def _parse_idea_plan(raw: Any) -> Dict[str, Any]:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str) and raw.strip():
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


def _options_preview(raw: Any, limit: int = 4) -> List[str]:
    if isinstance(raw, list):
        opts = [str(x).strip() for x in raw if str(x).strip()]
    elif isinstance(raw, dict):
        opts = [str(v).strip() for k, v in sorted(raw.items()) if str(v).strip()]
    else:
        return []
    return opts[:limit]


def build_user_prompt(row: Dict[str, Any], corpus_hint: str) -> str:
    idea = _parse_idea_plan(row.get("idea_plan"))
    opts = _options_preview(row.get("options"))
    stem = (row.get("question_stem") or "").strip()
    if len(stem) > 1800:
        stem = stem[:1800] + "\n… (truncated)"

    lines = [
        "Classify this question.",
        "",
        f"DB labels: subjects={row.get('subjects')!r}, test_type={row.get('test_type')!r}",
        f"schema_id: {row.get('schema_id')!r}",
        f"schema_corpus: {corpus_hint}",
        f"created_at: {row.get('created_at')}",
        f"difficulty: {row.get('difficulty')!r}",
        f"primary_tag: {row.get('primary_tag')!r}",
    ]
    if idea.get("paper"):
        lines.append(f"idea_plan.paper: {idea.get('paper')!r}")
    if idea.get("idea_summary"):
        summary = str(idea["idea_summary"]).strip()
        if len(summary) > 400:
            summary = summary[:400] + "…"
        lines.append(f"idea_summary: {summary}")

    lines.extend(["", "STEM:", stem])
    if opts:
        lines.append("")
        lines.append("OPTIONS (sample):")
        for i, o in enumerate(opts, 1):
            lines.append(f"  {i}. {o[:300]}")

    return "\n".join(lines)


def call_gemini(user_prompt: str, model: str) -> Dict[str, Any]:
    """Prefer pipeline Vertex ADC; fall back to Developer API key."""
    last_err: Optional[Exception] = None

    try:
        from project import LLMClient, safe_json_load

        llm = LLMClient()
        text = llm.generate(
            model=model,
            system_prompt=SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.2,
            trace_label="ExamDetect",
        )
        parsed = safe_json_load(text)
        if isinstance(parsed, dict):
            return parsed
        raise ValueError(f"Expected JSON object, got {type(parsed)}")
    except Exception as exc:
        last_err = exc

    api_key = (os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or "").strip()
    if api_key:
        try:
            from google import genai

            client = genai.Client(api_key=api_key)
            resp = client.models.generate_content(
                model=model,
                contents=user_prompt,
                config={
                    "system_instruction": SYSTEM_PROMPT,
                    "temperature": 0.2,
                },
            )
            text = (resp.text or "").strip()
            start, end = text.find("{"), text.rfind("}")
            if start >= 0 and end > start:
                parsed = json.loads(text[start : end + 1])
            else:
                parsed = json.loads(text)
            if isinstance(parsed, dict):
                return parsed
        except Exception as exc2:
            last_err = exc2

    raise RuntimeError(f"LLM call failed: {last_err}")


def heuristic_verdict(row: Dict[str, Any], corpus_hint: str) -> Dict[str, Any]:
    """Deterministic pre-classifier from schema corpus + idea_plan (no LLM)."""
    idea_paper = _parse_idea_plan(row.get("idea_plan")).get("paper")

    if corpus_hint == "tmua_paper2_file":
        return {
            "exam": "TMUA",
            "confidence": "high",
            "esat_paper": None,
            "tmua_paper": "Paper 2",
            "reasoning": "schema_id is defined in Schemas_TMUA_Paper2.md",
        }
    if corpus_hint == "tmua_paper1_file" or idea_paper in ("Paper1", "Paper 1"):
        return {
            "exam": "TMUA",
            "confidence": "high" if idea_paper else "medium",
            "esat_paper": None,
            "tmua_paper": "Paper 1",
            "reasoning": "schema_id in Schemas_TMUA_Paper1.md"
            + (f" and idea_plan.paper={idea_paper!r}" if idea_paper else ""),
        }
    if corpus_hint == "esat_file":
        tag = (row.get("primary_tag") or "").upper()
        math2_hint = tag.startswith("M2-") or "MM" in tag
        return {
            "exam": "ESAT",
            "confidence": "medium",
            "esat_paper": "Math 2" if math2_hint else "Math 1",
            "tmua_paper": None,
            "reasoning": "schema_id is defined in Schemas_ESAT*.md (hex format shared with TMUA)",
        }
    if corpus_hint == "legacy_numbered":
        return {
            "exam": "ESAT",
            "confidence": "high",
            "esat_paper": row.get("subjects") if row.get("subjects") in ("Math 1", "Math 2") else "Math 1",
            "tmua_paper": None,
            "reasoning": "legacy numbered M/R schema id (ESAT-era format)",
        }
    return {
        "exam": "unknown",
        "confidence": "low",
        "esat_paper": None,
        "tmua_paper": None,
        "reasoning": f"schema corpus unresolved ({corpus_hint})",
    }


def fetch_rows(
    client: Any,
    *,
    source: str,
    ids: Optional[List[str]],
    sample: int,
    seed: int,
) -> List[Dict[str, Any]]:
    cols = (
        "id, schema_id, subjects, test_type, difficulty, primary_tag, "
        "question_stem, options, idea_plan, created_at, generation_id"
    )

    if ids:
        rows: List[Dict[str, Any]] = []
        for qid in ids:
            resp = (
                client.table("ai_generated_questions")
                .select(cols)
                .eq("id", qid)
                .limit(1)
                .execute()
            )
            if resp.data:
                rows.append(resp.data[0])
        return rows

    query = (
        client.table("ai_generated_questions")
        .select(cols)
        .neq("status", "deleted")
    )

    if source == "paper1":
        query = query.eq("subjects", "Paper 1").eq("test_type", "TMUA")
    elif source == "math1":
        query = query.eq("subjects", "Math 1").eq("test_type", "ESAT")
    elif source == "math2":
        query = query.eq("subjects", "Math 2").eq("test_type", "ESAT")
    elif source == "m_hex_all":
        pass  # filter client-side
    else:
        raise ValueError(f"Unknown source: {source}")

    rows = []
    offset = 0
    page = 500
    while True:
        batch = query.order("id").range(offset, offset + page - 1).execute().data or []
        if not batch:
            break
        if source == "m_hex_all":
            batch = [r for r in batch if HEX_SCHEMA.match((r.get("schema_id") or "").strip())]
        rows.extend(batch)
        if len(batch) < page:
            break
        offset += page

    if sample and len(rows) > sample:
        rng = random.Random(seed)
        rows = rng.sample(rows, sample)
    return rows


def classify_row(
    row: Dict[str, Any],
    corpora: SchemaCorpora,
    model: str,
    *,
    heuristic_only: bool,
) -> Dict[str, Any]:
    schema_id = (row.get("schema_id") or "").strip()
    corpus_hint = corpora.lookup(schema_id)

    if heuristic_only:
        verdict = heuristic_verdict(row, corpus_hint)
    else:
        user_prompt = build_user_prompt(row, corpus_hint)
        try:
            verdict = call_gemini(user_prompt, model)
        except Exception as exc:
            verdict = heuristic_verdict(row, corpus_hint)
            verdict["reasoning"] = (
                f"LLM failed ({exc}); heuristic fallback: {verdict.get('reasoning', '')}"
            )
            if verdict.get("confidence") == "high":
                verdict["confidence"] = "medium"

    return {
        "id": row.get("id"),
        "generation_id": row.get("generation_id"),
        "schema_id": schema_id,
        "schema_corpus": corpus_hint,
        "db_subjects": row.get("subjects"),
        "db_test_type": row.get("test_type"),
        "created_at": row.get("created_at"),
        "difficulty": row.get("difficulty"),
        "idea_plan_paper": _parse_idea_plan(row.get("idea_plan")).get("paper"),
        "verdict": verdict,
    }


def summarize(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    exams = Counter(r["verdict"].get("exam") for r in results)
    conf = Counter(r["verdict"].get("confidence") for r in results)
    corpus_x_exam: Counter[str] = Counter()
    for r in results:
        key = f"{r['schema_corpus']} -> {r['verdict'].get('exam')}"
        corpus_x_exam[key] += 1

    esat_papers = Counter(
        r["verdict"].get("esat_paper")
        for r in results
        if r["verdict"].get("exam") == "ESAT" and r["verdict"].get("esat_paper")
    )
    tmua_papers = Counter(
        r["verdict"].get("tmua_paper")
        for r in results
        if r["verdict"].get("exam") == "TMUA" and r["verdict"].get("tmua_paper")
    )

    return {
        "count": len(results),
        "exam_counts": dict(exams),
        "confidence_counts": dict(conf),
        "corpus_vs_exam": dict(corpus_x_exam),
        "esat_paper_counts": dict(esat_papers),
        "tmua_paper_counts": dict(tmua_papers),
    }


def print_report(results: List[Dict[str, Any]], summary: Dict[str, Any]) -> None:
    print("\n=== Summary ===")
    for k, v in summary.items():
        print(f"  {k}: {v}")

    print("\n=== Samples ===")
    for r in results[:12]:
        v = r["verdict"]
        print(
            textwrap.shorten(
                f"{r['id'][:8]}… | corpus={r['schema_corpus']} | db={r['db_subjects']}/{r['db_test_type']} | "
                f"AI={v.get('exam')} ({v.get('confidence')}) esat={v.get('esat_paper')} tmua={v.get('tmua_paper')} | "
                f"{v.get('reasoning', '')}",
                width=140,
                placeholder="…",
            )
        )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source",
        choices=["paper1", "math1", "math2", "m_hex_all"],
        default="paper1",
        help="Which DB slice to sample (default: current Paper 1 / TMUA bucket)",
    )
    parser.add_argument("--sample", type=int, default=15, help="Random sample size")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--id", action="append", dest="ids", help="Specific question UUID")
    parser.add_argument("--model", default=os.environ.get("MODEL_EXAM_DETECT", "gemini-2.5-flash"))
    parser.add_argument(
        "--heuristic-only",
        action="store_true",
        help="Schema corpus + metadata only (no LLM). Fast audit mode.",
    )
    parser.add_argument("--output", help="Write full JSON report to path")
    args = parser.parse_args()

    try:
        from supabase import create_client
    except ImportError:
        print("pip install supabase google-genai python-dotenv", file=sys.stderr)
        return 1

    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        return 1

    corpora = load_schema_corpora()
    print(
        f"Schema corpora: ESAT={len(corpora.esat)} hex, "
        f"TMUA P1={len(corpora.tmua_p1)}, TMUA P2={len(corpora.tmua_p2)}"
    )

    client = create_client(url, key)
    rows = fetch_rows(
        client,
        source=args.source,
        ids=args.ids,
        sample=args.sample,
        seed=args.seed,
    )
    if not rows:
        print("No rows matched.", file=sys.stderr)
        return 1

    print(f"Classifying {len(rows)} question(s) with {args.model}…")
    results = [
        classify_row(row, corpora, args.model, heuristic_only=args.heuristic_only)
        for row in rows
    ]
    summary = summarize(results)
    print_report(results, summary)

    if args.output:
        out = Path(args.output)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(
            json.dumps({"summary": summary, "results": results}, indent=2),
            encoding="utf-8",
        )
        print(f"\nWrote {out}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
