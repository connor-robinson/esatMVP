/**
 * Central question generator registry
 */

import { GeneratedQuestion } from "@/types/core";
import { generateAddition } from "./addition";
import { generateMultiplication } from "./multiplication";
import { generateFractions } from "./fractions";
import { generateSubtraction } from "./subtraction";
import { generateDivision } from "./division";
import { generateKinematics } from "./physics/kinematics";

// Algebra
import { generateLinearEquations } from "./linear_equations";
import { generateQuadraticEquations } from "./quadratic_equations";
import { generatePolynomials } from "./polynomials";
import { generateExponents } from "./exponents";
import { generateSystemsOfEquations } from "./systems_of_equations";

// Number Theory
import { generatePrimes } from "./primes";
import { generateFactors } from "./factors";
import { generateDivisibility } from "./divisibility";
import { generateModular } from "./modular";
import { generateSequences } from "./sequences";

// Patterns
import { generatePowers } from "./powers";
import { generateMultiplicationShortcuts } from "./multiplication_shortcuts";

// Shortcuts
import { generatePercentages } from "./percentages";
import { generateSquaring } from "./squaring";
import { generateEstimation } from "./estimation";

// Transform
import { generateFriendlyFracDecimals } from "./friendly_frac_decimals";
import { generateCommonFracToDec2dp } from "./common_frac_to_dec_2dp";
import { generateSciRewrite } from "./sci_rewrite";

// Arithmetic (continued)
import { generateSimplifyFraction } from "./simplify_fraction";
import { generateCommonMultiples } from "./common_multiples";

// Number Theory (continued)
import { generatePrimeFactorise } from "./prime_factorise";

// Test & Estimation
import { generateEstimateCommonSqrts } from "./estimate_common_sqrts";

// Identities
import { generateBinomialExpand } from "./binomial_expand";
import { generateFactoriseQuadratic } from "./factorise_quadratic";
import { generateCompleteSquare } from "./complete_square";
import { generateInequalities } from "./inequalities";
import { generateIndicesSimplify } from "./indices_simplify";
import { generateQuadraticsEval } from "./quadratics_eval";

// Trigonometry
import { generateTrigRecall } from "./trig_recall";
import { generateTrigInverse } from "./trig_inverse";
import { generateTrigApplications } from "./trig_applications";

// Physics
import { generateForcesMotion } from "./physics/forces_motion";
import { generateWaves } from "./physics/waves";
import { generateUnitConversions } from "./physics/unit_conversions";
import { generateElectricity } from "./physics/electricity";

// Geometry
import { generateSphereVolume } from "./sphere_volume";
import { generateSphereArea } from "./sphere_area";
import { generateCylinderSa } from "./cylinder_sa";
import { generateConeSa } from "./cone_sa";
import { generateSquarePyramidSa } from "./square_pyramid_sa";

type GeneratorFunction = (level: number, weights?: Record<string, number>) => GeneratedQuestion;

// Validate that all generators are functions at runtime
function validateGenerators(generators: Record<string, GeneratorFunction>): Record<string, GeneratorFunction> {
  const validated: Record<string, GeneratorFunction> = {};
  for (const [topicId, generator] of Object.entries(generators)) {
    if (typeof generator !== 'function') {
      console.error(`[GENERATORS] Generator for topic "${topicId}" is not a function:`, typeof generator, generator);
      // Don't include invalid generators
      continue;
    }
    validated[topicId] = generator;
  }
  return validated;
}

export const GENERATORS: Record<string, GeneratorFunction> = validateGenerators({
  // Core arithmetic
  addition: generateAddition,
  subtraction: generateSubtraction,
  multiplication: generateMultiplication,
  division: generateDivision,
  fractions: generateFractions,
  simplify_fraction: generateSimplifyFraction,
  common_multiples: generateCommonMultiples,

  // Algebra
  linearEquations: generateLinearEquations,
  quadraticEquations: generateQuadraticEquations,
  polynomials: generatePolynomials,
  exponents: generateExponents,
  systemsOfEquations: generateSystemsOfEquations,

  // Mechanics core
  kinematics: generateKinematics,
  
  // Number Theory
  primes: generatePrimes,
  prime_factorise: generatePrimeFactorise,
  factors: generateFactors,
  divisibility: generateDivisibility,
  modular: generateModular,
  sequences: generateSequences,
  
  // Patterns
  powers: generatePowers,
  multiplication_shortcuts: generateMultiplicationShortcuts,
  
  // Shortcuts
  percentages: generatePercentages,
  squaring: generateSquaring,
  estimation: generateEstimation,
  
  // Transform
  friendly_frac_decimals: generateFriendlyFracDecimals,
  common_frac_to_dec_2dp: generateCommonFracToDec2dp,
  sci_rewrite: generateSciRewrite,
  
  // Test & Estimation
  estimate_common_sqrts: generateEstimateCommonSqrts,
  
  // Identities
  binomial_expand: generateBinomialExpand,
  factorise_quadratic: generateFactoriseQuadratic,
  complete_square: generateCompleteSquare,
  inequalities: generateInequalities,
  indices_simplify: generateIndicesSimplify,
  quadratics_eval: generateQuadraticsEval,
  
  // Trigonometry
  trig_recall: generateTrigRecall,
  trig_inverse: generateTrigInverse,
  trig_applications: generateTrigApplications,
  
  // Physics
  forces_motion: generateForcesMotion,
  waves: generateWaves,
  unit_conversions: generateUnitConversions,
  electricity: generateElectricity,
  
  // Geometry
  sphere_volume: generateSphereVolume,
  sphere_area: generateSphereArea,
  cylinder_sa: generateCylinderSa,
  cone_sa: generateConeSa,
  square_pyramid_sa: generateSquarePyramidSa,
});

// Re-export mixed generators for builder sessions
export { generateMixedQuestions, generateQuestionForTopic } from "./mixed";

/**
 * Generate a question for a specific topic and level
 */
export function generateQuestion(
  topicId: string,
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  const generator = GENERATORS[topicId];
  
  if (!generator) {
    throw new Error(`No generator found for topic: ${topicId}`);
  }
  
  if (typeof generator !== 'function') {
    console.error(`Generator for topic ${topicId} is not a function:`, typeof generator, generator);
    throw new Error(`Generator for topic ${topicId} is not a function`);
  }
  
  return generator(level, weights);
}

/**
 * Generate multiple questions
 */
export function generateQuestions(
  topicId: string,
  level: number,
  count: number,
  weights?: Record<string, number>
): GeneratedQuestion[] {
  const questions: GeneratedQuestion[] = [];
  
  for (let i = 0; i < count; i++) {
    questions.push(generateQuestion(topicId, level, weights));
  }
  
  return questions;
}

/**
 * Check if a generator exists for a topic
 */
export function hasGenerator(topicId: string): boolean {
  return topicId in GENERATORS;
}


