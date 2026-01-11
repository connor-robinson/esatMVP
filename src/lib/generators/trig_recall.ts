/**
 * Trig ratios recall generator
 * Levels:
 * 1 - Basic angles (0°, 30°, 45°, 60°, 90°)
 * 2 - Extended angles (120°, 135°, 150°, 180°, etc.)
 * 3 - Radian equivalents
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick } from "./utils/random";
import { createAnswerChecker } from "@/lib/answer-checker";

function buildTrigChecker(answer: string) {
  const acceptableAnswers = [answer];
  
  // Add common variations
  if (answer.includes("sqrt")) {
    acceptableAnswers.push(answer.replace(/sqrt\(/g, "√"));
    acceptableAnswers.push(answer.replace(/sqrt\(/g, "√").replace(/\)/g, ""));
  }
  if (answer.includes("/")) {
    acceptableAnswers.push(answer.replace(/\//g, "÷"));
  }

  const checker = createAnswerChecker({
    correctAnswer: answer,
    acceptFractions: true,
    acceptableAnswers,
    customChecker: (user: string) => {
      const u = user.trim().toLowerCase().replace(/\s+/g, "");
      const a = answer.trim().toLowerCase().replace(/\s+/g, "");
      return u === a || acceptableAnswers.some((ans) => 
        ans.trim().toLowerCase().replace(/\s+/g, "") === u
      );
    },
  });

  return { checker, acceptableAnswers };
}

export function generateTrigRecall(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  if (level === 1) return generateBasicAngles();
  if (level === 2) return generateExtendedAngles();
  return generateRadians();
}

function generateBasicAngles(): GeneratedQuestion {
  const angle = pick([0, 30, 45, 60, 90]);
  const f = pick(["sin", "cos", "tan"]);

  const table: Record<string, Record<number, string>> = {
    sin: {
      0: "0",
      30: "1/2",
      45: "sqrt(2)/2",
      60: "sqrt(3)/2",
      90: "1",
    },
    cos: {
      0: "1",
      30: "sqrt(3)/2",
      45: "sqrt(2)/2",
      60: "1/2",
      90: "0",
    },
    tan: {
      0: "0",
      30: "sqrt(3)/3",
      45: "1",
      60: "sqrt(3)",
      90: "undef",
    },
  };

  const answer = table[f][angle];
  const { checker, acceptableAnswers } = buildTrigChecker(answer);

  return {
    id: generateId(),
    topicId: "trig_recall",
    question: `$${f}(${angle}°)$`,
    answer,
    difficulty: 1,
    checker,
    acceptableAnswers,
  };
}

function generateExtendedAngles(): GeneratedQuestion {
  const angle = pick([
    120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330,
  ]);
  const f = pick(["sin", "cos", "tan"]);

  const table: Record<string, Record<number, string>> = {
    sin: {
      120: "sqrt(3)/2",
      135: "sqrt(2)/2",
      150: "1/2",
      180: "0",
      210: "-1/2",
      225: "-sqrt(2)/2",
      240: "-sqrt(3)/2",
      270: "-1",
      300: "-sqrt(3)/2",
      315: "-sqrt(2)/2",
      330: "-1/2",
    },
    cos: {
      120: "-1/2",
      135: "-sqrt(2)/2",
      150: "-sqrt(3)/2",
      180: "-1",
      210: "-sqrt(3)/2",
      225: "-sqrt(2)/2",
      240: "-1/2",
      270: "0",
      300: "1/2",
      315: "sqrt(2)/2",
      330: "sqrt(3)/2",
    },
    tan: {
      120: "-sqrt(3)",
      135: "-1",
      150: "-sqrt(3)/3",
      180: "0",
      210: "sqrt(3)/3",
      225: "1",
      240: "sqrt(3)",
      270: "undef",
      300: "-sqrt(3)",
      315: "-1",
      330: "-sqrt(3)/3",
    },
  };

  const answer = table[f][angle];
  const { checker, acceptableAnswers } = buildTrigChecker(answer);

  return {
    id: generateId(),
    topicId: "trig_recall",
    question: `$${f}(${angle}°)$`,
    answer,
    difficulty: 2,
    checker,
    acceptableAnswers,
  };
}

function generateRadians(): GeneratedQuestion {
  const angles = [
    { txt: "π/6", val: "pi/6" },
    { txt: "π/4", val: "pi/4" },
    { txt: "π/3", val: "pi/3" },
    { txt: "π/2", val: "pi/2" },
    { txt: "2π/3", val: "2pi/3" },
    { txt: "3π/4", val: "3pi/4" },
    { txt: "5π/6", val: "5pi/6" },
    { txt: "π", val: "pi" },
    { txt: "7π/6", val: "7pi/6" },
    { txt: "5π/4", val: "5pi/4" },
    { txt: "4π/3", val: "4pi/3" },
    { txt: "3π/2", val: "3pi/2" },
    { txt: "5π/3", val: "5pi/3" },
    { txt: "7π/4", val: "7pi/4" },
    { txt: "11π/6", val: "11pi/6" },
    { txt: "2π", val: "2pi" },
  ];
  const A = pick(angles);
  const f = pick(["sin", "cos", "tan"]);

  const table: Record<string, Record<string, string>> = {
    sin: {
      "pi/6": "1/2",
      "pi/4": "sqrt(2)/2",
      "pi/3": "sqrt(3)/2",
      "pi/2": "1",
      "2pi/3": "sqrt(3)/2",
      "3pi/4": "sqrt(2)/2",
      "5pi/6": "1/2",
      "pi": "0",
      "7pi/6": "-1/2",
      "5pi/4": "-sqrt(2)/2",
      "4pi/3": "-sqrt(3)/2",
      "3pi/2": "-1",
      "5pi/3": "-sqrt(3)/2",
      "7pi/4": "-sqrt(2)/2",
      "11pi/6": "-1/2",
      "2pi": "0",
    },
    cos: {
      "pi/6": "sqrt(3)/2",
      "pi/4": "sqrt(2)/2",
      "pi/3": "1/2",
      "pi/2": "0",
      "2pi/3": "-1/2",
      "3pi/4": "-sqrt(2)/2",
      "5pi/6": "-sqrt(3)/2",
      "pi": "-1",
      "7pi/6": "-sqrt(3)/2",
      "5pi/4": "-sqrt(2)/2",
      "4pi/3": "-1/2",
      "3pi/2": "0",
      "5pi/3": "1/2",
      "7pi/4": "sqrt(2)/2",
      "11pi/6": "sqrt(3)/2",
      "2pi": "1",
    },
    tan: {
      "pi/6": "sqrt(3)/3",
      "pi/4": "1",
      "pi/3": "sqrt(3)",
      "pi/2": "undef",
      "2pi/3": "-sqrt(3)",
      "3pi/4": "-1",
      "5pi/6": "-sqrt(3)/3",
      "pi": "0",
      "7pi/6": "sqrt(3)/3",
      "5pi/4": "1",
      "4pi/3": "sqrt(3)",
      "3pi/2": "undef",
      "5pi/3": "-sqrt(3)",
      "7pi/4": "-1",
      "11pi/6": "-sqrt(3)/3",
      "2pi": "0",
    },
  };

  const answer = table[f][A.val];
  const { checker, acceptableAnswers } = buildTrigChecker(answer);

  return {
    id: generateId(),
    topicId: "trig_recall",
    question: `$${f}(${A.txt})$`,
    answer,
    difficulty: 3,
    checker,
    acceptableAnswers,
  };
}






















