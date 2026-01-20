/**
 * Forces & Motion generator
 * Levels:
 * 1 - Newton's laws and force calculations
 * 2 - Momentum and impulse
 * 3 - Kinetic and potential energy
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick, randomInt } from "../utils/random";
import { createAnswerChecker } from "@/lib/answer-checker";

export function generateForcesMotion(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  if (level === 1) return generateNewtonsLaws();
  if (level === 2) return generateMomentum();
  return generateEnergy();
}

function generateNewtonsLaws(): GeneratedQuestion {
  const questionType = pick(["force", "mass", "acceleration"]);
  
  if (questionType === "force") {
    const m = randomInt(2, 20);
    const a = randomInt(2, 10);
    const F = m * a;
    
    const question = `A mass of $${m}$ kg accelerates at $${a}$ m/s². What is the force (N)?`;
    const answer = String(F);
    
    return {
      id: generateId(),
      topicId: "forces_motion",
      question,
      answer,
      difficulty: 1,
    };
  } else if (questionType === "mass") {
    const F = randomInt(10, 100);
    const a = randomInt(2, 10);
    const m = F / a;
    
    const question = `A force of $${F}$ N causes an acceleration of $${a}$ m/s². What is the mass (kg)?`;
    const answer = String(Math.round(m * 100) / 100);
    
    return {
      id: generateId(),
      topicId: "forces_motion",
      question,
      answer,
      difficulty: 1,
    };
  } else {
    const F = randomInt(10, 100);
    const m = randomInt(2, 20);
    const a = F / m;
    
    const question = `A force of $${F}$ N acts on a mass of $${m}$ kg. What is the acceleration (m/s²)?`;
    const answer = String(Math.round(a * 100) / 100);
    
    return {
      id: generateId(),
      topicId: "forces_motion",
      question,
      answer,
      difficulty: 1,
    };
  }
}

function generateMomentum(): GeneratedQuestion {
  const questionType = pick(["momentum", "impulse"]);
  
  if (questionType === "momentum") {
    const m = randomInt(2, 20);
    const v = randomInt(5, 30);
    const p = m * v;
    
    const question = `A mass of $${m}$ kg moves at $${v}$ m/s. What is its momentum (kg·m/s)?`;
    const answer = String(p);
    
    return {
      id: generateId(),
      topicId: "forces_motion",
      question,
      answer,
      difficulty: 2,
    };
  } else {
    const F = randomInt(10, 50);
    const t = randomInt(1, 10);
    const I = F * t;
    
    const question = `A force of $${F}$ N acts for $${t}$ s. What is the impulse (N·s)?`;
    const answer = String(I);
    
    return {
      id: generateId(),
      topicId: "forces_motion",
      question,
      answer,
      difficulty: 2,
    };
  }
}

function generateEnergy(): GeneratedQuestion {
  const questionType = pick(["kinetic", "potential"]);
  
  if (questionType === "kinetic") {
    const m = randomInt(2, 20);
    const v = randomInt(5, 30);
    const KE = 0.5 * m * v * v;
    
    const question = `A mass of $${m}$ kg moves at $${v}$ m/s. What is its kinetic energy (J)?`;
    const answer = String(Math.round(KE * 100) / 100);
    
    return {
      id: generateId(),
      topicId: "forces_motion",
      question,
      answer,
      difficulty: 3,
    };
  } else {
    const m = randomInt(2, 20);
    const h = randomInt(5, 50);
    const g = 10; // Use g = 10 m/s² for simplicity
    const PE = m * g * h;
    
    const question = `A mass of $${m}$ kg is at a height of $${h}$ m. What is its potential energy (J)? (Use $g = 10$ m/s²)`;
    const answer = String(PE);
    
    return {
      id: generateId(),
      topicId: "forces_motion",
      question,
      answer,
      difficulty: 3,
    };
  }
}



























