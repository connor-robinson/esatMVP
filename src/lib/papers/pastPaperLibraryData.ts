import type { Paper } from "@/types/papers";
import {
  buildPaperSectionsOutline,
  type PaperSectionsOutline,
} from "@/lib/papers/paperLibrarySections";
import { examNameToPaperType } from "@/lib/papers/paperConfig";
import type { ExamName } from "@/types/papers";
import {
  getAvailablePapers,
  getQuestionPartsForPaperIds,
} from "@/lib/supabase/questions";

const outlineCache = new Map<string, Paper[]>();
const outlineInFlight = new Map<string, Promise<Paper[]>>();

const sectionsCache = new Map<number, PaperSectionsOutline>();
const sectionsInFlight = new Map<number, Promise<PaperSectionsOutline>>();

async function fetchPastPaperLibraryOutlineFromClient(): Promise<Paper[]> {
  return getAvailablePapers();
}

async function fetchPaperSectionsOutlineFromClient(
  paperId: number,
  catalog?: Paper[],
): Promise<PaperSectionsOutline> {
  const papers = catalog ?? (await getAvailablePapers());
  const paper = papers.find((p) => p.id === paperId);
  if (!paper) {
    throw new Error("Paper not found");
  }

  const paperType = examNameToPaperType(paper.examName as ExamName) || "NSAA";
  const mergeSiblings =
    paperType === "NSAA" ||
    paperType === "ENGAA" ||
    paperType === "ESAT" ||
    paperType === "TMUA";

  const paperIds = mergeSiblings
    ? papers
        .filter(
          (p) =>
            p.examName === paper.examName && p.examYear === paper.examYear,
        )
        .map((p) => p.id)
    : [paper.id];

  const allQuestions = await getQuestionPartsForPaperIds(paperIds);

  return buildPaperSectionsOutline(paper, [], allQuestions);
}

export async function fetchPastPaperLibraryOutline(): Promise<Paper[]> {
  const key = "all";
  const cached = outlineCache.get(key);
  if (cached) return cached;

  const existing = outlineInFlight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const response = await fetch("/api/past-papers/library-outline", {
        credentials: "include",
      });
      if (response.ok) {
        const data = (await response.json()) as { papers: Paper[] };
        outlineCache.set(key, data.papers);
        return data.papers;
      }
      console.warn(
        "[pastPaperLibrary] library-outline API failed:",
        response.status,
        response.statusText,
      );
    } catch (error) {
      console.warn("[pastPaperLibrary] library-outline API unreachable:", error);
    }

    const papers = await fetchPastPaperLibraryOutlineFromClient();
    if (papers.length === 0) {
      throw new Error(
        "Could not load papers. The library API and database both returned no results.",
      );
    }
    outlineCache.set(key, papers);
    return papers;
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
    try {
      const response = await fetch(
        `/api/past-papers/library-sections?paperId=${paperId}`,
        { credentials: "include" },
      );
      if (response.ok) {
        const data = (await response.json()) as PaperSectionsOutline;
        sectionsCache.set(paperId, data);
        return data;
      }
      console.warn(
        "[pastPaperLibrary] library-sections API failed:",
        response.status,
        response.statusText,
      );
    } catch (error) {
      console.warn("[pastPaperLibrary] library-sections API unreachable:", error);
    }

    const catalog = outlineCache.get("all") ?? (await fetchPastPaperLibraryOutline());
    const data = await fetchPaperSectionsOutlineFromClient(paperId, catalog);
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
