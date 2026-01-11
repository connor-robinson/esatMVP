/**
 * Mathematical expression evaluator for answer checking
 * Handles expressions with powers, basic arithmetic, etc.
 */

import { intPow } from "@/lib/generators/utils/math";

/**
 * Safely evaluate a simple mathematical expression
 * Supports: +, -, *, /, ^, parentheses, and numbers
 */
export function evaluateExpression(expr: string): number | null {
  try {
    // Remove whitespace
    let cleaned = expr.trim().replace(/\s+/g, "");
    
    // If it's just a number, return it
    const simpleNum = parseFloat(cleaned);
    if (!isNaN(simpleNum) && /^-?\d+\.?\d*$/.test(cleaned)) {
      return simpleNum;
    }
    
    // Handle powers (^) - convert to ** for evaluation or evaluate manually
    // We'll evaluate powers manually to avoid using eval()
    return evaluateWithPowers(cleaned);
  } catch (error) {
    return null;
  }
}

/**
 * Evaluate expression with powers using a custom parser
 * Supports: numbers, +, -, *, /, ^, parentheses
 */
function evaluateWithPowers(expr: string): number | null {
  try {
    // Tokenize the expression
    const tokens = tokenize(expr);
    if (tokens.length === 0) return null;
    
    // Parse and evaluate
    const result = parseExpression(tokens, 0);
    if (result.index !== tokens.length) return null; // Didn't consume all tokens
    
    return result.value;
  } catch (error) {
    return null;
  }
}

/**
 * Token types for the parser
 */
type Token = 
  | { type: "number"; value: number }
  | { type: "operator"; value: "+" | "-" | "*" | "/" | "^" }
  | { type: "paren"; value: "(" | ")" };

/**
 * Tokenize the expression
 */
function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  
  while (i < expr.length) {
    const char = expr[i];
    
    // Number (including decimals)
    if (/\d/.test(char)) {
      let numStr = "";
      while (i < expr.length && /[\d.]/.test(expr[i])) {
        numStr += expr[i];
        i++;
      }
      const num = parseFloat(numStr);
      if (!isNaN(num)) {
        tokens.push({ type: "number", value: num });
      }
      continue;
    }
    
    // Operators
    if (["+", "-", "*", "/", "^"].includes(char)) {
      tokens.push({ type: "operator", value: char as any });
      i++;
      continue;
    }
    
    // Parentheses
    if (["(", ")"].includes(char)) {
      tokens.push({ type: "paren", value: char as any });
      i++;
      continue;
    }
    
    // Skip unknown characters
    i++;
  }
  
  return tokens;
}

/**
 * Parse result with position
 */
interface ParseResult {
  value: number;
  index: number;
}

/**
 * Parse an expression (handles + and -)
 */
function parseExpression(tokens: Token[], startIndex: number): ParseResult {
  let result = parseTerm(tokens, startIndex);
  
  while (result.index < tokens.length) {
    const token = tokens[result.index];
    
    if (token.type === "operator" && (token.value === "+" || token.value === "-")) {
      result.index++;
      const right = parseTerm(tokens, result.index);
      
      if (token.value === "+") {
        result.value = result.value + right.value;
      } else {
        result.value = result.value - right.value;
      }
      
      result.index = right.index;
    } else {
      break;
    }
  }
  
  return result;
}

/**
 * Parse a term (handles * and /)
 */
function parseTerm(tokens: Token[], startIndex: number): ParseResult {
  let result = parsePower(tokens, startIndex);
  
  while (result.index < tokens.length) {
    const token = tokens[result.index];
    
    if (token.type === "operator" && (token.value === "*" || token.value === "/")) {
      result.index++;
      const right = parsePower(tokens, result.index);
      
      if (token.value === "*") {
        result.value = result.value * right.value;
      } else {
        if (right.value === 0) throw new Error("Division by zero");
        result.value = result.value / right.value;
      }
      
      result.index = right.index;
    } else {
      break;
    }
  }
  
  return result;
}

/**
 * Parse a power expression (handles ^)
 */
function parsePower(tokens: Token[], startIndex: number): ParseResult {
  let result = parseFactor(tokens, startIndex);
  
  if (result.index < tokens.length) {
    const token = tokens[result.index];
    
    if (token.type === "operator" && token.value === "^") {
      result.index++;
      const right = parsePower(tokens, result.index); // Right associative
      result.value = Math.pow(result.value, right.value);
      result.index = right.index;
    }
  }
  
  return result;
}

/**
 * Parse a factor (number or parenthesized expression)
 */
function parseFactor(tokens: Token[], startIndex: number): ParseResult {
  if (startIndex >= tokens.length) {
    throw new Error("Unexpected end of expression");
  }
  
  const token = tokens[startIndex];
  
  // Number
  if (token.type === "number") {
    return { value: token.value, index: startIndex + 1 };
  }
  
  // Parenthesized expression
  if (token.type === "paren" && token.value === "(") {
    const result = parseExpression(tokens, startIndex + 1);
    
    if (result.index >= tokens.length || 
        tokens[result.index].type !== "paren" || 
        tokens[result.index].value !== ")") {
      throw new Error("Missing closing parenthesis");
    }
    
    return { value: result.value, index: result.index + 1 };
  }
  
  // Unary minus
  if (token.type === "operator" && token.value === "-") {
    const result = parseFactor(tokens, startIndex + 1);
    return { value: -result.value, index: result.index };
  }
  
  // Unary plus
  if (token.type === "operator" && token.value === "+") {
    return parseFactor(tokens, startIndex + 1);
  }
  
  throw new Error("Unexpected token");
}

/**
 * Check if two mathematical expressions are equivalent
 */
export function expressionsEqual(
  expr1: string,
  expr2: string,
  tolerance: number = 1e-9
): boolean {
  const val1 = evaluateExpression(expr1);
  const val2 = evaluateExpression(expr2);
  
  if (val1 === null || val2 === null) {
    return false;
  }
  
  if (!Number.isFinite(val1) || !Number.isFinite(val2)) {
    return false;
  }
  
  const absDiff = Math.abs(val1 - val2);
  const relDiff = Math.abs(val1 - val2) / Math.max(1, Math.abs(val2));
  
  return absDiff < tolerance || relDiff < tolerance;
}






















