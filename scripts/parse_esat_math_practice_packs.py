# -*- coding: utf-8 -*-
"""Parse ESAT Mathematics 1/2 practice packs into TypeScript mock modules."""
from __future__ import annotations

import json
import re
import shutil
import zipfile
from pathlib import Path

from docx import Document
import fitz

ROOT = Path(__file__).resolve().parents[1]
TMP = ROOT / "tmp_math_mocks"
OUT_TS = ROOT / "src" / "data" / "esatCampMocks"
PUBLIC_DIAG = ROOT / "public" / "esat-camp-mocks" / "diagrams"

MATH1_DOCX = Path(r"c:\Users\anson\Downloads\ESAT_Mathematics_1_Two_Practice_Modules.docx")
MATH2_PDF = Path(r"c:\Users\anson\Downloads\ESAT_Mathematics_2_Two_Practice_Modules.pdf")

DIFFICULTY = {
    "Easy": "1/4 Easy",
    "Medium": "2/4 Medium",
    "Hard": "3/4 Hard",
}

SUPER_MAP = str.maketrans(
    "\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079\u207a\u207b\u207f\u2071\u02e3\u1d57",
    "0123456789+-nixt",
)
SUB_MAP = str.maketrans(
    "\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089\u208a\u208b\u2099",
    "0123456789+-n",
)

PAGE_HEADER = re.compile(
    r"^ESAT Mathematics 2 Practice Pack$|^54 original questions$|^Page \d+$"
)
Q_NUM_LINE = re.compile(r"^(\d{1,2})\.$")
Q_NUM_INLINE = re.compile(r"^(\d{1,2})\s{1,3}(\S.*)$")
OPT_INLINE = re.compile(r"^([A-G])\s{2,}(\S.*)$")
OPT_LETTER = re.compile(r"^[A-G]$")
NOTES_Q = re.compile(r"^Question\s+(\d{1,2})\s*$")
PROFILE = re.compile(
    r"^Profile:\s*(Easy|Medium|Hard)\s*\|\s*(M\d+(?:\.\d+)?)\s+(.+?)\s*\|\s*(\d+)\s*seconds\s*$",
    re.I | re.M,
)

MATH1_DIAGRAMS = {
    1: [17, 18, 19, 20, 24, 27],
    2: [17, 19, 20, 22, 24, 27],
}
MATH2_DIAGRAMS = {
    1: {
        10: 649,
        13: 752,
        19: 960,
        21: 1040,
        22: 1088,
        23: 1125,
        25: 1199,
        26: 1237,
        27: 1269,
    },
    2: {
        9: 3368,
        10: 3416,
        11: 3454,
        12: 3491,
        15: 3596,
        23: 3873,
        25: 3943,
        26: 3980,
        27: 4018,
    },
}


def ts_str(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)


def convert_unicode_math(text: str) -> str:
    def sup_repl(m: re.Match[str]) -> str:
        return "^{" + m.group().translate(SUPER_MAP).replace(" ", "") + "}"

    def sub_repl(m: re.Match[str]) -> str:
        return "_{" + m.group().translate(SUB_MAP) + "}"

    text = re.sub(
        r"[\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079\u207a\u207b\u207f\u2071\u02e3\u1d57]+",
        sup_repl,
        text,
    )
    text = re.sub(
        r"[\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089\u208a\u208b\u2099]+",
        sub_repl,
        text,
    )
    text = re.sub(r"\u221a\(([^)]+)\)", r"\\sqrt{\1}", text)
    text = text.replace("\u221a", r"\sqrt")
    text = re.sub(r"\\sqrt(?!\{)([A-Za-z0-9]+)", r"\\sqrt{\1}", text)
    reps = {
        "\u00d7": r"\times ",
        "\u03c0": r"\pi ",
        "\u03b8": r"\theta ",
        "\u2264": r"\le ",
        "\u2265": r"\ge ",
        "\u2260": r"\ne ",
        "\u00b1": r"\pm ",
        "\u222b": r"\int ",
        "\u00b0": r"^{\circ}",
        "\u221e": r"\infty ",
    }
    for src, dst in reps.items():
        text = text.replace(src, dst)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" \n", "\n", text)
    return text.strip()


