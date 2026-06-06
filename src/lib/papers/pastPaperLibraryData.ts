import type { Paper } from "@/types/papers";
import type { PaperSectionsOutline } from "@/lib/papers/paperLibrarySections";

const outlineCache = new Map<string, Paper[]>();
const outlineInFlight = new Map<string, Promise<Paper[]>>();

const sectionsCache = new Map<number, PaperSectionsOutline>();
const sectionsInFlight = new Map<number, Promise<PaperSectionsOutline>>();

export async function fetchPastPaperLibraryOutline(): Promise<Paper[]> {
  const key = "all";
  const cached = outlineCache.get(key);
  if (cached) return cached;

  const existing = outlineInFlight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    const response = await fetch("/api/past-papers/library-outline", {
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error("Failed to load papers");
    }
    const data = (await response.json()) as { papers: Paper[] };
    outlineCache.set(key, data.papers);
    return data.papers;
  })();

  outlineInFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    outlineInFlight.delete(key);
  }
}

export async function fetchPaperSectionsOutline(
  paperId: number,
): Promise<PaperSectionsOutline> {
  const cached = sectionsCache.get(paperId);
  if (cached) return cached;

  const existing = sectionsInFlight.get(paperId);
  if (existing) return existing;

  const promise = (async () => {
    const response = await fetch(
      `/api/past-papers/library-sections?paperId=${paperId}`,
      { credentials: "include" },
    );
    if (!response.ok) {
      throw new Error("Failed to load sections");
    }
    const data = (await response.json()) as PaperSectionsOutline;
    sectionsCache.set(paperId, data);
    return data;
  })();

  sectionsInFlight.set(paperId, promise);
  try {
    return await promise;
  } finally {
    sectionsInFlight.delete(paperId);
  }
}

export function invalidatePastPaperLibraryCaches(): void {
  outlineCache.clear();
  sectionsCache.clear();
}
