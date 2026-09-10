import type { Letter, Question } from "@/types/papers";
import { getPastPaperOptionLetters } from "@/lib/papers/pastPaperTextMode";

const IMG_SRC_RE = /<img\b[^>]*\bsrc=["']([^"']+)["']/gi;
const CAMP_MOCK_ASSET_DIAGRAM_RE = /^m[12]-/;

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

/** Public asset path for ESAT CAMP maths diagrams rendered via `<img>`. */
export function esatCampMockDiagramAssetUrl(diagramKey: string): string | null {
  const key = diagramKey.trim();
  if (!CAMP_MOCK_ASSET_DIAGRAM_RE.test(key)) return null;
  return `/esat-camp-mocks/diagrams/${key}.svg`;
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

  const diagramAssetUrl = question.diagramKey
    ? esatCampMockDiagramAssetUrl(question.diagramKey)
    : null;
  if (diagramAssetUrl) {
    urls.add(diagramAssetUrl);
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

function preloadImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      void img
        .decode()
        .catch(() => undefined)
        .finally(() => resolve(true));
    };
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

/** Prefer SVG; fall back to PNG the same way EsatCampMockDiagram does. */
async function preloadUrlWithSvgPngFallback(url: string): Promise<void> {
  if (await preloadImage(url)) return;
  if (url.endsWith(".svg")) {
    await preloadImage(`${url.slice(0, -4)}.png`);
  }
}

/** Wait for question images and two animation frames so layout can settle. */
export async function preloadQuestionAssets(question: Question): Promise<void> {
  const urls = collectQuestionAssetUrls(question);
  await Promise.all(urls.map(preloadUrlWithSvgPngFallback));
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/**
 * Decode every image asset referenced by the session (including CAMP mock
 * diagram SVGs) before the question UI is allowed to appear.
 */
export async function preloadQuestionsAssets(
  questions: Question[],
): Promise<void> {
  const urls = new Set<string>();
  for (const question of questions) {
    for (const url of collectQuestionAssetUrls(question)) {
      urls.add(url);
    }
  }

  await Promise.all([...urls].map(preloadUrlWithSvgPngFallback));

  // Warm the React SVG diagram module (physics / M22) so first paint is ready.
  if (questions.some((q) => q.diagramKey?.trim())) {
    await import("@/components/papers/esatCampMocks/diagrams").catch(
      () => undefined,
    );
  }

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
