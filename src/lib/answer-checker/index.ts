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
export type { ParsedFraction, ParsedDecimal } from "./types";

