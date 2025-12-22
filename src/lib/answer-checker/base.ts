/**
 * Base answer checker with lenient matching
 */

import { AnswerCheckerConfig } from "./types";
import {
  parseFraction,
  parseDecimal,
  fractionsEqual,
  decimalsEqual,
  decimalMatchesFraction,
  simplifyUserAnswer,
} from "./utils";
import { reduceFraction } from "@/lib/generators/utils/math";
import { evaluateExpression, expressionsEqual } from "./math-eval";

/**
 * Create an answer checker function
 */
export function createAnswerChecker(config: AnswerCheckerConfig): (userAnswer: string) => boolean {
  const {
    correctAnswer,
    acceptFractions = true,
    acceptDecimals = true,
    tolerance = 0.01,
    acceptScientific = false,
    acceptSuperscripts = true,
    customChecker,
    acceptableAnswers = [],
  } = config;

  // If custom checker provided, use it
  if (customChecker) {
    return (userAnswer: string) => {
      const simplified = simplifyUserAnswer(userAnswer);
      return customChecker(simplified) || acceptableAnswers.some((ans) => 
        simplifyUserAnswer(ans) === simplified
      );
    };
  }

  // Normalize correct answer
  const correctStr = String(correctAnswer).trim();
  const correctParsed = parseFraction(correctStr);
  const correctDecimal = parseDecimal(correctStr);
  const correctNum = Number.isFinite(correctDecimal.value) ? correctDecimal.value : NaN;

  // Parse correct answer as fraction if possible
  let correctFrac: { num: number; den: number } | null = null;
  if (correctParsed.valid) {
    const [num, den] = reduceFraction(correctParsed.numerator, correctParsed.denominator);
    correctFrac = { num, den };
  }

  return (userAnswer: string): boolean => {
    const simplified = simplifyUserAnswer(userAnswer);
    
    // Check against acceptable answers list
    if (acceptableAnswers.length > 0) {
      const normalizedAcceptable = acceptableAnswers.map((ans) => simplifyUserAnswer(ans));
      if (normalizedAcceptable.includes(simplified)) {
        return true;
      }
    }

    // Exact string match (after normalization)
    if (simplifyUserAnswer(correctStr) === simplified) {
      return true;
    }

    // Try evaluating as mathematical expressions
    // This handles cases like 2^1 = 2, 2^2 = 4, etc.
    if (expressionsEqual(simplified, correctStr, tolerance)) {
      return true;
    }

    // Parse user answer
    const userFrac = parseFraction(simplified);
    const userDec = parseDecimal(simplified);

    // If both answers are valid fractions, compare them
    if (acceptFractions && userFrac.valid && correctFrac) {
      const [userNum, userDen] = reduceFraction(userFrac.numerator, userFrac.denominator);
      if (fractionsEqual(userNum, userDen, correctFrac.num, correctFrac.den)) {
        return true;
      }
    }

    // If both answers are valid decimals, compare them
    if (acceptDecimals && userDec.valid && Number.isFinite(correctNum)) {
      if (decimalsEqual(userDec.value, correctNum, tolerance)) {
        return true;
      }
    }

    // Check if user's decimal matches correct fraction
    if (acceptDecimals && acceptFractions && userDec.valid && correctFrac) {
      if (decimalMatchesFraction(userDec.value, correctFrac.num, correctFrac.den, tolerance)) {
        return true;
      }
    }

    // Check if user's fraction matches correct decimal
    if (acceptFractions && acceptDecimals && userFrac.valid && Number.isFinite(correctNum)) {
      const userFracValue = userFrac.numerator / userFrac.denominator;
      if (decimalsEqual(userFracValue, correctNum, tolerance)) {
        return true;
      }
    }

    return false;
  };
}

/**
 * Simple answer matcher for exact or numeric matches
 */
export function matchAnswer(
  userAnswer: string,
  correctAnswer: string | number,
  options: {
    acceptFractions?: boolean;
    acceptDecimals?: boolean;
    tolerance?: number;
  } = {}
): boolean {
  const checker = createAnswerChecker({
    correctAnswer,
    ...options,
  });
  return checker(userAnswer);
}