ENGLISH_OPTION_WORDS = re.compile(
    r"\b(estimate|overestimate|underestimate|exact|asymptote|root|only|all|real|or|and|no|solution|unchanged|higher|lower)\b",
    re.I,
)


def looks_like_math_option(text: str) -> bool:
    if not text or "\n" in text or len(text) > 90:
        return False
    if ENGLISH_OPTION_WORDS.search(text) and len(re.findall(r"[A-Za-z]{4,}", text)) >= 2:
        return False
    if any(tok in text for tok in ("^{", "_{", r"\times", r"\pi", r"\sqrt", r"\le", r"\ge", r"\ne", r"\int")):
        return True
    if re.fullmatch(r"[-+]?\d+(?:\.\d+)?(?:\s*[A-Za-z/%]+)?", text):
        return False
    if re.search(r"[=<>]|[A-Za-z]\(|\d/\d|[xy]\^[0-9{]|[A-Za-z]\^", text):
        return True
    if re.fullmatch(r"[-+]?(\d+|[A-Za-z0-9()+\-*/^{}_\\ ]+)(/[-+A-Za-z0-9()+\-*/^{}_\\ ]+)?", text) and re.search(
        r"[\\^_{}=]|[a-zA-Z]\d|\d[a-zA-Z]", text
    ):
        return True
    return False


def latexify(text: str, *, as_option: bool = False) -> str:
    text = convert_unicode_math(text)
    text = re.sub(r"\^\(([^)]+)\)", r"^{\1}", text)
    text = re.sub(r"(?<![{\\])\^(\d+)", r"^{\1}", text)
    text = re.sub(r"\\times {2,}", r"\\times ", text)
    if as_option and looks_like_math_option(text):
        return "\\(" + text + "\\)"
    # Wrap compact super/subscripted tokens inside prose.
    text = re.sub(
        r"((?:[A-Za-z0-9]+|\([^()]{0,48}\))(?:\^\{[^}]+\}|_\{[^}]+\})+)",
        r"\\(\1\\)",
        text,
    )
    return text.strip()


def cleanup_math2_text(text: str) -> str:
    text = text.replace("\u00a0", " ")
    replacements = [
        (r"u \u208a\u2081 = 1 - u \.\s*\n\u2099\s*\n\u2099", "u_{n+1} = 1 - u_n. "),
        (r"u \u208a\u2081 = u  \+ 2n \+ 1\.\s*\n\u2099\s*\n\u2099", "u_{n+1} = u_n + 2n + 1. "),
        (r"Treats the recurrence as u \u208a\u2081 = 1 - n\.\s*\n\u2099", "Treats the recurrence as u_{n+1} = 1 - n. "),
        (r"sum S  of its first n terms\.\s*\n\u2099", "sum S_n of its first n terms. "),
        (r"Uses S = n\(a \+ d\)/2\.\s*\n\u2099", "Uses S_n = n(a + d)/2. "),
        (r"it follows\s*\nthat u = n\u00b2 \+ 1\.\s*\n\u2099", "it follows that u_n = n^2 + 1. "),
        (r"Thus u\u2081\u2080 = 101\.\s*\n\u2099", "Thus u_{10} = 101. "),
    ]
    for pat, repl in replacements:
        text = re.sub(pat, repl, text)
    # leftover orphan subscript letters
    text = re.sub(r"\n\u2099\n", "\n", text)
    text = re.sub(r"\n\u2099$", "", text)
    return text


def skip_noise(line: str) -> bool:
    s = line.strip()
    if not s:
        return True
    if PAGE_HEADER.match(s):
        return True
    if s in {"Begin when ready.", "Answer key", "Instructions"}:
        return True
    return False


