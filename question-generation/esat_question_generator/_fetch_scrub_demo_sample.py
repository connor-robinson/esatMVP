"""One-off export for scrubber demos.

Creates `scrub_demo_sample.json` with a mix of:
- likely-bad items (long stem / calculus-like TeX / physics-lex bleed)
- a few "really good challenging" items chosen from high style scores and difficulty Hard
"""

import json
import os
import re
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent.parent  # nocalcMVP2_real

load_dotenv(REPO / ".env.local")
load_dotenv(ROOT / ".env.local")

url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not url or not key:
    raise SystemExit("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")

client = create_client(url, key)


def report_pass(report) -> bool:
    if not isinstance(report, dict):
        return False
    verdict = str(report.get("verdict") or "").strip().upper()
    return verdict == "PASS"


def style_combined_score(row) -> float:
    """Sum the main style score components (0..10-ish).

    questions.json shows style_report.scores has these keys:
    authenticity, one_idea_purity, no_calculator, elegance, distractor_realism, plausibility
    """

    sr = row.get("style_report")
    if not isinstance(sr, dict):
        return 0.0
    scores = sr.get("scores")
    if not isinstance(scores, dict):
        return 0.0

    keys = [
        "authenticity",
        "one_idea_purity",
        "no_calculator",
        "elegance",
        "distractor_realism",
        "plausibility",
    ]
    total = 0.0
    for k in keys:
        try:
            total += float(scores.get(k, 0) or 0)
        except (TypeError, ValueError):
            pass
    return total


def fetch_all():
    rows = []
    start = 0
    page = 1000
    while True:
        q = (
            client.table("ai_generated_questions")
            .select(
                "id,generation_id,schema_id,subjects,status,primary_tag,difficulty,"
                "verifier_report,style_report,"
                "question_stem,options,correct_option,solution_reasoning"
            )
            .eq("test_type", "ESAT")
            .in_("subjects", ["Math 1", "Math 2"])
            .neq("status", "deleted")
            .range(start, start + page - 1)
        )
        batch = q.execute().data or []
        rows.extend(batch)
        if len(batch) < page:
            break
        start += page
    return rows


def stem_len(r):
    return len(r.get("question_stem") or "")


def full_text(r):
    o = r.get("options") or {}
    if isinstance(o, dict):
        opt = " ".join(str(v) for v in o.values())
    else:
        opt = str(o)
    return (r.get("question_stem") or "") + " " + opt + " " + (r.get("solution_reasoning") or "")


PHYS = re.compile(
    r"\b(newton|velocity|acceleration|momentum|circuit|voltage|resistor|capacitor|"
    r"photon|quantum|molecule|bond enthalpy|titration)\b",
    re.I,
)


def calc_flags(r):
    t = full_text(r)
    flags = []
    pairs = [
        (r"\\sin|\\cos|\\tan", "trig_tex"),
        (r"\\ln|\\log(?![a-z])", "log_tex"),
        (r"e\^\{|e\^x|\\mathrm\{e\}", "exp_tex"),
        (r"derivative|differentiate|\\frac\{d", "diff_words"),
        (r"\\int|integrat", "int_words"),
    ]
    for pat, name in pairs:
        if re.search(pat, t, re.I):
            flags.append(name)
    return flags


def phy_hint(r):
    return bool(PHYS.search(full_text(r)))


def syllabus_score(r):
    f = set(calc_flags(r))
    score = 0
    if "diff_words" in f or "int_words" in f:
        score += 2
    if "trig_tex" in f or "log_tex" in f or "exp_tex" in f:
        score += 3
    return score


def add(picked, seen, row, tag):
    qid = row["id"]
    if qid in seen:
        return False
    seen.add(qid)
    copy = dict(row)
    copy["_scrub_demo_tag"] = tag
    copy["_stem_chars"] = stem_len(copy)
    copy["_calc_flags"] = calc_flags(copy)
    copy["_syllabus_score"] = syllabus_score(copy)
    copy["_physics_lex_hint"] = phy_hint(copy)
    if "difficulty" in copy:
        copy["_difficulty"] = copy.get("difficulty")
    copy["_style_combined_score"] = style_combined_score(copy)
    picked.append(copy)
    return True


