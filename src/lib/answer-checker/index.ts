/**
 * Answer checker system exports
 */

export { createAnswerChecker, matchAnswer } from "./base";
export type { AnswerCheckerConfig } from "./types";
export {
  parseFraction,
  parseDecimal,
  normalizeSuperscripts,
  normalizeGreekLetters,
  simplifyUserAnswer,
  fractionsEqual,
  decimalsEqual,
} from "./utils";
export { evaluateExpression, expressionsEqual } from "./math-eval";
export type { ParsedFraction, ParsedDecimal } from "./types";




























