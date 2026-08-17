"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { PastPaperExam, PastPaperResource } from "@/content/pastPapers";
import { PastPaperCard } from "./PastPaperCard";
import {
  DEFAULT_PAPER_FILTERS,
  PastPaperFilters,
  type PastPaperFilterState,
} from "./PastPaperFilters";

export type PastPaperSection = {
  exam: PastPaperExam;
  heading: string;
  /** Rendered on the server and passed through, so the copy stays crawlable. */
  guide?: React.ReactNode;
};

function matches(paper: PastPaperResource, filters: PastPaperFilterState) {
  if (filters.exam !== "all" && paper.exam !== filters.exam) return false;

  if (filters.year !== "all") {
    if (filters.year === "specimen") {
      if (paper.year !== null) return false;
    } else if (String(paper.year) !== filters.year) {
      return false;
    }
  }

  if (filters.module !== "all" && !paper.bestForModules.includes(filters.module)) {
    return false;
  }
  if (filters.hasWorkedSolutions && !paper.workedSolutionsUrl) return false;

  return true;
}

/** Most recent first, with the undated specimen papers last. */
function byRecency(a: PastPaperResource, b: PastPaperResource) {
  if (a.year === null && b.year !== null) return 1;
  if (b.year === null && a.year !== null) return -1;
  if (a.year !== b.year) return (b.year ?? 0) - (a.year ?? 0);
  return a.sectionName.localeCompare(b.sectionName);
}

/**
 * Filterable library of official papers, grouped by exam. Every paper is in the
 * initial render, so the list is fully crawlable and the filters are a
 * progressive refinement rather than the only way to see the content.
 */
export function PastPaperLibrary({
  papers,
  sections,
  className,
}: {
  papers: readonly PastPaperResource[];
  sections: readonly PastPaperSection[];
  className?: string;
}) {
  const [filters, setFilters] = useState<PastPaperFilterState>(
    DEFAULT_PAPER_FILTERS,
  );

  const visible = useMemo(
    () => papers.filter((paper) => matches(paper, filters)),
    [papers, filters],
  );

  return (
    <div className={cn("space-y-10", className)}>
      <PastPaperFilters
        value={filters}
        onChange={setFilters}
        resultCount={visible.length}
        totalCount={papers.length}
      />

      {visible.length === 0 ? (
        <p className="text-sm leading-relaxed text-[#64748B]">
          Nothing matches that. Worked answers only exist for TMUA. ENGAA and NSAA
          just have an answer key.
        </p>
      ) : null}

      {sections.map((section) => {
        const group = visible
          .filter((paper) => paper.exam === section.exam)
          .sort(byRecency);
        if (!group.length) return null;

        return (
          <section
            key={section.exam}
            id={`${section.exam.toLowerCase()}-papers`}
            className="scroll-mt-24"
          >
            <h3 className="text-xl font-display font-bold tracking-tight text-white sm:text-2xl">
              {section.heading}
            </h3>
            {section.guide ? (
              <div className="mt-2">{section.guide}</div>
            ) : null}
            <div className="mt-4 divide-y divide-white/[0.06]">
              {group.map((paper) => (
                <PastPaperCard key={paper.id} paper={paper} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