def parse_candidate_math1(lines: list[str]) -> list[dict]:
    questions: list[dict] = []
    i = 0
    while i < len(lines):
        m = Q_NUM_INLINE.match(lines[i].strip())
        if not m:
            i += 1
            continue
        number = int(m.group(1))
        if number < 1 or number > 27:
            i += 1
            continue
        stem_parts = [m.group(2).strip()]
        options: dict[str, str] = {}
        i += 1
        current_opt = None
        while i < len(lines):
            raw = lines[i].rstrip()
            s = raw.strip()
            if s.startswith("Diagram not to scale"):
                i += 1
                continue
            if NOTES_Q.match(s) or s.startswith("4. ") or s.startswith("5. ") or s.startswith("6. "):
                break
            if s in {"MODULE 1", "MODULE 2", "ESAT Mathematics 1", "Candidate paper"}:
                break
            om = OPT_INLINE.match(s)
            if om:
                current_opt = om.group(1)
                options[current_opt] = om.group(2).strip()
                i += 1
                continue
            nxt = Q_NUM_INLINE.match(s)
            if nxt and int(nxt.group(1)) != number and not current_opt:
                break
            if nxt and current_opt and int(nxt.group(1)) != number:
                break
            if s and current_opt is None:
                stem_parts.append(s)
            elif s and current_opt:
                options[current_opt] = (options[current_opt] + " " + s).strip()
            i += 1
        questions.append(
            {
                "number": number,
                "stem": "\n".join(p for p in stem_parts if p).strip(),
                "options": options,
            }
        )
    return questions


def parse_candidate_math2(lines: list[str]) -> list[dict]:
    questions: list[dict] = []
    i = 0
    n_lines = len(lines)

    def next_nonempty(j: int) -> int:
        while j < n_lines and skip_noise(lines[j]):
            j += 1
        return j

    while i < n_lines:
        s = lines[i].strip()
        m = Q_NUM_LINE.match(s)
        if not m:
            i += 1
            continue
        number = int(m.group(1))
        i = next_nonempty(i + 1)
        stem_parts: list[str] = []
        options: dict[str, str] = {}
        current_opt = None
        while i < n_lines:
            s = lines[i].strip()
            if skip_noise(lines[i]) and not OPT_LETTER.match(s) and not Q_NUM_LINE.match(s):
                i += 1
                continue
            if s.startswith("4. ") or s.startswith("5. ") or s.startswith("6. "):
                break
            if Q_NUM_LINE.match(s) and int(Q_NUM_LINE.match(s).group(1)) != number:
                break
            if OPT_LETTER.match(s):
                current_opt = s
                i += 1
                opt_parts: list[str] = []
                while i < n_lines:
                    t = lines[i].strip()
                    if skip_noise(lines[i]) and not OPT_LETTER.match(t) and not Q_NUM_LINE.match(t):
                        i += 1
                        continue
                    if OPT_LETTER.match(t) or Q_NUM_LINE.match(t) or t.startswith("4. ") or t.startswith("5. ") or t.startswith("6. "):
                        break
                    if t:
                        opt_parts.append(t)
                    i += 1
                options[current_opt] = " ".join(opt_parts).strip()
                continue
            if s:
                stem_parts.append(s)
            i += 1
        questions.append(
            {
                "number": number,
                "stem": "\n".join(stem_parts).strip(),
                "options": options,
            }
        )
    return questions


def parse_notes_math1(text: str) -> dict[int, dict]:
    notes: dict[int, dict] = {}
    blocks = re.split(r"\n(?=Question \d+\s*$)", text, flags=re.M)
    for block in blocks:
        m = re.match(r"Question (\d+)\s*", block.strip())
        if not m:
            continue
        number = int(m.group(1))
        editor_pick = "Strong question" in block or "★" in block
        pm = PROFILE.search(block)
        if not pm:
            print("FAIL BLOCK", number, repr(block[:300]))
            raise SystemExit(f"Math1 missing profile for Q{number}")
        difficulty, topic_code, topic_name, seconds = pm.group(1), pm.group(2), pm.group(3).strip(), int(pm.group(4))
        am = re.search(r"Correct answer:\s*([A-G])", block)
        if not am:
            raise SystemExit(f"Math1 missing answer for Q{number}")
        answer = am.group(1)
        sm = re.search(r"Solution:\s*(.*?)\nTip:", block, re.S)
        tm = re.search(r"Tip:\s*(.*?)\nDistractor map", block, re.S)
        dm = re.search(r"Distractor map\n(.*?)(?:\nCalibration:|\Z)", block, re.S)
        cm = re.search(r"Calibration:\s*(.*)", block, re.S)
        distractors: dict[str, str] = {}
        if dm:
            for line in dm.group(1).splitlines():
                om = re.match(r"^([A-G]):\s*(.*)$", line.strip())
                if om:
                    distractors[om.group(1)] = om.group(2).strip()
        notes[number] = {
            "answer": answer,
            "topicCode": topic_code,
            "topicName": topic_name,
            "difficulty": DIFFICULTY[difficulty],
            "targetSeconds": seconds,
            "targetDisplay": f"{seconds} s",
            "tip": tm.group(1).strip() if tm else "",
            "solution": sm.group(1).strip() if sm else "",
            "distractors": distractors,
            "benchmarkNote": cm.group(1).strip().replace("\n", " ") if cm else "",
            "editorPick": editor_pick,
        }
    return notes


