/**
 * Sync Mathematics 1 calibration v2 into the app bundle.
 *
 * Reads:
 *   math1-calibration-v2/questions.json
 * Embeds diagrams from:
 *   public/calibration/math1-v2/qXX.png  (served as /calibration/math1-v2/qXX.png)
 *
 * Writes:
 *   src/lib/calibration/math1/config.json
 *   src/lib/calibration/math1/esat_math1_calibration_v2.json (canonical copy)
 *
 * Run: npx tsx scripts/sync-calibration-config.ts
 */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, "math1-calibration-v2/questions.json");
const MATH1 = path.join(ROOT, "src/lib/calibration/math1");
const BUNDLE = path.join(MATH1, "config.json");
const CANONICAL = path.join(MATH1, "esat_math1_calibration_v2.json");
const PREVIOUS = path.join(MATH1, "esat_math1_full_calibration_test_v1_diagramsfixed.json");

const TOPIC_TO_TAG: Record<string, string> = {
  "M1 Units": "M1-M1",
  "M2 Number": "M1-M2",
  "M3 Ratio and proportion": "M1-M3",
  "M4 Algebra": "M1-M4",
  "M5 Geometry": "M1-M5",
  "M6 Statistics": "M1-M6",
  "M7 Probability": "M1-M7",
};

const DIFFICULTY_WEIGHT: Record<string, number> = {
  accessible: 1.0,
  medium: 1.4,
  difficult: 1.9,
};

const DIAGRAM_QUESTIONS = new Set([1, 3, 5, 9, 12, 13, 14, 15]);

