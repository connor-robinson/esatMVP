/**
 * Import validated ESAT Maths 1 / Maths 2 Cursor bundles into
 * src/data/esatCampMocks question files and public diagram assets.
 *
 * Usage: node scripts/import_esat_math_cursor_bundles.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const M1_JSON = path.join(
  ROOT,
  "tmp_math_mocks/m1_bundle/ESAT_Maths1_Cursor_Bundle/data/esat-maths1-practice.json",
);
const M2_JSON = path.join(
  ROOT,
  "tmp_math_mocks/m2_bundle/ESAT_M2_Cursor_Bundle/data/questions.json",
);
const M1_DIAGRAMS = path.join(
  ROOT,
  "tmp_math_mocks/m1_bundle/ESAT_Maths1_Cursor_Bundle/public/esat/maths1-practice",
);
const M2_PNG = path.join(
  ROOT,
  "tmp_math_mocks/m2_bundle/ESAT_M2_Cursor_Bundle/public/diagrams/png",
);
const M2_SVG = path.join(
  ROOT,
  "tmp_math_mocks/m2_bundle/ESAT_M2_Cursor_Bundle/public/diagrams/svg",
);
const OUT_DIAGRAMS = path.join(ROOT, "public/esat-camp-mocks/diagrams");

const DIFFICULTY = {
  easy: "1/4 Easy",
  medium: "2/4 Medium",
  hard: "3/4 Hard",
};

function escapeTsString(value) {
  return JSON.stringify(value ?? "");
}

function looksLikeBareProse(mathContent) {
  const stripped = String(mathContent || "")
    .replace(/^\\\(|\\\)$/g, "")
    .replace(/^\\\[|\\\]$/g, "")
    .trim();
  if (!stripped) return true;
  // Bundle sometimes wraps whole English prompts as display math.
  if (
    /^(What|Which|Find|Calculate|Determine|How|Evaluate|Simplify|Solve|Show|Prove|State|Write|Give|For)\b/i.test(
      stripped,
    )
  ) {
    return true;
  }
  // Real TeX almost always has a backslash command.
  if (/\\[a-zA-Z]+/.test(stripped)) return false;
  if (/[=<>^_{}]/.test(stripped) && /[0-9a-zA-Z]/.test(stripped) && !/\s{2,}|[?]/.test(stripped)) {
    return false;
  }
  return /[?]/.test(stripped) || /^[A-Za-z]/.test(stripped);
}

function unwrapMathDelimiters(content) {
  return String(content || "")
    .replace(/^\\\[|\\\]$/g, "")
    .replace(/^\\\(|\\\)$/g, "")
    .trim();
}

function joinM2Stem(stem) {
  const parts = [];
  for (const segment of stem || []) {
    const content = String(segment.content || "").trim();
    if (!content) continue;
    if (segment.type === "math") {
      if (looksLikeBareProse(content)) {
        parts.push(unwrapMathDelimiters(content));
      } else if (/^\\\(|^\\\[/.test(content)) {
        parts.push(content);
      } else {
        parts.push(`\\(${content}\\)`);
      }
    } else {
      parts.push(content);
    }
  }
  return parts.join("\n\n");
}

function optionTexOrText(option) {
  if (option.tex && String(option.tex).trim()) return String(option.tex).trim();
  if (option.content && String(option.content).trim()) return String(option.content).trim();
  return String(option.text || "").trim();
}

function formatSeconds(seconds) {
  return `${seconds} s`;
}

function writeQuestionsFile({
  exportName,
  comment,
  questions,
}) {
  const lines = [
    `import type { EsatCampMockQuestion } from "./types";`,
    ``,
    `/** ${comment} */`,
    `export const ${exportName}: EsatCampMockQuestion[] = [`,
  ];

  for (const q of questions) {
    lines.push(`  {`);
    lines.push(`    number: ${q.number},`);
    lines.push(`    stem: ${escapeTsString(q.stem)},`);
    lines.push(`    options: {`);
    for (const [letter, text] of Object.entries(q.options)) {
      lines.push(`      ${letter}: ${escapeTsString(text)},`);
    }
    lines.push(`    },`);
    lines.push(`    answer: ${escapeTsString(q.answer)},`);
    lines.push(`    answerText: ${escapeTsString(q.answerText)},`);
    lines.push(`    topicCode: ${escapeTsString(q.topicCode)},`);
    lines.push(`    topicName: ${escapeTsString(q.topicName)},`);
    lines.push(`    difficulty: ${escapeTsString(q.difficulty)},`);
    lines.push(`    targetSeconds: ${q.targetSeconds},`);
    lines.push(`    targetDisplay: ${escapeTsString(q.targetDisplay)},`);
    lines.push(`    tip: ${escapeTsString(q.tip)},`);
    lines.push(`    solution: ${escapeTsString(q.solution)},`);
    lines.push(`    distractors: {`);
    for (const [letter, text] of Object.entries(q.distractors)) {
      lines.push(`      ${letter}: ${escapeTsString(text)},`);
    }
    lines.push(`    },`);
    lines.push(`    benchmarkNote: ${escapeTsString(q.benchmarkNote)},`);
    lines.push(`    editorPick: ${q.editorPick ? "true" : "false"},`);
    if (q.diagramKey) {
      lines.push(`    diagramKey: ${escapeTsString(q.diagramKey)},`);
      if (q.diagramAlt) {
        lines.push(`    diagramAlt: ${escapeTsString(q.diagramAlt)},`);
      }
      if (q.diagramNotToScale) {
        lines.push(`    diagramNotToScale: true,`);
      }
    }
    lines.push(`  },`);
  }

  lines.push(`];`);
  lines.push(``);
  return lines.join("\n");
}

function convertM1Module(module, mockSlot) {
  // mockSlot 2 => maths1_mock_02 (Full Mock 2 Math 1), 3 => maths1_mock_03 (Math 1 Mock 1)
  const prefix = mockSlot === 2 ? "m1-2" : "m1-3";
  return module.questions.map((q) => {
    const options = {};
    const distractors = {};
    for (const opt of q.options) {
      options[opt.id] = opt.content;
      if (opt.id !== q.correctOption && opt.distractorReason) {
        distractors[opt.id] = opt.distractorReason;
      }
    }
    const correct = q.options.find((o) => o.id === q.correctOption);
    const out = {
      number: q.number,
      stem: q.content,
      options,
      answer: q.correctOption,
      answerText: correct?.content ?? options[q.correctOption],
      topicCode: q.syllabus.code,
      topicName: q.syllabus.topic,
      difficulty: DIFFICULTY[q.difficulty] ?? `2/4 Medium`,
      targetSeconds: q.estimatedSeconds,
      targetDisplay: formatSeconds(q.estimatedSeconds),
      tip: q.authorNotes.tip,
      solution: q.authorNotes.solution,
      distractors,
      benchmarkNote: q.authorNotes.calibration,
      editorPick: Boolean(q.strongQuestion),
    };
    if (q.diagram) {
      const key = `${prefix}-q${String(q.number).padStart(2, "0")}`;
      out.diagramKey = key;
      out.diagramAlt = q.diagram.alt;
      out.diagramNotToScale = Boolean(q.diagram.notToScale);
      out._diagramSources = {
        png: path.join(M1_DIAGRAMS, path.basename(q.diagram.png)),
        svg: path.join(M1_DIAGRAMS, path.basename(q.diagram.svg)),
      };
    }
    return out;
  });
}

function convertM2Module(module, moduleNumber) {
  const prefix = `m2-${moduleNumber}`;
  return module.questions.map((q) => {
    const options = {};
    const distractors = {};
    for (const opt of q.options) {
      options[opt.id] = optionTexOrText(opt);
      const reason = q.authorNotes?.distractors?.[opt.id];
      if (opt.id !== q.correctOptionId && reason) {
        distractors[opt.id] = reason;
      }
    }
    const correct = q.options.find((o) => o.id === q.correctOptionId);
    const out = {
      number: q.questionNumber,
      stem: joinM2Stem(q.stem),
      options,
      answer: q.correctOptionId,
      answerText: optionTexOrText(correct ?? { text: options[q.correctOptionId] }),
      topicCode: q.syllabus.primaryCode,
      topicName: q.syllabus.primaryTopic,
      difficulty: DIFFICULTY[q.difficulty] ?? `2/4 Medium`,
      targetSeconds: q.estimatedSeconds,
      targetDisplay: formatSeconds(q.estimatedSeconds),
      tip: q.authorNotes.tip,
      solution: q.authorNotes.solution,
      distractors,
      benchmarkNote: q.authorNotes.calibration,
      editorPick: Boolean(q.strongQuestion),
    };
    if (q.diagram) {
      const key = `${prefix}-q${String(q.questionNumber).padStart(2, "0")}`;
      out.diagramKey = key;
      out.diagramAlt = q.diagram.alt;
      out.diagramNotToScale = Boolean(q.diagram.notToScale);
      out._diagramSources = {
        png: path.join(M2_PNG, path.basename(q.diagram.pngPath)),
        svg: path.join(M2_SVG, path.basename(q.diagram.svgPath)),
      };
    }
    return out;
  });
}

function copyDiagrams(questions) {
  fs.mkdirSync(OUT_DIAGRAMS, { recursive: true });
  const keys = [];
  for (const q of questions) {
    if (!q.diagramKey || !q._diagramSources) continue;
    keys.push(q.diagramKey);
    for (const ext of ["png", "svg"]) {
      const src = q._diagramSources[ext];
      if (!fs.existsSync(src)) {
        throw new Error(`Missing diagram source: ${src}`);
      }
      const dest = path.join(OUT_DIAGRAMS, `${q.diagramKey}.${ext}`);
      fs.copyFileSync(src, dest);
    }
    delete q._diagramSources;
  }
  return keys;
}

function main() {
  if (!fs.existsSync(M1_JSON) || !fs.existsSync(M2_JSON)) {
    throw new Error("Extract the Cursor bundles into tmp_math_mocks first.");
  }

  const m1 = JSON.parse(fs.readFileSync(M1_JSON, "utf8"));
  const m2 = JSON.parse(fs.readFileSync(M2_JSON, "utf8"));

  if (m1.modules?.length !== 2 || m2.modules?.length !== 2) {
    throw new Error("Expected two modules in each pack.");
  }

  const maths1Mock02 = convertM1Module(m1.modules[0], 2);
  const maths1Mock03 = convertM1Module(m1.modules[1], 3);
  const maths2Mock01 = convertM2Module(m2.modules[0], 1);
  const maths2Mock02 = convertM2Module(m2.modules[1], 2);

  for (const qs of [maths1Mock02, maths1Mock03, maths2Mock01, maths2Mock02]) {
    if (qs.length !== 27) throw new Error(`Expected 27 questions, got ${qs.length}`);
  }

  const diagramKeys = [
    ...copyDiagrams(maths1Mock02),
    ...copyDiagrams(maths1Mock03),
    ...copyDiagrams(maths2Mock01),
    ...copyDiagrams(maths2Mock02),
  ];

  const targets = [
    {
      file: "src/data/esatCampMocks/maths1_mock_02_questions.ts",
      exportName: "MATHS1_MOCK_02_QUESTIONS",
      comment: "ESAT Mathematics 1 practice pack, module 1 (Cursor bundle)",
      questions: maths1Mock02,
    },
    {
      file: "src/data/esatCampMocks/maths1_mock_03_questions.ts",
      exportName: "MATHS1_MOCK_03_QUESTIONS",
      comment: "ESAT Mathematics 1 practice pack, module 2 (Cursor bundle)",
      questions: maths1Mock03,
    },
    {
      file: "src/data/esatCampMocks/maths2_mock_01_questions.ts",
      exportName: "MATHS2_MOCK_01_QUESTIONS",
      comment: "ESAT Mathematics 2 practice pack, module 1 (Cursor bundle)",
      questions: maths2Mock01,
    },
    {
      file: "src/data/esatCampMocks/maths2_mock_02_questions.ts",
      exportName: "MATHS2_MOCK_02_QUESTIONS",
      comment: "ESAT Mathematics 2 practice pack, module 2 (Cursor bundle)",
      questions: maths2Mock02,
    },
  ];

  for (const target of targets) {
    const abs = path.join(ROOT, target.file);
    fs.writeFileSync(
      abs,
      writeQuestionsFile({
        exportName: target.exportName,
        comment: target.comment,
        questions: target.questions,
      }),
      "utf8",
    );
    console.log(`Wrote ${target.file}`);
  }

  console.log(`Copied ${diagramKeys.length} diagram keys to ${OUT_DIAGRAMS}`);
  console.log(JSON.stringify(diagramKeys, null, 2));
}

main();