def parse_notes_math2(text: str) -> dict[int, dict]:
    notes: dict[int, dict] = {}
    parts = re.split(r"\n(?=Question \d+\s*)", text)
    for part in parts:
        m = re.match(r"Question (\d+)\s*", part.strip())
        if not m:
            continue
        number = int(m.group(1))
        lines = [ln.strip() for ln in part.splitlines()]
        editor_pick = any("Strong question" in ln or ln == "★" for ln in lines)
        # locate meta
        try:
            d_idx = next(i for i, ln in enumerate(lines) if ln in DIFFICULTY)
        except StopIteration:
            raise SystemExit(f"Math2 missing difficulty for Q{number}")
        try:
            c_idx = next(i for i, ln in enumerate(lines) if ln.startswith("Correct answer"))
        except StopIteration:
            raise SystemExit(f"Math2 missing correct answer for Q{number}")
        meta = [ln for ln in lines[d_idx:c_idx] if ln and not PAGE_HEADER.match(ln) and ln not in {"Difficulty", "Official syllabus", "Secondary", "Estimated time", "★", "Strong question"}]
        difficulty = meta[0]
        time_idx = next(i for i, ln in enumerate(meta) if re.search(r"\d+\s*seconds", ln))
        time_s = int(re.search(r"(\d+)\s*seconds", meta[time_idx]).group(1))
        middle = meta[1:time_idx]
        secondary = ""
        topic_lines = middle
        if middle:
            last = middle[-1]
            if last == "None" or (last.startswith("MM") and len(middle) > 1 and not last.startswith(middle[0][:3] if False else "MM") and re.match(r"^MM\d", last)):
                secondary = "" if last == "None" else last
                topic_lines = middle[:-1] if last == "None" or re.match(r"^MM\d", last) else middle
            if last == "None":
                topic_lines = middle[:-1]
                secondary = "None"
            elif re.match(r"^MM\d", last) and any(re.match(r"^MM\d", x) for x in middle[:-1]):
                secondary = last
                topic_lines = middle[:-1]
        topic = " ".join(topic_lines).strip()
        tm = re.match(r"(MM\d+(?:\.\d+)?)\s+(.*)$", topic)
        topic_code = tm.group(1) if tm else topic.split()[0]
        topic_name = tm.group(2).strip() if tm else topic
        # correct answer letter
        ans_line = lines[c_idx]
        am = re.search(r"Correct answer\s*([A-G])\.", ans_line)
        answer_text = ""
        if am:
            answer = am.group(1)
            answer_text = ans_line.split(".", 1)[-1].strip()
        else:
            # next non-empty
            j = c_idx + 1
            while j < len(lines) and (not lines[j] or PAGE_HEADER.match(lines[j])):
                j += 1
            am = re.match(r"^([A-G])\.\s*(.*)$", lines[j])
            if not am:
                raise SystemExit(f"Math2 cannot parse answer Q{number}: {lines[j]!r}")
            answer = am.group(1)
            answer_text = am.group(2).strip()
        body = "\n".join(lines[c_idx:])
        sol_m = re.search(r"Quick solution\.\s*(.*?)\nTip\.", body, re.S)
        tip_m = re.search(r"\nTip\.\s*(.*?)\nDistractor map", body, re.S)
        dist_m = re.search(r"Distractor map\n(.*?)(?:\nCalibration reference\.|\Z)", body, re.S)
        cal_m = re.search(r"Calibration reference\.\s*(.*)", body, re.S)
        distractors: dict[str, str] = {}
        if dist_m:
            dlines = [ln for ln in dist_m.group(1).splitlines() if ln and ln not in {"Option", "Specific mistake"}]
            k = 0
            while k < len(dlines):
                if re.match(r"^[A-G]$", dlines[k]):
                    letter = dlines[k]
                    k += 1
                    parts = []
                    while k < len(dlines) and not re.match(r"^[A-G]$", dlines[k]):
                        parts.append(dlines[k])
                        k += 1
                    distractors[letter] = " ".join(parts).strip()
                else:
                    k += 1
        notes[number] = {
            "answer": answer,
            "answerTextRaw": answer_text,
            "topicCode": topic_code,
            "topicName": topic_name,
            "difficulty": DIFFICULTY[difficulty],
            "targetSeconds": time_s,
            "targetDisplay": f"{time_s} s",
            "tip": tip_m.group(1).strip() if tip_m else "",
            "solution": sol_m.group(1).strip() if sol_m else "",
            "distractors": distractors,
            "benchmarkNote": re.sub(r"\s+", " ", cal_m.group(1)).strip() if cal_m else "",
            "editorPick": editor_pick,
            "secondary": secondary,
        }
    return notes


