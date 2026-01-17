/**
 * Types for answer checking system
 */

export interface AnswerCheckerConfig {
  /** The correct answer (can be string or number) */
  correctAnswer: string | number;
  
  /** Accept fraction format (e.g., "3/5") */
  acceptFractions?: boolean;
  
  /** Accept decimal format (e.g., "0.6") */
  acceptDecimals?: boolean;
  
  /** Tolerance for decimal comparisons */
  tolerance?: number;
  
  /** Accept scientific notation */
  acceptScientific?: boolean;
  
  /** Accept superscript format (e.g., "x²" instead of "x^2") */
  acceptSuperscripts?: boolean;
  
  /** Custom checker function (overrides default behavior) */
  customChecker?: (userAnswer: string) => boolean;
  
  /** List of acceptable alternative answers */
  acceptableAnswers?: string[];
}

export interface ParsedFraction {
  numerator: number;
  denominator: number;
  valid: boolean;
}

export interface ParsedDecimal {
  value: number;
  valid: boolean;
}


























