/**
 * Utility functions
 */

import { type ClassValue, clsx } from "clsx";

/**
 * Merge class names with Tailwind CSS
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}