def clean_benchmark(note: str) -> str:
    note = re.sub(r"\s+", " ", note).strip()
    note = re.sub(r"\s*ESAT Mathematics [12] Practice Pack.*$", "", note)
    note = re.sub(r"\s*Page \d+.*$", "", note)
    return note.strip()


def merge_question(base: dict, note: dict, latex: bool = True) -> dict:
    options = dict(base["options"])
    answer = note["answer"]
    answer_text = options.get(answer, "")
    if note.get("answerTextRaw") and not answer_text:
        answer_text = note["answerTextRaw"]
    stem = base["stem"]
    tip = note["tip"]
    solution = note["solution"]
    distractors = dict(note["distractors"])
    if latex:
        stem = latexify(stem)
        tip = latexify(tip)
        solution = latexify(solution)
        options = {k: latexify(v, as_option=True) for k, v in options.items()}
        distractors = {k: latexify(v) for k, v in distractors.items()}
        answer_text = options.get(answer, latexify(answer_text, as_option=True))
    return {
        "number": base["number"],
        "stem": stem,
        "options": options,
        "answer": answer,
        "answerText": answer_text,
        "topicCode": note["topicCode"],
        "topicName": note["topicName"],
        "difficulty": note["difficulty"],
        "targetSeconds": note["targetSeconds"],
        "targetDisplay": note["targetDisplay"],
        "tip": tip,
        "solution": solution,
        "distractors": distractors,
        "benchmarkNote": clean_benchmark(note["benchmarkNote"]),
        "editorPick": note["editorPick"],
    }


def slice_between(text: str, start: str, end: str | None) -> str:
    i = text.find(start)
    if i < 0:
        raise SystemExit(f"missing start marker {start!r}")
    j = text.find(end, i) if end else len(text)
    if j < 0:
        raise SystemExit(f"missing end marker {end!r}")
    return text[i:j]


def emit_ts(var_name: str, comment: str, questions: list[dict]) -> str:
    def emit_q(q: dict) -> str:
        opts = ",\n".join(f"      {k}: {ts_str(v)}" for k, v in q["options"].items())
        dists = ",\n".join(f"      {k}: {ts_str(v)}" for k, v in q["distractors"].items())
        diagram = f',\n    diagramKey: {ts_str(q["diagramKey"])}' if q.get("diagramKey") else ""
        return f"""  {{
    number: {q["number"]},
    stem: {ts_str(q["stem"])},
    options: {{
{opts}
    }},
    answer: {ts_str(q["answer"])},
    answerText: {ts_str(q["answerText"])},
    topicCode: {ts_str(q["topicCode"])},
    topicName: {ts_str(q["topicName"])},
    difficulty: {ts_str(q["difficulty"])},
    targetSeconds: {q["targetSeconds"]},
    targetDisplay: {ts_str(q["targetDisplay"])},
    tip: {ts_str(q["tip"])},
    solution: {ts_str(q["solution"])},
    distractors: {{
{dists}
    }},
    benchmarkNote: {ts_str(q["benchmarkNote"])},
    editorPick: {str(q["editorPick"]).lower()}{diagram}
  }}"""

    body = ",\n".join(emit_q(q) for q in questions)
    return f'''import type {{ EsatCampMockQuestion }} from "./types";

/** {comment} */
export const {var_name}: EsatCampMockQuestion[] = [
{body}
];
'''


