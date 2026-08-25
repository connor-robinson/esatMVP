# -*- coding: utf-8 -*-
"""Generate TypeScript mock module data from canonical.json."""
from __future__ import annotations

import json
from pathlib import Path

SRC = Path(r"c:\Users\anson\Desktop\nocalcMVP2_real\tmp_physics_mocks\canonical.json")
OUT_DIR = Path(r"c:\Users\anson\Desktop\nocalcMVP2_real\src\data\esatCampMocks")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def ts_str(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)


def emit_question(q: dict) -> str:
    opts = ",\n".join(f'      {k}: {ts_str(v)}' for k, v in q["options"].items())
    dists = ",\n".join(f'      {k}: {ts_str(v)}' for k, v in q["distractors"].items())
    diagram = f',\n    diagramKey: {ts_str(q["id"])}' if q["id"] in image_map else ""
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


data = json.loads(SRC.read_text(encoding="utf-8"))
image_map = data["imageMap"]

types = '''/** ESAT CAMP Physics mock module question (DOCX source of truth). */
export type EsatCampMockLetter = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";

export interface EsatCampMockQuestion {
  number: number;
  stem: string;
  options: Partial<Record<EsatCampMockLetter, string>>;
  answer: EsatCampMockLetter;
  topicCode: string;
  topicName: string;
  difficulty: string;
  targetSeconds: number;
  targetDisplay: string;
  tip: string;
  solution: string;
  distractors: Partial<Record<EsatCampMockLetter, string>>;
  benchmarkNote: string;
  editorPick: boolean;
  diagramKey?: string;
}

export interface EsatCampMockModule {
  id: "physics-module-a" | "physics-module-b";
  title: string;
  subject: "Physics";
  questionCount: 27;
  timeLimitMinutes: 40;
  calculator: "Not permitted";
  paperName: string;
  questions: EsatCampMockQuestion[];
}
'''

(OUT_DIR / "types.ts").write_text(types, encoding="utf-8")

for key, var_name, title, paper_name, module_id in [
    ("moduleA", "PHYSICS_MODULE_A_QUESTIONS", "Physics Module A", "Physics Module A", "physics-module-a"),
    ("moduleB", "PHYSICS_MODULE_B_QUESTIONS", "Physics Module B", "Physics Module B", "physics-module-b"),
]:
    qs = data[key]
    body = ",\n".join(emit_question(q) for q in qs)
    content = f'''import type {{ EsatCampMockQuestion }} from "./types";

/** Exact candidate + editor-key content from ESAT_Physics_Mock_Modules_A_B.docx */
export const {var_name}: EsatCampMockQuestion[] = [
{body}
];
'''
    (OUT_DIR / f"{module_id.replace('-', '_')}_questions.ts").write_text(content, encoding="utf-8")

index = '''import type { EsatCampMockModule } from "./types";
import { PHYSICS_MODULE_A_QUESTIONS } from "./physics_module_a_questions";
import { PHYSICS_MODULE_B_QUESTIONS } from "./physics_module_b_questions";

export * from "./types";
export { PHYSICS_MODULE_A_QUESTIONS } from "./physics_module_a_questions";
export { PHYSICS_MODULE_B_QUESTIONS } from "./physics_module_b_questions";

/** Stable virtual paper IDs (not from Supabase). */
export const ESAT_CAMP_MOCK_PAPER_IDS = {
  physicsModuleA: 910001,
  physicsModuleB: 910002,
} as const;

export const ESAT_CAMP_MOCK_EXAM_NAME = "ESAT" as const;
export const ESAT_CAMP_MOCK_EXAM_YEAR = 2026;
export const ESAT_CAMP_MOCK_EXAM_TYPE = "ESAT CAMP" as const;
export const ESAT_CAMP_MOCK_SOURCE_LABEL = "ESAT CAMP Mock Papers";

export const PHYSICS_MODULE_A: EsatCampMockModule = {
  id: "physics-module-a",
  title: "Physics Module A",
  subject: "Physics",
  questionCount: 27,
  timeLimitMinutes: 40,
  calculator: "Not permitted",
  paperName: "Physics Module A",
  questions: PHYSICS_MODULE_A_QUESTIONS,
};

export const PHYSICS_MODULE_B: EsatCampMockModule = {
  id: "physics-module-b",
  title: "Physics Module B",
  subject: "Physics",
  questionCount: 27,
  timeLimitMinutes: 40,
  calculator: "Not permitted",
  paperName: "Physics Module B",
  questions: PHYSICS_MODULE_B_QUESTIONS,
};

export const ESAT_CAMP_MOCK_MODULES: EsatCampMockModule[] = [
  PHYSICS_MODULE_A,
  PHYSICS_MODULE_B,
];

export function isEsatCampMockPaperId(paperId: number | null | undefined): boolean {
  return (
    paperId === ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleA ||
    paperId === ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleB
  );
}

export function getEsatCampMockModuleByPaperId(paperId: number) {
  if (paperId === ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleA) return PHYSICS_MODULE_A;
  if (paperId === ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleB) return PHYSICS_MODULE_B;
  return null;
}

export function getEsatCampMockModuleByPaperName(paperName: string) {
  return ESAT_CAMP_MOCK_MODULES.find((m) => m.paperName === paperName) ?? null;
}
'''
(OUT_DIR / "index.ts").write_text(index, encoding="utf-8")
print("wrote modules to", OUT_DIR)
print("A count", len(data["moduleA"]), "B count", len(data["moduleB"]))
