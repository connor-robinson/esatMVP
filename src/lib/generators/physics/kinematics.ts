/**
 * Kinematics generator
 * Levels:
 * 1 - Basic speed/distance/time (merge speed_basic logic)
 * 2 - Acceleration and velocity
 * 3 - SUVAT equations (merge suvat_solve logic)
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick, randomInt } from "../utils/random";
import { gcd, reduceFraction } from "../utils/math";
import { createAnswerChecker } from "@/lib/answer-checker";

export function generateKinematics(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  if (level === 1) return generateSpeedDistanceTime();
  if (level === 2) return generateAccelerationVelocity();
  return generateSuvat();
}

function generateSpeedDistanceTime(): GeneratedQuestion {
  const questionType = Math.random() < 0.75 ? "numeric" : "formula";
  
  if (questionType === "formula") {
    const target = pick(["speed", "distance", "time"]);
    let prompt: string, expected: string;
    
    if (target === "speed") {
      prompt = "$v = ?$";
      expected = "$s/t$";
    } else if (target === "distance") {
      prompt = "$s = ?$";
      expected = "$v \\times t$";
    } else {
      prompt = "$t = ?$";
      expected = "$s/v$";
    }
    
    const checker = createAnswerChecker({
      correctAnswer: expected,
      customChecker: (user: string) => {
        const u = user.trim().toLowerCase().replace(/\s+/g, "");
        const ok = new Set(
          expected === "$v \\times t$"
            ? ["vt", "v*t", "t*v", "v×t", "t×v", "$v \\times t$", "$v \\cdot t$"]
            : expected === "$s/t$"
            ? ["s/t", "s÷t", "$s/t$", "$s \\div t$"]
            : ["s/v", "s÷v", "$s/v$", "$s \\div v$"]
        );
        return ok.has(u);
      },
    });
    
    return {
      id: generateId(),
      topicId: "kinematics",
      question: prompt,
      answer: expected,
      difficulty: 1,
      checker,
    };
  }
  
  // Numeric mode
  const target = pick(["speed", "distance", "time"]);
  const v0 = randomInt(3, 18);
  const t0 = randomInt(3, 18);
  const s0 = v0 * t0;
  
  const fractiony = Math.random() < 0.25;
  let shownV: number | undefined, shownS: number | undefined, shownT: number | undefined;
  
  if (target === "speed") {
    if (!fractiony) {
      shownS = s0;
      shownT = t0;
    } else {
      const q = randomInt(2, 9);
      const p = q * randomInt(2, 12) + randomInt(1, q - 1);
      const g = gcd(p, q);
      const scaledS = (p / g) * randomInt(2, 9);
      const scaledT = (q / g) * randomInt(2, 9);
      shownS = scaledS;
      shownT = scaledT;
    }
  } else if (target === "distance") {
    if (!fractiony) {
      shownV = v0;
      shownT = t0;
    } else {
      const b = randomInt(2, 9);
      const a = randomInt(1, b - 1) + b * randomInt(1, 4);
      const g = gcd(a, b);
      const aa = a / g;
      const bb = b / g;
      shownV = v0 * aa;
      shownT = bb;
    }
  } else {
    if (!fractiony) {
      shownS = s0;
      shownV = v0;
    } else {
      const q = randomInt(2, 9);
      const p = q * randomInt(2, 12) + randomInt(1, q - 1);
      const g = gcd(p, q);
      const aa = p / g;
      const bb = q / g;
      const k = randomInt(2, 9);
      shownS = aa * k;
      shownV = bb * k;
    }
  }
  
  if (target === "speed") {
    shownS ??= s0;
    shownT ??= t0;
  } else if (target === "distance") {
    shownV ??= v0;
    shownT ??= t0;
  } else {
    shownS ??= s0;
    shownV ??= v0;
  }
  
  let prompt: string, canonicalAnswer: string;
  if (target === "speed") {
    prompt = `If distance = $${shownS}$ and time = $${shownT}$, what is speed?`;
    const val = shownS! / shownT!;
    const [P, Q] = reduceFraction(shownS!, shownT!);
    canonicalAnswer = Q === 1 ? String(P) : `${P}/${Q}`;
  } else if (target === "distance") {
    prompt = `If speed = $${shownV}$ and time = $${shownT}$, what is distance?`;
    const val = shownV! * shownT!;
    canonicalAnswer = String(val);
  } else {
    prompt = `If speed = $${shownV}$ and distance = $${shownS}$, what is time?`;
    const val = shownS! / shownV!;
    const [P, Q] = reduceFraction(shownS!, shownV!);
    canonicalAnswer = Q === 1 ? String(P) : `${P}/${Q}`;
  }
  
  const checker = createAnswerChecker({
    correctAnswer: canonicalAnswer,
    acceptFractions: true,
    acceptDecimals: true,
    tolerance: 0.01,
  });
  
  return {
    id: generateId(),
    topicId: "kinematics",
    question: prompt,
    answer: canonicalAnswer,
    difficulty: 1,
    checker,
  };
}

function generateAccelerationVelocity(): GeneratedQuestion {
  const questionType = Math.random() < 0.5 ? "acceleration" : "velocity";
  
  if (questionType === "acceleration") {
    const u = randomInt(0, 15);
    const v = randomInt(u + 5, u + 25);
    const t = randomInt(2, 10);
    const a = (v - u) / t;
    
    const question = `A body accelerates from $${u}$ m/s to $${v}$ m/s in $${t}$ s. What is its acceleration (m/s²)?`;
    const answer = String(Math.round(a * 100) / 100);
    
    return {
      id: generateId(),
      topicId: "kinematics",
      question,
      answer,
      difficulty: 2,
    };
  } else {
    const disp = randomInt(20, 140);
    const t = randomInt(5, 60);
    const v = disp / t;
    
    const question = `An object has a displacement of $${disp}$ m in $${t}$ s. What is its average velocity (m/s)?`;
    const answer = String(Math.round(v * 100) / 100);
    
    return {
      id: generateId(),
      topicId: "kinematics",
      question,
      answer,
      difficulty: 2,
    };
  }
}

function generateSuvat(): GeneratedQuestion {
  const eq = pick(["s=ut+0.5at^2", "v=u+at", "v^2=u^2+2as"]);
  const u = randomInt(-5, 15);
  const a = randomInt(-4, 6);
  const t = randomInt(1, 8);
  const s = Math.round((u * t + 0.5 * a * t * t) * 100) / 100;
  const v = Math.round((u + a * t) * 100) / 100;
  
  const pickVar = pick(
    eq === "v^2=u^2+2as" ? ["v", "u", "a", "s"] : ["s", "u", "v", "a", "t"]
  );
  const known: Record<string, number> = { u, a, t, s, v };
  
  let eqDisplay: string;
  if (eq === "s=ut+0.5at^2") {
    eqDisplay = "$s = ut + \\frac{1}{2}at^2$";
  } else if (eq === "v=u+at") {
    eqDisplay = "$v = u + at$";
  } else {
    eqDisplay = "$v^2 = u^2 + 2as$";
  }
  
  const prompt = `Using ${eqDisplay}, find $${pickVar}$. Known: ${Object.entries(known)
    .filter(([k]) => k !== pickVar)
    .map(([k, v]) => `$${k} = ${v}$`)
    .join(", ")}`;
  
  let ans: number;
  if (eq === "v=u+at") {
    if (pickVar === "v") ans = v;
    else if (pickVar === "u") ans = v - a * t;
    else if (pickVar === "a") ans = (v - u) / t;
    else ans = (v - u) / a;
  } else if (eq === "s=ut+0.5at^2") {
    if (pickVar === "s") ans = s;
    else if (pickVar === "u") ans = (s - 0.5 * a * t * t) / t;
    else if (pickVar === "a") ans = (2 * (s - u * t)) / (t * t);
    else ans = t;
  } else {
    if (pickVar === "v")
      ans = Math.sign(u + a) * Math.sqrt(Math.max(0, u * u + 2 * a * s));
    else if (pickVar === "u") ans = Math.sqrt(Math.max(0, v * v - 2 * a * s));
    else if (pickVar === "a") ans = (v * v - u * u) / (2 * s || 1);
    else ans = (v * v - u * u) / (2 * a || 1);
  }
  
  const answer = Number.isFinite(ans) ? String(Math.round(ans * 100) / 100) : "";
  
  const checker = createAnswerChecker({
    correctAnswer: answer,
    acceptDecimals: true,
    tolerance: 0.01,
  });
  
  return {
    id: generateId(),
    topicId: "kinematics",
    question: prompt,
    answer,
    difficulty: 3,
    checker,
  };
}