def extract_math1_docx_images() -> None:
    src_dir = TMP / "docx_images"
    src_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(MATH1_DOCX) as z:
        for name in z.namelist():
            if name.startswith("word/media/"):
                (src_dir / Path(name).name).write_bytes(z.read(name))


def extract_math2_pdf_images() -> None:
    src_dir = TMP / "pdf_unique"
    src_dir.mkdir(parents=True, exist_ok=True)
    pdf = fitz.open(str(MATH2_PDF))
    needed = {xref for qs in MATH2_DIAGRAMS.values() for xref in qs.values()}
    for xref in needed:
        pix = fitz.Pixmap(pdf, xref)
        if pix.n - pix.alpha >= 4:
            pix = fitz.Pixmap(fitz.csRGB, pix)
        pix.save(str(src_dir / f"xref{xref}.png"))


def copy_math1_diagrams() -> dict[tuple[int, int], str]:
    PUBLIC_DIAG.mkdir(parents=True, exist_ok=True)
    src_dir = TMP / "docx_images"
    mapping: dict[tuple[int, int], str] = {}
    names = []
    for module, qs in MATH1_DIAGRAMS.items():
        for q in qs:
            names.append((module, q))
    files = sorted(src_dir.glob("image*.png"), key=lambda p: int(re.search(r"\d+", p.stem).group()))
    if len(files) != len(names):
        raise SystemExit(f"expected {len(names)} math1 images, found {len(files)}")
    for (module, q), src in zip(names, files):
        # Pack module 1 becomes Mathematics 1 (2); pack module 2 becomes Mathematics 1 (3).
        key = f"m1-{module + 1}-q{q:02d}"
        dest = PUBLIC_DIAG / f"{key}.png"
        shutil.copyfile(src, dest)
        mapping[(module, q)] = key
    return mapping


def copy_math2_diagrams() -> dict[tuple[int, int], str]:
    PUBLIC_DIAG.mkdir(parents=True, exist_ok=True)
    src_dir = TMP / "pdf_unique"
    mapping: dict[tuple[int, int], str] = {}
    for module, qs in MATH2_DIAGRAMS.items():
        for q, xref in qs.items():
            src = src_dir / f"xref{xref}.png"
            if not src.exists():
                raise SystemExit(f"missing math2 diagram {src}")
            key = f"m2-{module}-q{q:02d}"
            dest = PUBLIC_DIAG / f"{key}.png"
            shutil.copyfile(src, dest)
            mapping[(module, q)] = key
    return mapping


def validate(label: str, qs: list[dict]) -> None:
    if len(qs) != 27:
        raise SystemExit(f"{label}: expected 27 questions, got {len(qs)}")
    nums = [q["number"] for q in qs]
    if nums != list(range(1, 28)):
        raise SystemExit(f"{label}: bad numbering {nums}")
    for q in qs:
        if q["answer"] not in q["options"]:
            raise SystemExit(f"{label} Q{q['number']}: answer {q['answer']} not in options {list(q['options'])}")
        if q["options"][q["answer"]] != q["answerText"]:
            # allow latex-normalized mismatch log
            pass
        incorrect = [k for k in q["options"] if k != q["answer"]]
        missing = [k for k in incorrect if k not in q["distractors"]]
        extra = [k for k in q["distractors"] if k == q["answer"] or k not in q["options"]]
        if missing or extra:
            print(f"WARN {label} Q{q['number']} distractors missing={missing} extra={extra}")
        if not q["solution"] or not q["tip"]:
            raise SystemExit(f"{label} Q{q['number']}: missing solution/tip")
        if len(q["options"]) < 4:
            raise SystemExit(f"{label} Q{q['number']}: too few options")


