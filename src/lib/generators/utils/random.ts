/**
 * Enhanced random number generation utilities
 */

/**
 * Generate a random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pick a random element from an array
 */
export function pick<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

/**
 * Pick a random digit (0-9)
 */
export function randomDigit(weights?: number[]): number {
  if (weights && weights.length === 10) {
    const total = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * total;
    for (let i = 0; i < 10; i++) {
      random -= weights[i];
      if (random <= 0) return i;
    }
    return 9;
  }
  return randomInt(0, 9);
}

/**
 * Weighted random selection
 */
export function pickWeighted<T>(items: Array<{ value: T; w: number }>): T {
  const total = items.reduce((sum, item) => sum + item.w, 0);
  let random = Math.random() * total;
  
  for (const item of items) {
    random -= item.w;
    if (random <= 0) return item.value;
  }
  
  return items[items.length - 1].value;
}

/**
 * Generate a random number that is a multiple of a given value
 */
export function randomMultipleOf(multiple: number, min: number, max: number): number {
  const minMultiple = Math.ceil(min / multiple) * multiple;
  const maxMultiple = Math.floor(max / multiple) * multiple;
  const count = (maxMultiple - minMultiple) / multiple + 1;
  return minMultiple + randomInt(0, count - 1) * multiple;
}

/**
 * Generate a random number ending in specific digits (e.g., 5, 15, 25)
 */
export function randomEndingIn(ending: number, min: number, max: number): number {
  const minVal = Math.ceil(min / 10) * 10 + ending;
  const maxVal = Math.floor(max / 10) * 10 + ending;
  if (minVal > maxVal) return ending;
  const count = (maxVal - minVal) / 10 + 1;
  return minVal + randomInt(0, count - 1) * 10;
}

/**
 * Pick two distinct ordered values from an array
 */
export function pickOrdered<T>(values: T[]): [T, T] {
  let a = pick(values);
  let b = pick(values);
  while (b === a) {
    b = pick(values);
  }
  return a < b ? [a, b] : [b, a];
}










