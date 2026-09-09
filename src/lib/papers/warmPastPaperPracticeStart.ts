import {
  fetchPaperSectionsOutline,
  fetchPastPaperLibraryOutline,
} from "@/lib/papers/pastPaperLibraryData";
import { parsePastPaperPracticeSearchParams } from "@/lib/papers/pastPaperPracticeHref";
import {
  matchesRequestedType,
  paperFromPracticeTarget,
} from "@/lib/papers/paperFromPracticeTarget";
import { prefetchQuestions } from "@/lib/supabase/questions";

const warmingHrefs = new Set<string>();

/** Warm outline, sections, and full question payloads for a Start now href. */
export async function warmPastPaperPracticeStart(href: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (warmingHrefs.has(href)) return;
  warmingHrefs.add(href);

  try {
    const url = new URL(href, window.location.origin);
    const target = parsePastPaperPracticeSearchParams(url.searchParams);
    if (!target) return;

    const papers = await fetchPastPaperLibraryOutline();
    const paper = paperFromPracticeTarget(papers, target);
    if (!paper) return;

    await fetchPaperSectionsOutline(paper.id);

    const catalog = papers.filter(
      (item) =>
        item.examName === paper.examName &&
        item.examYear === paper.examYear &&
        matchesRequestedType(item, target.examType),
    );

    // Fire in parallel; loadQuestions will hit the same in-flight/cache entries.
    void Promise.all(catalog.map((item) => prefetchQuestions(item.id)));
  } catch {
    warmingHrefs.delete(href);
  }
}
