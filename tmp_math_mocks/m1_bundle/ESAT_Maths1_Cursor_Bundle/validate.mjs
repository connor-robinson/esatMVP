import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(root, "data", "esat-maths1-practice.json");
const pack = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const fail = (message) => { throw new Error(message); };
const balanced = (value, open, close) => value.split(open).length === value.split(close).length;

if (pack.modules.length !== 2) fail("Expected 2 modules");
const allQuestions = pack.modules.flatMap((module) => module.questions);
if (allQuestions.length !== 54) fail("Expected 54 questions");
if (new Set(allQuestions.map((q) => q.id)).size !== 54) fail("Question IDs must be unique");

for (const module of pack.modules) {
  if (module.questions.length !== 27) fail(`${module.id} must contain 27 questions`);
  if (module.timeLimitSeconds !== 2400) fail(`${module.id} must allow 40 minutes`);
  if (module.calculatorAllowed !== false) fail(`${module.id} must prohibit calculators`);
  const difficulty = Object.fromEntries(["easy", "medium", "hard"].map((d) => [d, module.questions.filter((q) => q.difficulty === d).length]));
  if (JSON.stringify(difficulty) !== JSON.stringify({ easy: 7, medium: 14, hard: 6 })) fail(`${module.id} difficulty distribution is incorrect`);
  const answers = Object.fromEntries("ABCDEFG".split("").map((letter) => [letter, module.questions.filter((q) => q.correctOption === letter).length]));
  if (JSON.stringify(answers) !== JSON.stringify({ A: 4, B: 4, C: 4, D: 4, E: 4, F: 4, G: 3 })) fail(`${module.id} answer distribution is incorrect`);
}

for (const question of allQuestions) {
  if (question.estimatedSeconds > 90) fail(`${question.id} exceeds 90 seconds`);
  if (question.options.length < 4 || question.options.length > 7) fail(`${question.id} has invalid option count`);
  const optionIds = question.options.map((option) => option.id);
  if (new Set(optionIds).size !== optionIds.length) fail(`${question.id} repeats an option ID`);
  if (!optionIds.includes(question.correctOption)) fail(`${question.id} has an invalid answer`);
  if (!balanced(question.content, "\\(", "\\)")) fail(`${question.id} has unbalanced MathJax`);
  for (const option of question.options) {
    if (!balanced(option.content, "\\(", "\\)")) fail(`${question.id}/${option.id} has unbalanced MathJax`);
    if (option.id !== question.correctOption && !option.distractorReason) fail(`${question.id}/${option.id} needs a distractor reason`);
  }
  if (question.diagram) {
    for (const field of ["svg", "png"]) {
      const asset = path.join(root, "public", question.diagram[field].replace(/^\//, ""));
      if (!fs.existsSync(asset)) fail(`${question.id} is missing ${field}`);
    }
  }
}

console.log(`PASS: ${allQuestions.length} questions validated, including ${allQuestions.filter((q) => q.diagram).length} diagrams`);