function topicSlug(primaryTopic: string): string {
  return primaryTopic
    .replace(/^M\d\s+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function splitSolution(markdown: string): { steps: string[]; finalAnswer: string } {
  const boxed = markdown.match(/\\boxed\{([^}]+)\}/);
  const finalAnswer = boxed
    ? `\\(\\boxed{${boxed[1]}}\\)`
    : markdown.trim();
  // Keep the full worked solution as a single step for StemContent.
  return { steps: [markdown.trim()], finalAnswer };
}

function diagramFigure(position: number, altText: string): string {
  const id = String(position).padStart(2, "0");
  const src = `/calibration/math1-v2/q${id}.png`;
  const safeAlt = altText.replace(/"/g, "&quot;");
  return [
    `<figure class="qg-diagram" style="margin:0;width:100%;max-width:100%">`,
    `<img src="${src}" alt="${safeAlt}" width="1400" height="900" ` +
      `style="width:100%;height:auto;object-fit:contain;display:block" ` +
      `loading="eager" decoding="async" />`,
    `</figure>`,
  ].join("");
}

function remapEvidenceIds(
  previous: any,
  idByOrder: Map<number, string>,
): any {
  // Drop v1-specific evidence lists; rebuild topic-based evidence from the new set.
  return previous;
}

function buildPairedDiagnostics(questions: any[]): any[] {
  const byTopic = new Map<string, string[]>();
  for (const q of questions) {
    const tag = q.curriculum_tags[0];
    const list = byTopic.get(tag) ?? [];
    list.push(q.id);
    byTopic.set(tag, list);
  }

  const pairs: any[] = [];
  for (const [tag, ids] of byTopic) {
    if (ids.length < 2) continue;
    pairs.push({
      pair: [ids[0], ids[1]],
      comparison: `Same curriculum area (${tag}) across different presentations.`,
      interpretation: {
        both_correct: "Consistent on this topic across both items.",
        both_wrong: "Repeated weakness on this topic.",
        first_only: "Solved the earlier item but missed the later one on the same topic.",
        second_only: "Missed the earlier item but solved the later one on the same topic.",
      },
    });
  }
  return pairs;
}

function rebuildDiagnosticEvidence(
  diagnosticModel: any,
  questions: any[],
): any {
  const byTag = new Map<string, string[]>();
  for (const q of questions) {
    const tag = q.curriculum_tags[0] as string;
    const list = byTag.get(tag) ?? [];
    list.push(q.id);
    byTag.set(tag, list);
  }

  const allIds = questions.map((q) => q.id as string);
  const scores = diagnosticModel.scores as Record<string, any>;

  const topicSkillMap: Record<string, string> = {
    "M1-M1": "unit_reasoning",
    "M1-M2": "estimation",
    "M1-M3": "ratio_and_proportion",
    "M1-M4": "algebraic_fluency",
    "M1-M5": "geometry_and_modelling",
    "M1-M6": "statistics",
    "M1-M7": "probability",
  };

  for (const [key, cfg] of Object.entries(scores)) {
    if (!cfg || typeof cfg !== "object") continue;
    if (Array.isArray(cfg.evidence_question_ids)) {
      if (key === "knowledge" || key === "reasoning" || key === "calculation_accuracy" ||
          key === "calculation_speed" || key === "time_management" ||
          key === "consistency" || key === "confidence_calibration") {
        cfg.evidence_question_ids = allIds;
      } else if (key === "data_and_graph_skills") {
        cfg.evidence_question_ids = [
          ...(byTag.get("M1-M6") ?? []),
          ...(byTag.get("M1-M4") ?? []).filter((id: string) => id.includes("q03") || id.includes("q14")),
        ];
      } else {
        const tag = Object.entries(topicSkillMap).find(([, skill]) => skill === key)?.[0];
        cfg.evidence_question_ids = tag ? (byTag.get(tag) ?? []) : [];
      }
    }
    if (Array.isArray(cfg.paired_question_ids)) {
      cfg.paired_question_ids = buildPairedDiagnostics(questions).map((p) => p.pair);
    }
  }

  return diagnosticModel;
}

function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`Missing source: ${SOURCE}`);
    process.exit(1);
  }

  const source = JSON.parse(fs.readFileSync(SOURCE, "utf8")) as {
    assessment: any;
    questions: any[];
  };

  const previous = fs.existsSync(PREVIOUS)
    ? JSON.parse(fs.readFileSync(PREVIOUS, "utf8"))
    : null;

  const assessment = source.assessment;
  const questions = [...source.questions].sort(
    (a, b) => Number(a.position) - Number(b.position),
  );

  const mappedQuestions = questions.map((q) => {
    const tag = TOPIC_TO_TAG[q.primaryTopic];
    if (!tag) {
      throw new Error(`Unknown primaryTopic for ${q.id}: ${q.primaryTopic}`);
    }
    const { steps, finalAnswer } = splitSolution(q.solutionMarkdown);
    const position = Number(q.position);
    const altText =
      q.visualSpec?.altText ??
      `Diagram for question ${position}`;

    let diagram_svg: string | null = null;
    if (DIAGRAM_QUESTIONS.has(position)) {
      const pngPath = path.join(
        ROOT,
        "public/calibration/math1-v2",
        `q${String(position).padStart(2, "0")}.png`,
      );
      if (!fs.existsSync(pngPath)) {
        throw new Error(`Missing diagram asset: ${pngPath}`);
      }
      diagram_svg = diagramFigure(position, altText);
    }

    const distractor_analysis: Record<string, string> = {};
    for (const [opt, tags] of Object.entries(q.mistakeTagsByOption ?? {})) {
      const tagList = Array.isArray(tags) ? tags.join("; ") : String(tags);
      distractor_analysis[opt] = tagList;
    }

    const target = Number(q.targetTimeSeconds);
    return {
      id: q.id,
      order: position,
      module: "maths_1",
      curriculum_tags: [tag],
      question_type: "multiple_choice",
      question_text_markdown: q.stemMarkdown,
      diagram_svg,
      diagram_alt_text: q.visualSpec ? altText : null,
      fast_insight: q.fastInsight,
      options: q.options.map((o: { id: string; contentMarkdown: string }) => ({
        label: o.id,
        text_markdown: o.contentMarkdown,
      })),
      correct_option: q.correctOption,
      solution: {
        title: q.fastInsight || q.internalTitle || "Solution",
        steps_markdown: steps,
        final_answer_markdown: finalAnswer,
      },
      difficulty: q.difficulty,
      difficulty_weight: DIFFICULTY_WEIGHT[q.difficulty] ?? 1,
      expected_time_seconds: target,
      fast_threshold_seconds: Math.round(target * 0.55),
      slow_threshold_seconds: Math.round(target * 1.45),
      primary_topic: topicSlug(q.primaryTopic),
      secondary_topic: null,
      primary_skill: topicSlug(q.primaryTopic),
      secondary_skills: [],
      prerequisite_skills: [],
      reasoning_steps: [],
      common_error_types: Object.values(distractor_analysis),
      diagnostic_value: "standard",
      distractor_analysis,
      diagnostic_interpretation: {},
      recommended_practice_modes: ["targeted_drill", "mixed_set"],
      paired_question_id: null,
      pair_interpretation: null,
      specification_refs: q.specificationRefs ?? [],
      internal_title: q.internalTitle,
    };
  });

  // Wire simple pairs after all IDs exist.
  const pairs = buildPairedDiagnostics(mappedQuestions);
  for (const p of pairs) {
    const [a, b] = p.pair as [string, string];
    const qa = mappedQuestions.find((q) => q.id === a);
    const qb = mappedQuestions.find((q) => q.id === b);
    if (qa) {
      (qa as { paired_question_id: string | null }).paired_question_id = b;
      (qa as { pair_interpretation: string | null }).pair_interpretation = p.comparison;
    }
    if (qb) {
      (qb as { paired_question_id: string | null }).paired_question_id = a;
      (qb as { pair_interpretation: string | null }).pair_interpretation = p.comparison;
    }
  }

  const totalTarget = mappedQuestions.reduce(
    (s, q) => s + q.expected_time_seconds,
    0,
  );

  const diagnosticModel = rebuildDiagnosticEvidence(
    structuredClone(
      previous?.diagnostic_model ?? {
        scope_note:
          "Provisional diagnostic model for Mathematics 1 calibration v2. Recalibrate with empirical data.",
        difficulty_weights: {
          accessible: 1.0,
          medium: 1.4,
          difficult: 1.9,
        },
        response_time_ratio: "time_spent / expected_time_seconds",
        weighted_accuracy_formula:
          "sum(correct * difficulty_weight) / sum(attempted * difficulty_weight)",
        confidence_encoding: {
          scale: [1, 2, 3, 4, 5],
          meaning: {
            "1": "very unsure",
            "5": "very sure",
          },
        },
        scores: {
          knowledge: { evidence_question_ids: [], calculation: "weighted_accuracy", reliability: "medium" },
          reasoning: { evidence_question_ids: [], calculation: "weighted_accuracy", reliability: "medium" },
          calculation_accuracy: { evidence_question_ids: [], calculation: "weighted_accuracy", reliability: "medium" },
          calculation_speed: { evidence_question_ids: [], calculation: "pace", reliability: "medium" },
          algebraic_fluency: { evidence_question_ids: [], calculation: "weighted_accuracy", reliability: "medium" },
          ratio_and_proportion: { evidence_question_ids: [], calculation: "weighted_accuracy", reliability: "medium" },
          geometry_and_modelling: { evidence_question_ids: [], calculation: "weighted_accuracy", reliability: "medium" },
          probability: { evidence_question_ids: [], calculation: "weighted_accuracy", reliability: "medium" },
          statistics: { evidence_question_ids: [], calculation: "weighted_accuracy", reliability: "medium" },
          estimation: { evidence_question_ids: [], calculation: "weighted_accuracy", reliability: "low" },
          data_and_graph_skills: { evidence_question_ids: [], calculation: "weighted_accuracy", reliability: "low" },
          unit_reasoning: { evidence_question_ids: [], calculation: "weighted_accuracy", reliability: "medium" },
          time_management: { evidence_question_ids: [], calculation: "pace", reliability: "medium" },
          consistency: { evidence_question_ids: [], paired_question_ids: [], calculation: "pair_agreement", reliability: "medium" },
          confidence_calibration: { evidence_question_ids: [], calculation: "confidence_calibration_formula", reliability: "low" },
          physical_reasoning: { evidence_question_ids: [], calculation: null, reliability: "not_applicable" },
        },
        overall_readiness_formula:
          "0.22*knowledge + 0.23*reasoning + 0.15*calculation_accuracy + 0.10*calculation_speed + 0.10*algebraic_fluency + 0.07*ratio_and_proportion + 0.05*data_and_graph_skills + 0.05*time_management + 0.03*consistency",
        readiness_bands: previous?.diagnostic_model?.readiness_bands ?? [
          { min: 80, max: 100, label: "strongly_ready" },
          { min: 68, max: 79.99, label: "ready_with_targeted_gaps" },
          { min: 55, max: 67.99, label: "developing_readiness" },
          { min: 40, max: 54.99, label: "substantial_gaps" },
          { min: 0, max: 39.99, label: "foundational_work_needed" },
        ],
        reliability_rule: previous?.diagnostic_model?.reliability_rule ?? {
          high: "at least 4 relevant questions",
          medium: "2-3 relevant questions",
          low: "1 relevant question",
          insufficient: "0 relevant questions",
        },
        overclaiming_guardrail:
          "Never describe a low-reliability score as a stable weakness. Treat the ESAT scaled estimate as provisional.",
      },
    ),
    mappedQuestions,
  );

  const config = {
    test: {
      id: assessment.id,
      title: assessment.title,
      version: 2,
      assessment_version: assessment.version,
      module: "maths_1",
      question_count: assessment.questionCount,
      estimated_duration_minutes: Math.round(totalTarget / 60 * 10) / 10,
      recommended_time_limit_minutes: Math.round(
        (assessment.recommendedTimeSeconds ?? 1200) / 60,
      ),
      calculator_allowed: Boolean(assessment.calculatorAllowed),
      dictionary_allowed: false,
      negative_marking: false,
      option_count_policy: "fixed_6",
      difficulty_distribution: assessment.difficultyMix,
      curriculum_tags_covered: [
        "M1-M1",
        "M1-M2",
        "M1-M3",
        "M1-M4",
        "M1-M5",
        "M1-M6",
        "M1-M7",
      ],
      student_intro: assessment.studentIntro,
      instructions: assessment.instructions,
      correct_option_sequence: assessment.correctOptionSequence,
      research_design_notes: assessment.researchBasis ?? [],
      originality_statement: assessment.originalityStatement,
      questions: mappedQuestions,
    },
    paired_diagnostic_design: pairs,
    diagnostic_model: diagnosticModel,
    skill_classification_rules: previous?.skill_classification_rules ?? {
      minimum_evidence: 2,
      rules_in_priority_order: [
        {
          label: "insufficient_evidence",
          condition: "relevant_attempted_questions < 2",
        },
        {
          label: "developing",
          condition: "weighted_accuracy between 50 and 79.99",
        },
      ],
    },
    profile_classification_rules: previous?.profile_classification_rules ?? [],
    recommendation_rules: previous?.recommendation_rules ?? {
      skill_practice_catalog: {},
      diagnosis_actions: {},
      seven_day_plan_template: [],
    },
    result_page_schema: previous?.result_page_schema ?? {},
  };

  // Silence unused helper until we need order remaps from older configs.
  void remapEvidenceIds;

  fs.mkdirSync(MATH1, { recursive: true });
  const pretty = `${JSON.stringify(config, null, 2)}\n`;
  fs.writeFileSync(CANONICAL, pretty, "utf8");
  fs.writeFileSync(BUNDLE, pretty, "utf8");

  const seq = mappedQuestions.map((q) => q.correct_option).join("");
  console.log(
    `Wrote ${BUNDLE} (assessment ${assessment.version}, contentVersion ${config.test.version}).`,
  );
  console.log(`Questions: ${mappedQuestions.length}; answer key: ${seq}; target time: ${totalTarget}s.`);
  console.log(`Diagrams embedded: ${DIAGRAM_QUESTIONS.size}.`);
}

main();
