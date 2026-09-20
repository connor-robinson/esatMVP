/**
 * Client entry for KaTeX rendering utilities.
 * Loads stylesheet; pure render helpers live in `@/lib/math/renderMathContent`.
 */

"use client";

import "katex/dist/katex.min.css";

export type { MathSegment } from "@/lib/math/renderMathContent";
export {
  parseMathContent,
  renderMath,
  renderMathContent,
} from "@/lib/math/renderMathContent";
