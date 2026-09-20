/**
 * Apply ESAT Math 2 mock replacements from the cursor prompt.
 * - In-place content updates for replace actions (preserve question IDs)
 * - Insert new question + slot for Mock C Q17 (currently missing)
 *
 *   npx tsx scripts/apply-math2-replacements.ts
 *   npx tsx scripts/apply-math2-replacements.ts --apply
 */
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getMockWithSlots } from "../src/lib/mockBuilder/server";

function loadEnv() {
  for (const line of fs
    .readFileSync(path.resolve(".env.local"), "utf8")
    .split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv();

const MOCKS: Record<string, string> = {
  A: "8ec78191-50dd-42f9-85e4-74a4d57aa821",
  B: "c582a54e-ff64-412f-9959-d6e47d4e91c7",
  C: "c4800180-7ab8-41aa-ac45-3b7d6ea49abc",
  D: "d1e3c628-7702-4216-859a-f87a6c03a4be",
  E: "7ba0b43a-5624-4e1b-96c8-32ef98b9bab4",
};

type Replacement = {
  mock: string;
  questionNumber: number;
  action: "replace" | "insert";
  specTopic: string;
  primaryTag: string;
  replacementReason: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  estimatedTimeSeconds: number;
  stem: string;
  options: Record<string, string>;
  correctAnswer: string;
  solution: string;
};

function unescapeStem(s: string): string {
  // Prompt JSON used \\n for newlines inside a TS/JSON string dump.
  return s.replace(/\\n/g, "\n");
}

const REPLACEMENTS: Replacement[] = [
  {
    mock: "A",
    questionNumber: 4,
    action: "replace",
    specTopic: "MM7.5 - Trapezium rule",
    primaryTag: "MM7",
    replacementReason: "Trig integration → trapezium rule + curvature",
    difficulty: 3,
    estimatedTimeSeconds: 75,
    stem: `The table gives values of a function $f$.

$$
\\begin{array}{c|cccc}
x & 0 & 1 & 2 & 3 \\\\
\\hline
f(x) & 2 & 3 & 6 & 11
\\end{array}
$$

It is also known that $f''(x)>0$ for $0<x<3$. The trapezium rule with these four ordinates is used to estimate $$\\int_0^3 f(x)\\,dx.$$ Which statement is correct?`,
    options: {
      A: "$15$, underestimate",
      B: "$15$, overestimate",
      C: "$\\frac{31}{2}$, underestimate",
      D: "$\\frac{31}{2}$, overestimate",
      E: "$16$, underestimate",
      F: "$16$, overestimate",
    },
    correctAnswer: "D",
    solution:
      "The trapezium-rule estimate is $\\frac12[2+11+2(3+6)]=\\frac{31}{2}$. Since $f''(x)>0$, the curve is convex, so the straight-line chords lie above the curve and the trapezium rule gives an overestimate.",
  },
  {
    mock: "B",
    questionNumber: 9,
    action: "replace",
    specTopic: "MM4.1 - Sine rule and ambiguous case",
    primaryTag: "MM4",
    replacementReason: "Cotangent double-angle → ambiguous sine rule",
    difficulty: 4,
    estimatedTimeSeconds: 100,
    stem: "In triangle $ABC$, $$\\angle A=30^\\circ,\\qquad BC=4,\\qquad CA=4\\sqrt{3}.$$ What is the sum of the areas of all possible non-congruent triangles $ABC$ satisfying these conditions?",
    options: {
      A: "$4\\sqrt{3}$",
      B: "$8\\sqrt{3}$",
      C: "$12\\sqrt{3}$",
      D: "$16\\sqrt{3}$",
      E: "$20\\sqrt{3}$",
    },
    correctAnswer: "C",
    solution:
      "Using the sine rule, $\\sin B=\\frac{4\\sqrt3\\sin30^\\circ}{4}=\\frac{\\sqrt3}{2}$, so $B=60^\\circ$ or $120^\\circ$. Hence $C=90^\\circ$ or $30^\\circ$. The corresponding areas are $8\\sqrt3$ and $4\\sqrt3$, giving a total of $12\\sqrt3$.",
  },
  {
    mock: "B",
    questionNumber: 23,
    action: "replace",
    specTopic: "MM8.2 - Transformations of functions",
    primaryTag: "MM8",
    replacementReason: "Reduce S_∞ repetition; graph transformations",
    difficulty: 3,
    estimatedTimeSeconds: 70,
    stem: "The graph of $y=f(x)$ has exactly three $x$-intercepts: $$-4,\\qquad 2,\\qquad 8.$$ A new function is defined by $$g(x)=3f(2x-4).$$ What is the sum of the $x$-coordinates of the $x$-intercepts of $y=g(x)$?",
    options: {
      A: "$1$",
      B: "$3$",
      C: "$5$",
      D: "$7$",
      E: "$9$",
      F: "$11$",
    },
    correctAnswer: "E",
    solution:
      "The factor 3 does not affect the roots. Set $2x-4$ equal to each original root: $-4,2,8$. This gives new roots $0,3,6$, whose sum is $9$.",
  },
  {
    mock: "C",
    questionNumber: 17,
    action: "insert",
    specTopic: "MM6.1 / MM6.3 - Stationary points and derivative reasoning",
    primaryTag: "MM6",
    replacementReason: "Fill missing Q17 with calculus reasoning",
    difficulty: 3,
    estimatedTimeSeconds: 70,
    stem: "A cubic polynomial $f$ satisfies $$f'(x)=3(x-1)(x-3).$$ Which statement must be true?",
    options: {
      A: "$f(1)>f(3)$",
      B: "$f(1)<f(3)$",
      C: "$f(1)=f(3)$",
      D: "$f$ has a local minimum at $x=1$",
      E: "$f$ has no local maximum",
      F: "None of the above",
    },
    correctAnswer: "A",
    solution:
      "For $1<x<3$, $(x-1)>0$ and $(x-3)<0$, so $f'(x)<0$. Therefore $f$ decreases throughout the interval from $1$ to $3$, so $f(1)>f(3)$. Equivalently, $f''(x)=6x-12$ confirms a local maximum at $x=1$ and a local minimum at $x=3$.",
  },
  {
    mock: "C",
    questionNumber: 18,
    action: "replace",
    specTopic: "MM2.3 - Finite geometric series",
    primaryTag: "MM2",
    replacementReason: "Broken Q18 → finite GP",
    difficulty: 4,
    estimatedTimeSeconds: 85,
    stem: "The first five terms of a geometric progression are all positive. The sum of the first three terms is $7$. The sum of the final three terms is $28$. What is the sum of all five terms?",
    options: {
      A: "$21$",
      B: "$28$",
      C: "$31$",
      D: "$35$",
      E: "$42$",
      F: "$49$",
    },
    correctAnswer: "C",
    solution:
      "If the first three terms sum to $7$, the final three terms sum to $7r^2$. Hence $7r^2=28$, so $r^2=4$. Since all terms are positive, $r=2$. Therefore the terms are $1,2,4,8,16$, and their sum is $31$.",
  },
  {
    mock: "C",
    questionNumber: 24,
    action: "replace",
    specTopic: "MM7.6 - Differential equations of the form dy/dx = f(x)",
    primaryTag: "MM7",
    replacementReason: "Trig integration → polynomial DE",
    difficulty: 4,
    estimatedTimeSeconds: 105,
    stem: "A curve satisfies $$\\frac{dy}{dx}=6x^2-30x+24.$$ The curve has two stationary points. What is the vertical distance between these stationary points?",
    options: {
      A: "$9$",
      B: "$18$",
      C: "$21$",
      D: "$24$",
      E: "$27$",
      F: "$30$",
    },
    correctAnswer: "E",
    solution:
      "Stationary points occur when $6(x-1)(x-4)=0$, so $x=1$ and $x=4$. Integrating gives $y=2x^3-15x^2+24x+C$. At $x=1$ this is $11+C$ and at $x=4$ it is $-16+C$, so the vertical distance is $27$.",
  },
  {
    mock: "D",
    questionNumber: 17,
    action: "replace",
    specTopic: "MM2.1 - Recurrence relations",
    primaryTag: "MM2",
    replacementReason: "Log summation → short recurrence",
    difficulty: 3,
    estimatedTimeSeconds: 65,
    stem: "A sequence is defined by $$u_1=2,\\qquad u_{n+1}=\\frac{1}{1-u_n}.$$ What is the value of $u_{2026}$?",
    options: {
      A: "$-2$",
      B: "$-1$",
      C: "$-\\frac12$",
      D: "$\\frac12$",
      E: "$2$",
    },
    correctAnswer: "E",
    solution:
      "The sequence begins $2,-1,\\frac12,2,-1,\\frac12,\\ldots$, so it has period 3. Since $2026\\equiv1\\pmod3$, $u_{2026}=2$.",
  },
  {
    mock: "D",
    questionNumber: 23,
    action: "replace",
    specTopic: "MM8.2 - Function composition",
    primaryTag: "MM8",
    replacementReason: "Over-elaborate → concise composition",
    difficulty: 3,
    estimatedTimeSeconds: 80,
    stem: "Functions $f$ and $g$ are defined by $$f(x)=x^2-1,\\qquad g(x)=2x+1.$$ The equation $$f(g(x))=g(f(x))$$ has two real solutions $p$ and $q$. What is the value of $p+q$?",
    options: {
      A: "$-4$",
      B: "$-2$",
      C: "$-1$",
      D: "$1$",
      E: "$2$",
    },
    correctAnswer: "B",
    solution:
      "$f(g(x))=(2x+1)^2-1=4x^2+4x$, while $g(f(x))=2(x^2-1)+1=2x^2-1$. Hence $2x^2+4x+1=0$. The sum of its roots is $-4/2=-2$.",
  },
  {
    mock: "E",
    questionNumber: 1,
    action: "replace",
    specTopic: "MM6.3 - Normal to a curve",
    primaryTag: "MM6",
    replacementReason: "Integrating ln x → normals",
    difficulty: 4,
    estimatedTimeSeconds: 95,
    stem: "The point $P$ on the curve $$y=x^3-3x$$ has $x$-coordinate $2$. The tangent at $P$ meets the $y$-axis at $R$, and the normal at $P$ meets the $x$-axis at $Q$. What is the area of triangle $OQR$, where $O$ is the origin?",
    options: {
      A: "$80$",
      B: "$128$",
      C: "$144$",
      D: "$160$",
      E: "$180$",
      F: "$320$",
    },
    correctAnswer: "D",
    solution:
      "At $x=2$, $P=(2,2)$. The tangent gradient is $3(2)^2-3=9$, so the tangent is $y=9x-16$ and $R=(0,-16)$. The normal has gradient $-1/9$, so $y-2=-\\frac19(x-2)$. Setting $y=0$ gives $Q=(20,0)$. Therefore the area is $\\frac12(20)(16)=160$.",
  },
];

function difficultyLabel(d: number): "Easy" | "Medium" | "Hard" {
  if (d <= 2) return "Easy";
  if (d <= 3) return "Medium";
  return "Hard";
}

function contentPatch(r: Replacement) {
  return {
    question_stem: r.stem,
    options: r.options,
    correct_option: r.correctAnswer,
    solution_reasoning: r.solution,
    solution_key_insight: r.specTopic,
    primary_tag: r.primaryTag,
    subjects: "Math 2",
    difficulty: difficultyLabel(r.difficulty),
    mock_difficulty: r.difficulty,
    estimated_time_seconds: r.estimatedTimeSeconds,
    reasoning_type: "algebraic_manipulation",
    presentation_type: "text",
    has_visual: false,
    visual_type: "none",
    mock_eligible: true,
    practice_eligible: false,
    status: "approved",
    updated_at: new Date().toISOString(),
  };
}

async function updateQuestion(
  service: SupabaseClient,
  questionId: string,
  r: Replacement,
): Promise<void> {
  const { error } = await service
    .from("ai_generated_questions")
    .update(contentPatch(r))
    .eq("id", questionId);
  if (error) throw new Error(`update ${questionId}: ${error.message}`);
}

async function insertC17(
  service: SupabaseClient,
  r: Replacement,
): Promise<string> {
  const id = randomUUID();
  const genId = `M2-manual-C17-${id.slice(0, 8)}`;
  const row = {
    id,
    generation_id: genId,
    schema_id: r.primaryTag,
    ...contentPatch(r),
    test_type: "ESAT",
    pipeline: "math2_manual_replacement",
    is_good_question: true,
    reserved_for_mock: false,
  };
  const { error } = await service.from("ai_generated_questions").insert(row);
  if (error) throw new Error(`insert question: ${error.message}`);

  const { error: slotErr } = await service.from("esat_mock_questions").insert({
    mock_id: MOCKS.C,
    question_id: id,
    position: 17,
    locked: false,
    slot_meta: {
      difficulty: r.difficulty,
      topicCode: r.primaryTag,
      estimatedTimeSeconds: r.estimatedTimeSeconds,
      reasoningType: "algebraic_manipulation",
      presentationType: "text",
      source: "math2_manual_replacement",
    },
  });
  if (slotErr) throw new Error(`insert slot C17: ${slotErr.message}`);
  return id;
}

async function validateAll(service: SupabaseClient): Promise<string[]> {
  const issues: string[] = [];
  for (const [letter, mockId] of Object.entries(MOCKS)) {
    const { slots } = await getMockWithSlots(service, mockId);
    const positions = slots.map((s) => s.position).sort((a, b) => a - b);
    if (slots.length !== 27) {
      issues.push(`${letter}: expected 27 slots, got ${slots.length}`);
    }
    for (let i = 1; i <= 27; i++) {
      if (!positions.includes(i)) issues.push(`${letter}: missing position ${i}`);
    }
    const dupPos = positions.filter((p, i) => positions.indexOf(p) !== i);
    if (dupPos.length) issues.push(`${letter}: duplicate positions ${dupPos}`);
  }

  for (const r of REPLACEMENTS) {
    const { slots } = await getMockWithSlots(service, MOCKS[r.mock]!);
    const q = slots.find((s) => s.position === r.questionNumber)?.question;
    if (!q) {
      issues.push(`${r.mock}${r.questionNumber}: missing after apply`);
      continue;
    }
    if (String(q.correctOption).toUpperCase() !== r.correctAnswer) {
      issues.push(
        `${r.mock}${r.questionNumber}: correct_option ${q.correctOption} != ${r.correctAnswer}`,
      );
    }
    if (!(q.questionStem ?? "").includes(r.stem.slice(0, 40).replace(/\n/g, ""))) {
      // soft check - stem start may differ on whitespace
      const stemFlat = (q.questionStem ?? "").replace(/\s+/g, " ");
      const wantFlat = r.stem.replace(/\s+/g, " ").slice(0, 60);
      if (!stemFlat.includes(wantFlat.slice(0, 40))) {
        issues.push(`${r.mock}${r.questionNumber}: stem content mismatch`);
      }
    }
  }
  return issues;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  console.log(apply ? "APPLY mode\n" : "DRY-RUN\n");
  const report: Array<Record<string, unknown>> = [];

  for (const r of REPLACEMENTS) {
    const label = `${r.mock}${r.questionNumber}`;
    const mockId = MOCKS[r.mock]!;
    const { slots } = await getMockWithSlots(service, mockId);
    const existing = slots.find((s) => s.position === r.questionNumber)?.question;

    console.log(`\n=== ${label} (${r.action}) — ${r.specTopic} ===`);
    if (r.action === "replace") {
      if (!existing) throw new Error(`${label}: expected existing slot`);
      console.log(`  keep qid=${existing.id}`);
      console.log(`  old ans=${existing.correctOption} → ${r.correctAnswer}`);
      console.log(`  ${(existing.questionStem ?? "").replace(/\s+/g, " ").slice(0, 120)}…`);
      if (apply) {
        await updateQuestion(service, existing.id, r);
        console.log("  APPLIED update");
      }
      report.push({
        slot: label,
        action: "replace",
        questionId: existing.id,
        oldTopic: existing.topicCode,
        newTopic: r.primaryTag,
        answer: r.correctAnswer,
      });
    } else {
      if (existing) {
        console.log(`  slot already occupied by ${existing.id} — will not insert`);
        report.push({
          slot: label,
          action: "insert-skipped",
          questionId: existing.id,
        });
      } else {
        console.log("  missing slot — will insert new question");
        if (apply) {
          const id = await insertC17(service, r);
          console.log(`  APPLIED insert qid=${id}`);
          report.push({
            slot: label,
            action: "insert",
            questionId: id,
            newTopic: r.primaryTag,
            answer: r.correctAnswer,
          });
        } else {
          report.push({
            slot: label,
            action: "insert",
            newTopic: r.primaryTag,
            answer: r.correctAnswer,
          });
        }
      }
    }
  }

  if (apply) {
    const issues = await validateAll(service);
    console.log("\n=== VALIDATION ===");
    if (issues.length === 0) console.log("All checks passed.");
    else {
      for (const i of issues) console.log("FAIL:", i);
      throw new Error(`${issues.length} validation issue(s)`);
    }
  }

  const outPath = path.resolve("tmp_math_mocks", "math2_replacements_report.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ apply, report }, null, 2));
  console.log(`\nWrote ${outPath}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack || e.message : e);
  process.exit(1);
});
