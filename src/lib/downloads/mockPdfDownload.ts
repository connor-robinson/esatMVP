/**
 * Mock PDF download tracking helpers (href parsing + client beacon).
 */

import {
  ESAT_MOCK_MODULES,
  mockLetterForNumber,
  type EsatMockModuleId,
} from "@/lib/esatMockTests/catalog";

export type MockPdfAsset = "paper" | "answers";

export type MockPdfDownloadSource =
  | "esat_mock_tests"
  | "roadmap"
  | "other";

export type MockPdfModuleKey = EsatMockModuleId | "full";

export type TrackMockPdfDownloadInput = {
  href: string;
  asset: MockPdfAsset;
  source: MockPdfDownloadSource;
  moduleId?: MockPdfModuleKey | null;
  mockNumber?: number | null;
};

const MODULE_IDS: readonly EsatMockModuleId[] = [
  "maths-1",
  "maths-2",
  "physics",
  "chemistry",
  "biology",
];

const LETTER_TO_NUMBER: Record<string, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
};

/** Best-effort parse of `/downloads/mocks/...` hrefs into mock metadata. */
export function parseMockPdfHref(href: string): {
  moduleId: MockPdfModuleKey | null;
  mockNumber: number | null;
  asset: MockPdfAsset | null;
} {
  try {
    const path = href.startsWith("http")
      ? new URL(href).pathname
      : href.split("?")[0] ?? href;
    const decoded = decodeURIComponent(path);
    const mocksMatch = decoded.match(
      /^\/downloads\/mocks\/([^/]+)\/([^/]+)\.pdf$/i,
    );
    if (!mocksMatch) {
      return { moduleId: null, mockNumber: null, asset: null };
    }

    const folder = mocksMatch[1]!.toLowerCase();
    const filename = mocksMatch[2]!;
    const moduleId: MockPdfModuleKey | null =
      folder === "full"
        ? "full"
        : MODULE_IDS.includes(folder as EsatMockModuleId)
          ? (folder as EsatMockModuleId)
          : null;

    const isAnswers = /\banswer\s*key\b/i.test(filename);
    const asset: MockPdfAsset = isAnswers ? "answers" : "paper";

    const letterMatch = filename.match(/\bMock\s+([A-E])\b/i);
    const mockNumber = letterMatch
      ? (LETTER_TO_NUMBER[letterMatch[1]!.toUpperCase()] ?? null)
      : null;

    return { moduleId, mockNumber, asset };
  } catch {
    return { moduleId: null, mockNumber: null, asset: null };
  }
}

export function mockDownloadLabel(
  moduleId: MockPdfModuleKey | null | undefined,
  mockNumber: number | null | undefined,
): string {
  const letter =
    mockNumber != null && mockNumber >= 1 && mockNumber <= 5
      ? mockLetterForNumber(mockNumber)
      : "?";
  if (!moduleId || moduleId === "full") return `Full Mock ${letter}`;
  const subject =
    ESAT_MOCK_MODULES.find((m) => m.id === moduleId)?.label ?? moduleId;
  return `${subject} Mock ${letter}`;
}

/** Fire-and-forget beacon; never blocks the download. */
export function trackMockPdfDownload(
  input: TrackMockPdfDownloadInput,
): void {
  if (typeof window === "undefined") return;
  const parsed = parseMockPdfHref(input.href);
  const body = {
    category: "mock" as const,
    asset: input.asset || parsed.asset || "paper",
    href: input.href,
    moduleId: input.moduleId ?? parsed.moduleId,
    mockNumber: input.mockNumber ?? parsed.mockNumber,
    source: input.source,
  };

  try {
    void fetch("/api/downloads/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {
    /* non-critical */
  }
}

/** Download one or more PDFs and record each mock download click. */
export function downloadAndTrackMockPdfs(
  urls: string[],
  options: {
    asset: MockPdfAsset;
    source: MockPdfDownloadSource;
    moduleId?: MockPdfModuleKey | null;
    mockNumber?: number | null;
  },
): void {
  if (typeof document === "undefined" || urls.length === 0) return;
  urls.forEach((href, index) => {
    trackMockPdfDownload({
      href,
      asset: options.asset,
      source: options.source,
      moduleId: options.moduleId,
      mockNumber: options.mockNumber,
    });
    window.setTimeout(() => {
      const a = document.createElement("a");
      a.href = href;
      a.download = "";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }, index * 250);
  });
}
