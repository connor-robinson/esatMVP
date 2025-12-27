/**
 * Mathematical utility functions
 */

/**
 * Calculate Greatest Common Divisor (GCD)
 */
export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}

/**
 * Calculate Least Common Multiple (LCM)
 */
export function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

/**
 * Simplify a fraction to lowest terms
 */
export function simplifyFraction(numerator: number, denominator: number): [number, number] {
  const g = gcd(numerator, denominator);
  return [numerator / g, denominator / g];
}

/**
 * Reduce a fraction pair
 */
export function reduceFraction(num: number, den: number): [number, number] {
  if (den === 0) return [0, 1];
  if (den < 0) {
    num = -num;
    den = -den;
  }
  return simplifyFraction(num, den);
}

/**
 * Prime factorization of a number
 */
export function primeFactorize(n: number): Record<number, number> {
  const factors: Record<number, number> = {};
  let d = 2;
  let x = Math.abs(n);
  
  while (d * d <= x) {
    while (x % d === 0) {
      factors[d] = (factors[d] || 0) + 1;
      x /= d;
    }
    d++;
  }
  
  if (x > 1) {
    factors[x] = (factors[x] || 0) + 1;
  }
  
  return factors;
}

/**
 * Check if a number is prime
 */
export function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;
  
  for (let i = 3; i * i <= n; i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}

/**
 * Evaluate a fraction string (e.g., "3/5" or "7")
 */
export function evalFraction(frac: string): number {
  const trimmed = String(frac).trim();
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }
  const match = trimmed.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (match) {
    const num = Number(match[1]);
    const den = Number(match[2]);
    if (den === 0) return NaN;
    return num / den;
  }
  return NaN;
}

/**
 * Format a fraction as a string
 */
export function formatFraction(num: number, den: number): string {
  const [n, d] = reduceFraction(num, den);
  if (d === 1) return String(n);
  return `${n}/${d}`;
}

/**
 * Multiply two fractions
 */
export function multiplyFractions(
  [a, b]: [number, number],
  [c, d]: [number, number]
): [number, number] {
  return reduceFraction(a * c, b * d);
}

/**
 * Add two fractions
 */
export function addFractions(
  [a, b]: [number, number],
  [c, d]: [number, number]
): [number, number] {
  return reduceFraction(a * d + c * b, b * d);
}

/**
 * Subtract two fractions
 */
export function subtractFractions(
  [a, b]: [number, number],
  [c, d]: [number, number]
): [number, number] {
  return reduceFraction(a * d - c * b, b * d);
}

/**
 * Integer power (for large exponents)
 */
export function intPow(base: number, exponent: number): number {
  if (exponent === 0) return 1;
  if (exponent < 0) {
    return 1 / intPow(base, -exponent);
  }
  
  let result = 1;
  let e = exponent;
  let b = base;
  
  while (e > 0) {
    if (e % 2 === 1) result *= b;
    e = Math.floor(e / 2);
    if (e > 0) b *= b;
  }
  
  return result;
}

/**
 * Calculate n choose k (binomial coefficient)
 */
export function nCk(n: number, k: number): number {
  if (k > n || k < 0) return 0;
  if (k === 0 || k === n) return 1;
  
  k = Math.min(k, n - k);
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return Math.round(result);
}










