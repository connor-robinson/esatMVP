"""Aggregate Phase 2 eval metrics into report.md / report.json."""

from __future__ import annotations

import json
from collections import Counter
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class AttemptRecord:
    question_id: int
    variation_mode: str
    exam_name: str
    attempt: int
    spec_valid: bool
    render_ok: bool
    collision_failure: bool
    verifier_verdict: str | None = None
    math_incorrect: bool = False
    too_similar_to_source: bool = False
    looks_bad: bool = False
    spec_error: str = ""
    render_error: str = ""
    verifier_issues: list[str] = field(default_factory=list)
    artifact_dir: str = ""


@dataclass
class EvalReport:
    run_id: str
    total_cases: int
    records: list[AttemptRecord] = field(default_factory=list)

    def final_records(self) -> list[AttemptRecord]:
        """Best/latest attempt per (question_id, variation_mode)."""
        best: dict[tuple[int, str], AttemptRecord] = {}
        for rec in self.records:
            key = (rec.question_id, rec.variation_mode)
            prev = best.get(key)
            if prev is None or rec.attempt >= prev.attempt:
                best[key] = rec
        return list(best.values())

    def summarize(self) -> dict[str, Any]:
        finals = self.final_records()
        n = len(finals) or 1
        spec_ok = sum(1 for r in finals if r.spec_valid)
        render_ok = sum(1 for r in finals if r.render_ok)
        collision = sum(1 for r in finals if r.collision_failure)
        pass_count = sum(1 for r in finals if r.verifier_verdict == "PASS")
        fix_count = sum(1 for r in finals if r.verifier_verdict == "FIX")
        fail_count = sum(1 for r in finals if r.verifier_verdict == "FAIL")
        math_wrong = sum(1 for r in finals if r.math_incorrect)
        too_similar = sum(1 for r in finals if r.too_similar_to_source)
        looks_bad = sum(1 for r in finals if r.looks_bad)

        failure_causes: Counter[str] = Counter()
        for r in finals:
            if not r.spec_valid and r.spec_error:
                failure_causes[f"spec: {r.spec_error[:80]}"] += 1
            if r.collision_failure:
                failure_causes["render: label collision"] += 1
            elif not r.render_ok and r.render_error:
                failure_causes[f"render: {r.render_error[:80]}"] += 1
            for issue in r.verifier_issues:
                failure_causes[f"verifier: {issue[:80]}"] += 1
            if r.math_incorrect:
                failure_causes["quality: math incorrect"] += 1
            if r.too_similar_to_source:
                failure_causes["quality: too similar to source"] += 1
            if r.looks_bad:
                failure_causes["quality: looks bad"] += 1

        return {
            "run_id": self.run_id,
            "total_cases": len(finals),
            "spec_validation_success_rate": round(spec_ok / n, 3),
            "render_success_rate": round(render_ok / n, 3),
            "collision_failure_rate": round(collision / n, 3),
            "verifier_pass_rate": round(pass_count / n, 3),
            "verifier_fix_rate": round(fix_count / n, 3),
            "verifier_fail_rate": round(fail_count / n, 3),
            "math_incorrect_count": math_wrong,
            "too_similar_count": too_similar,
            "looks_bad_count": looks_bad,
            "most_common_failure_causes": failure_causes.most_common(15),
            "records": [asdict(r) for r in finals],
        }

    def write(self, out_dir: Path) -> tuple[Path, Path]:
        out_dir.mkdir(parents=True, exist_ok=True)
        summary = self.summarize()
        json_path = out_dir / "report.json"
        json_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

        md_lines = [
            f"# Phase 2 Diagram Eval Report",
            "",
            f"Run: `{self.run_id}`",
            f"Cases: {summary['total_cases']} (final attempt per question × mode)",
            "",
            "## Rates",
            "",
            f"| Metric | Rate |",
            f"|--------|------|",
            f"| Spec validation success | {summary['spec_validation_success_rate']:.1%} |",
            f"| Render success | {summary['render_success_rate']:.1%} |",
            f"| Collision failure | {summary['collision_failure_rate']:.1%} |",
            f"| Verifier PASS | {summary['verifier_pass_rate']:.1%} |",
            f"| Verifier FIX | {summary['verifier_fix_rate']:.1%} |",
            f"| Verifier FAIL | {summary['verifier_fail_rate']:.1%} |",
            "",
            "## Quality flags",
            "",
            f"- Mathematically wrong: {summary['math_incorrect_count']}",
            f"- Too similar to source: {summary['too_similar_count']}",
            f"- Looks bad: {summary['looks_bad_count']}",
            "",
            "## Most common failure causes",
            "",
        ]
        if summary["most_common_failure_causes"]:
            for cause, cnt in summary["most_common_failure_causes"]:
                md_lines.append(f"- ({cnt}) {cause}")
        else:
            md_lines.append("- None recorded")
        md_lines.append("")

        md_path = out_dir / "report.md"
        md_path.write_text("\n".join(md_lines), encoding="utf-8")
        return json_path, md_path
