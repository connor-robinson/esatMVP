/**
 * Electricity fundamentals generator
 * Levels:
 * 1 - Ohm's law (V = IR)
 * 2 - Series and parallel circuits
 * 3 - Electric fields and Coulomb's law
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick, randomInt } from "../utils/random";
import { createAnswerChecker } from "@/lib/answer-checker";

export function generateElectricity(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  if (level === 1) return generateOhmsLaw();
  if (level === 2) return generateCircuits();
  return generateElectricFields();
}

function generateOhmsLaw(): GeneratedQuestion {
  const questionType = Math.random() < 0.75 ? "numeric" : "formula";
  
  if (questionType === "formula") {
    const target = pick(["voltage", "current", "resistance"]);
    let prompt: string, expected: string;
    
    if (target === "voltage") {
      prompt = "$V = ?$";
      expected = "$I \\times R$";
    } else if (target === "current") {
      prompt = "$I = ?$";
      expected = "$V/R$";
    } else {
      prompt = "$R = ?$";
      expected = "$V/I$";
    }
    
    const checker = createAnswerChecker({
      correctAnswer: expected,
      customChecker: (user: string) => {
        const u = user.trim().toLowerCase().replace(/\s+/g, "").replace(/\$/g, "");
        const ok = new Set(
          expected === "$I \\times R$"
            ? ["ir", "i*r", "r*i", "i×r", "r×i", "$i \\times r$", "$i \\cdot r$"]
            : expected === "$V/R$"
            ? ["v/r", "v÷r", "$v/r$", "$\\frac{v}{r}$"]
            : ["v/i", "v÷i", "$v/i$", "$\\frac{v}{i}$"]
        );
        return ok.has(u);
      },
    });
    
    return {
      id: generateId(),
      topicId: "electricity",
      question: prompt,
      answer: expected,
      difficulty: 1,
      checker,
    };
  }
  
  // Numeric mode
  const target = pick(["voltage", "current", "resistance"]);
  const I = randomInt(2, 20);
  const R = randomInt(2, 20);
  const V = I * R;
  
  let prompt: string, answer: string;
  if (target === "voltage") {
    prompt = `If current $I = ${I}$ A and resistance $R = ${R}$ Ω, what is voltage $V$ (V)?`;
    answer = String(V);
  } else if (target === "current") {
    prompt = `If voltage $V = ${V}$ V and resistance $R = ${R}$ Ω, what is current $I$ (A)?`;
    answer = String(I);
  } else {
    prompt = `If voltage $V = ${V}$ V and current $I = ${I}$ A, what is resistance $R$ (Ω)?`;
    answer = String(R);
  }
  
  return {
    id: generateId(),
    topicId: "electricity",
    question: prompt,
    answer,
    difficulty: 1,
  };
}

function generateCircuits(): GeneratedQuestion {
  const circuitType = pick(["series", "parallel"]);
  
  if (circuitType === "series") {
    const R1 = randomInt(2, 20);
    const R2 = randomInt(2, 20);
    const R_total = R1 + R2;
    
    const question = `Two resistors in series: $R_1 = ${R1}$ Ω and $R_2 = ${R2}$ Ω. What is the total resistance $R_{total}$ (Ω)?`;
    const answer = String(R_total);
    
    return {
      id: generateId(),
      topicId: "electricity",
      question,
      answer,
      difficulty: 2,
    };
  } else {
    const R1 = randomInt(2, 20);
    const R2 = randomInt(2, 20);
    const R_total = (R1 * R2) / (R1 + R2);
    
    const question = `Two resistors in parallel: $R_1 = ${R1}$ Ω and $R_2 = ${R2}$ Ω. What is the total resistance $R_{total}$ (Ω)?`;
    const answer = String(Math.round(R_total * 100) / 100);
    
    return {
      id: generateId(),
      topicId: "electricity",
      question,
      answer,
      difficulty: 2,
    };
  }
}

function generateElectricFields(): GeneratedQuestion {
  const questionType = pick(["field-strength", "coulomb"]);
  
  if (questionType === "field-strength") {
    const F = randomInt(10, 100);
    const q = randomInt(1, 20);
    const E = F / q;
    
    const question = `An electric field exerts a force of $${F}$ N on a charge of $${q}$ C. What is the electric field strength $E$ (N/C)?`;
    const answer = String(Math.round(E * 100) / 100);
    
    return {
      id: generateId(),
      topicId: "electricity",
      question,
      answer,
      difficulty: 3,
    };
  } else {
    // Simplified Coulomb's law: F = k * q1 * q2 / r^2, use k = 9e9 for simplicity
    const q1 = randomInt(1, 10);
    const q2 = randomInt(1, 10);
    const r = randomInt(1, 5);
    const k = 9e9;
    const F = (k * q1 * q2) / (r * r);
    
    const question = `Two charges $q_1 = ${q1}$ C and $q_2 = ${q2}$ C are $${r}$ m apart. What is the force between them (N)? (Use $k = 9 \\times 10^9$ N·m²/C²)`;
    const answer = String(Math.round(F / 1e9) * 1e9); // Round to significant figures
    
    return {
      id: generateId(),
      topicId: "electricity",
      question,
      answer,
      difficulty: 3,
    };
  }
}





















