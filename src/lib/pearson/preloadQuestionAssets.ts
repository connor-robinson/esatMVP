import type { Letter, Question } from "@/types/papers";
import { getPastPaperOptionLetters } from "@/lib/papers/pastPaperTextMode";

const IMG_SRC_RE = /<img\b[^>]*\bsrc=["']([^"']+)["']/gi;

/** Collect image URLs referenced in HTML stem/option strings. */
export function extractHtmlImageUrls(html: string | undefined | null): string[] {
  if (!html?.trim()) return [];
  const urls: string[] = [];
  let match: RegExpExecArray | null;
  IMG_SRC_RE.lastIndex = 0;
  while ((match = IMG_SRC_RE.exec(html)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

export function collectQuestionAssetUrls(question: Question): string[] {
  const urls = new Set<string>();

  if (question.questionImage?.trim()) {
    urls.add(question.questionImage.trim());
  }

  for (const asset of question.diagramAssets ?? []) {
    if (asset.url?.trim()) {
      urls.add(asset.url.trim());
    }
  }

  for (const url of extractHtmlImageUrls(question.questionStem)) {
    urls.add(url);
  }

  const letters = getPastPaperOptionLetters(question);
  for (const letter of letters) {
    for (const url of extractHtmlImageUrls(
      question.options?.[letter as Letter],
    )) {
      urls.add(url);
    }
  }

  return [...urls];
}

function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

/** Wait for question images and two animation frames so layout can settle. */
export async function preloadQuestionAssets(question: Question): Promise<void> {
  const urls = collectQuestionAssetUrls(question);
  await Promise.all(urls.map(preloadImage));
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/** Minimum spinner visibility so transitions do not flash on cache hits. */
export const QUESTION_TRANSITION_MIN_MS = 220;

export async function preloadQuestionWithMinimumDelay(
  question: Question,
  minimumMs: number = QUESTION_TRANSITION_MIN_MS,
): Promise<void> {
  await Promise.all([
    preloadQuestionAssets(question),
    new Promise<void>((resolve) => window.setTimeout(resolve, minimumMs)),
  ]);
}