def main() -> None:
    TMP.mkdir(exist_ok=True)
    doc = Document(str(MATH1_DOCX))
    math1_text = "\n".join(p.text.replace("\r", "") for p in doc.paragraphs)
    (TMP / "math1_docx_paragraphs.txt").write_text(math1_text, encoding="utf-8")

    m1_c1 = slice_between(math1_text, "3. Module 1 candidate paper", "4. Module 1 answer key")
    m1_n1 = slice_between(math1_text, "4. Module 1 answer key", "5. Module 2 candidate paper")
    m1_c2 = slice_between(math1_text, "5. Module 2 candidate paper", "6. Module 2 answer key")
    m1_n2 = math1_text[math1_text.find("6. Module 2 answer key") :]

    m1q1 = parse_candidate_math1(m1_c1.splitlines())
    m1q2 = parse_candidate_math1(m1_c2.splitlines())
    n1 = parse_notes_math1(m1_n1)
    n2 = parse_notes_math1(m1_n2)
    print("math1 candidate", len(m1q1), len(m1q2), "notes", len(n1), len(n2))

    pdf = fitz.open(str(MATH2_PDF))
    math2_text = cleanup_math2_text("\n".join(page.get_text("text") for page in pdf))
    (TMP / "math2_pdf_text.txt").write_text(math2_text, encoding="utf-8")
    m2_c1 = slice_between(math2_text, "3. Module 1 candidate paper", "4. Module 1 answer key")
    m2_n1 = slice_between(math2_text, "4. Module 1 answer key", "5. Module 2 candidate paper")
    m2_c2 = slice_between(math2_text, "5. Module 2 candidate paper", "6. Module 2 answer key")
    m2_n2 = math2_text[math2_text.find("6. Module 2 answer key") :]

    m2q1 = parse_candidate_math2(m2_c1.splitlines())
    m2q2 = parse_candidate_math2(m2_c2.splitlines())
    n21 = parse_notes_math2(m2_n1)
    n22 = parse_notes_math2(m2_n2)
    print("math2 candidate", len(m2q1), len(m2q2), "notes", len(n21), len(n22))

    extract_math1_docx_images()
    extract_math2_pdf_images()
    m1_diag = copy_math1_diagrams()
    m2_diag = copy_math2_diagrams()

    def build(cands, notes, diag_map, module):
        out = []
        for base in cands:
            q = merge_question(base, notes[base["number"]])
            key = diag_map.get((module, base["number"]))
            if key:
                q["diagramKey"] = key
            out.append(q)
        return out

    packs = {
        "maths1_mock_02": (
            "MATHS1_MOCK_02_QUESTIONS",
            "ESAT Mathematics 1 practice pack, module 1",
            build(m1q1, n1, m1_diag, 1),
        ),
        "maths1_mock_03": (
            "MATHS1_MOCK_03_QUESTIONS",
            "ESAT Mathematics 1 practice pack, module 2",
            build(m1q2, n2, m1_diag, 2),
        ),
        "maths2_mock_01": (
            "MATHS2_MOCK_01_QUESTIONS",
            "ESAT Mathematics 2 practice pack, module 1",
            build(m2q1, n21, m2_diag, 1),
        ),
        "maths2_mock_02": (
            "MATHS2_MOCK_02_QUESTIONS",
            "ESAT Mathematics 2 practice pack, module 2",
            build(m2q2, n22, m2_diag, 2),
        ),
    }

    summary = {}
    for fname, (var, comment, qs) in packs.items():
        validate(fname, qs)
        (OUT_TS / f"{fname}_questions.ts").write_text(emit_ts(var, comment, qs), encoding="utf-8")
        summary[fname] = {
            "count": len(qs),
            "answers": {q["number"]: q["answer"] for q in qs},
            "diagrams": [q["number"] for q in qs if q.get("diagramKey")],
            "optionCounts": {q["number"]: len(q["options"]) for q in qs},
        }
        print("wrote", fname, "diagrams", summary[fname]["diagrams"])

    (TMP / "parse_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print("done")


if __name__ == "__main__":
    main()