def main():
    rows = fetch_all()
    print("fetched", len(rows), "ESAT Math1+Math2 non-deleted rows")

    long_sorted = sorted(rows, key=stem_len, reverse=True)
    syllabus_sorted = sorted(rows, key=syllabus_score, reverse=True)
    physics_sorted = sorted(rows, key=lambda r: stem_len(r), reverse=True)

    # Good challenging: Hard + style PASS + verifier PASS + high style scores.
    good_pool = []
    for r in rows:
        if str(r.get("difficulty") or "").strip().upper() != "HARD":
            continue
        if not report_pass(r.get("style_report")):
            continue
        if not report_pass(r.get("verifier_report")):
            continue
        good_pool.append(r)

    good_pool.sort(key=style_combined_score, reverse=True)

    # pick 2 Math1 + 2 Math2 good items (Hard)
    good_ids = set()
    picked = []
    seen = set()

    def pick_good_for_subject(subject, n):
        cnt = 0
        for r in good_pool:
            if r.get("subjects") != subject:
                continue
            if r["id"] in good_ids:
                continue
            # Keep good items from being "physics-lex bleed" by heuristic.
            if phy_hint(r):
                continue
            if add(picked, seen, r, "good_challenging_best_style"):
                good_ids.add(r["id"])
                cnt += 1
                if cnt >= n:
                    break
        return cnt

    pick_good_for_subject("Math 1", 2)
    pick_good_for_subject("Math 2", 2)

    targets = {
        "likely_too_long_stem": 7,
        "heuristic_heavy_calculus_tex": 7,
        "heuristic_physics_chem_lex_in_math_row": 2,
        "good_challenging_best_style": 4,  # soft; depends on availability
    }

    # Fill rest with bad-ish heuristics, excluding already picked good items.
    # 1) long stems
    for r in long_sorted:
        if len(picked) >= 20:
            break
        if r["id"] in good_ids:
            continue
        if add(picked, seen, r, "likely_too_long_stem"):
            if sum(1 for x in picked if x["_scrub_demo_tag"] == "likely_too_long_stem") >= targets["likely_too_long_stem"]:
                break

    # 2) heavy calculus TeX / diff+int markers
    for r in syllabus_sorted:
        if len(picked) >= 20:
            break
        if r["id"] in good_ids:
            continue
        if syllabus_score(r) < 4:
            continue
        if add(picked, seen, r, "heuristic_heavy_calculus_tex"):
            if sum(1 for x in picked if x["_scrub_demo_tag"] == "heuristic_heavy_calculus_tex") >= targets["heuristic_heavy_calculus_tex"]:
                break

    # 3) physics-lex bleed (still inside Math subject)
    for r in physics_sorted:
        if len(picked) >= 20:
            break
        if r["id"] in good_ids:
            continue
        if not phy_hint(r):
            continue
        if stem_len(r) <= 80:
            continue
        if add(picked, seen, r, "heuristic_physics_chem_lex_in_math_row"):
            if sum(1 for x in picked if x["_scrub_demo_tag"] == "heuristic_physics_chem_lex_in_math_row") >= targets["heuristic_physics_chem_lex_in_math_row"]:
                break

    # 4) any remaining slots: pick next worst calculus items (excluding good)
    if len(picked) < 20:
        for r in syllabus_sorted:
            if len(picked) >= 20:
                break
            if r["id"] in good_ids:
                continue
            if add(picked, seen, r, "heuristic_heavy_calculus_tex_fill"):
                # stop only when full
                pass

    out = picked[:20]
    out_path = ROOT / "scrub_demo_sample.json"
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print("wrote", out_path, "n=", len(out))
    for p in out:
        gid = (p.get("generation_id") or "")[:48]
        print(
            p["_scrub_demo_tag"],
            p["subjects"],
            p.get("_difficulty"),
            p["_stem_chars"],
            p.get("_style_combined_score"),
            gid,
        )


if __name__ == "__main__":
    main()
