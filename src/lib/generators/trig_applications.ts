/**
 * Trig applications generator
 * Levels:
 * 1 - Evaluate trig from triangle sides
 * 2 - Special triangles (30-60-90, 45-45-90)
 * 3 - Trig identities and simplifications
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick, randomInt } from "./utils/random";
import { createAnswerChecker } from "@/lib/answer-checker";
import { generateTriangleDiagram } from "@/lib/diagrams/triangleGenerator";

export function generateTrigApplications(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  if (level === 1) return generateTriangleSides();
  if (level === 2) return generateSpecialTriangles();
  return generateIdentities();
}

function generateTriangleSides(): GeneratedQuestion {
  const triples = [
    [3, 4, 5],
    [5, 12, 13],
    [8, 15, 17],
    [7, 24, 25],
    [9, 40, 41],
  ];
  const [a, b, c] = pick(triples);
  const which = pick(["sin", "cos", "tan"]);
  
  const answers: Record<string, string> = {
    sin: `${a}/${c}`,
    cos: `${b}/${c}`,
    tan: `${a}/${b}`,
  };

  const checker = createAnswerChecker({
    correctAnswer: answers[which],
    acceptFractions: true,
    acceptableAnswers: [answers[which]],
  });

  return {
    id: generateId(),
    topicId: "trig_applications",
    question: `Right triangle with sides $${a}$-$${b}$-$${c}$. Compute $${which}(\\theta)$ for angle opposite side $${a}$.`,
    answer: answers[which],
    difficulty: 1,
    checker,
  };
}

function generateSpecialTriangles(): GeneratedQuestion {
  const type = pick(["30-60-90", "45-45-90"]);
  const mode = pick(["length", "angle"]);
  const u = randomInt(2, 20);

  const makeAns = (exactStr: string, numericVal: number) => {
    const approx = String(Math.round(numericVal * 1000) / 1000);
    return {
      exact: exactStr,
      acceptable: [
        exactStr,
        exactStr.replace("√3", "sqrt(3)").replace("√2", "sqrt(2)").replace(/\s+/g, ""),
        approx,
      ],
    };
  };

  if (type === "30-60-90") {
    const exact = { short: `${u}`, long: `${u}√3`, hyp: `${2 * u}` };
    const numeric = {
      short: u,
      long: u * Math.sqrt(3),
      hyp: 2 * u,
    };

    if (mode === "length") {
      const sides = ["short", "long", "hyp"];
      const given = pick(sides);
      const unknown = sides.find((s) => s !== given)!;

      const ans = makeAns(exact[unknown as keyof typeof exact], numeric[unknown as keyof typeof numeric]);

      let prompt = "";
      const givenKey = given as keyof typeof exact;
      if (given === "short") {
        prompt = `30-60-90 triangle: short side = $${exact[givenKey]}$, find ${unknown === "long" ? "long side" : "hypotenuse"}`;
      } else if (given === "long") {
        prompt = `30-60-90 triangle: long side = $${exact[givenKey]}$, find ${unknown === "short" ? "short side" : "hypotenuse"}`;
      } else {
        prompt = `30-60-90 triangle: hypotenuse = $${exact[givenKey]}$, find ${unknown === "short" ? "short side" : "long side"}`;
      }

      const checker = createAnswerChecker({
        correctAnswer: ans.exact,
        acceptFractions: false,
        acceptDecimals: true,
        tolerance: 0.01,
        acceptableAnswers: ans.acceptable,
      });

      // Generate diagram
      const diagram = generateTriangleDiagram({
        type: "30-60-90",
        unit: u,
        givenSide: given as "short" | "long" | "hyp",
        unknownSide: unknown as "short" | "long" | "hyp",
      });

      return {
        id: generateId(),
        topicId: "trig_applications",
        question: prompt,
        answer: ans.exact,
        difficulty: 2,
        checker,
        acceptableAnswers: ans.acceptable,
        diagram,
      };
    } else {
      const thetaAt = pick(["B", "C"]);
      const theta = thetaAt === "B" ? 30 : 60;

      const prompt = `30-60-90 triangle: short = $${exact.short}$, hyp = $${exact.hyp}$, find angle at $${thetaAt}$ (degrees)`;

      // Generate diagram - show given angles and unknown angle
      // For angle problems, we show the right angle (90°) and one other angle, then ask for the third
      const givenAngle = theta === 30 ? 60 : 30; // Show the angle that's NOT being asked for
      const diagram = generateTriangleDiagram({
        type: "30-60-90",
        unit: u,
        givenSide: "short", // Show short side as given
        givenAngle: givenAngle,
        unknownAngle: theta,
      });

      return {
        id: generateId(),
        topicId: "trig_applications",
        question: prompt,
        answer: String(theta),
        difficulty: 2,
        acceptableAnswers: [String(theta), `${theta}°`],
        diagram,
      };
    }
  } else {
    // 45-45-90
    const exact = { leg: `${u}`, hyp: `${u}√2` };
    const numeric = { leg: u, hyp: u * Math.sqrt(2) };

    if (mode === "length") {
      const sides = ["leg", "hyp"];
      const given = pick(sides);
      const unknown = sides.find((s) => s !== given)!;

      const ans = makeAns(
        unknown === "leg" ? exact.leg : exact.hyp,
        unknown === "leg" ? numeric.leg : numeric.hyp
      );

      const givenKey45 = given as keyof typeof exact;
      const prompt =
        given === "leg"
          ? `45-45-90 triangle: leg = $${exact[givenKey45]}$, find hypotenuse`
          : `45-45-90 triangle: hypotenuse = $${exact[givenKey45]}$, find leg`;

      const checker = createAnswerChecker({
        correctAnswer: ans.exact,
        acceptDecimals: true,
        tolerance: 0.01,
        acceptableAnswers: ans.acceptable,
      });

      // Generate diagram
      const diagram = generateTriangleDiagram({
        type: "45-45-90",
        unit: u,
        givenSide: given as "leg" | "hyp",
        unknownSide: unknown as "leg" | "hyp",
      });

      return {
        id: generateId(),
        topicId: "trig_applications",
        question: prompt,
        answer: ans.exact,
        difficulty: 2,
        checker,
        acceptableAnswers: ans.acceptable,
        diagram,
      };
    } else {
      const thetaAt = pick(["B", "C"]);
      const theta = 45;

      const prompt = `45-45-90 triangle: leg = $${exact.leg}$, find angle at $${thetaAt}$ (degrees)`;

      // Generate diagram - show right angle and one 45° angle, ask for the other
      const diagram = generateTriangleDiagram({
        type: "45-45-90",
        unit: u,
        givenSide: "leg",
        givenAngle: 90, // Show right angle
        unknownAngle: 45, // Ask for one of the 45° angles
      });

      return {
        id: generateId(),
        topicId: "trig_applications",
        question: prompt,
        answer: "45",
        difficulty: 2,
        acceptableAnswers: ["45", "45°"],
        diagram,
      };
    }
  }
}

function generateIdentities(): GeneratedQuestion {
  const identityType = pick(["pythagorean", "double-angle", "sum"]);
  
  if (identityType === "pythagorean") {
    const angle = pick([30, 45, 60]);
    const func = pick(["sin", "cos"]);
    const otherFunc = func === "sin" ? "cos" : "sin";
    
    const values: Record<string, Record<number, string>> = {
      sin: {
        30: "1/2",
        45: "√2/2",
        60: "√3/2",
      },
      cos: {
        30: "√3/2",
        45: "√2/2",
        60: "1/2",
      },
    };
    
    const val = values[func][angle];
    const question = `If $${func}(${angle}°) = ${val}$, use $\\sin^2(\\theta) + \\cos^2(\\theta) = 1$ to find $${otherFunc}(${angle}°)$`;
    
    // For simplicity, just ask to verify the identity holds
    const answer = "1";
    
    return {
      id: generateId(),
      topicId: "trig_applications",
      question: `Verify: $\\sin^2(${angle}°) + \\cos^2(${angle}°) = ?$`,
      answer,
      difficulty: 3,
    };
  } else if (identityType === "double-angle") {
    const angle = pick([30, 45, 60]);
    const func = pick(["sin", "cos"]);
    
    const question = `Simplify: $${func}(2 \\times ${angle}°) = ?$`;
    
    // For 2*30=60, 2*45=90, 2*60=120
    const doubleAngle = 2 * angle;
    const values: Record<string, Record<number, string>> = {
      sin: {
        60: "√3/2",
        90: "1",
        120: "√3/2",
      },
      cos: {
        60: "1/2",
        90: "0",
        120: "-1/2",
      },
    };
    
    const answer = values[func][doubleAngle] || "0";
    
    return {
      id: generateId(),
      topicId: "trig_applications",
      question,
      answer,
      difficulty: 3,
    };
  } else {
    // Sum identity: sin(A+B) or cos(A+B)
    const A = pick([30, 45]);
    const B = pick([30, 45]);
    const func = pick(["sin", "cos"]);
    
    const question = `Simplify: $${func}(${A}° + ${B}°)$`;
    
    // For simplicity, provide the sum angle value
    const sumAngle = A + B;
    const values: Record<string, Record<number, string>> = {
      sin: {
        60: "√3/2",
        75: "(√6 + √2)/4",
        90: "1",
      },
      cos: {
        60: "1/2",
        75: "(√6 - √2)/4",
        90: "0",
      },
    };
    
    const answer = values[func][sumAngle] || "0";
    
    return {
      id: generateId(),
      topicId: "trig_applications",
      question,
      answer,
      difficulty: 3,
    };
  }
}















