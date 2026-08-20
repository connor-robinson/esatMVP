"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/ga/trackEvent";
import {
  OVERLAP_RULES_2016_2019,
  OVERLAP_RULES_2020_2023,
  UNIQUE_ENGAA_PART_B_BY_YEAR,
} from "@/content/pastPapersGuide";
import { VERIFIED_DUPLICATE_GROUPS } from "@/content/pastPaperDuplicateGroups";
import { SEO_ROUTES } from "@/lib/seo/config";

type Era = "2016-2019" | "2020-2023";

export function OverlapExplorerSection() {
  const [era, setEra] = useState<Era>("2016-2019");
  const [showFullList, setShowFullList] = useState(false);
  const rules =
    era === "2016-2019" ? OVERLAP_RULES_2016_2019 : OVERLAP_RULES_2020_2023;

  const onEraChange = (next: Era) => {
    setEra(next);
    trackEvent("overlap_era_changed", { era: next, surface: "past_papers_guide" });
  };

  return (
    <div className="space-y-8">
      <p className="max-w-3xl text-lg font-display font-bold text-white">
        NSAA and ENGAA drew from the same question pool. If you complete both
        papers from one year without checking, part of the second score measures
        memory, not improvement.
      </p>

      <div className="flex flex-wrap gap-2">
        {(["2016-2019", "2020-2023"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={era === option}
            onClick={() => onEraChange(option)}
            className={cn(
              "min-h-11 rounded-full px-5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]",
              era === option
                ? "bg-white text-[#0A0F1D]"
                : "bg-white/5 text-[#94A3B8] hover:text-white",
            )}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="space-y-4 lg:hidden">
        {rules.map((rule) => (
          <div
            key={rule.engaa}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          >
            <p className="text-sm font-semibold text-white">{rule.engaa}</p>
            <p className="mt-1 text-sm text-[#94A3B8]">{rule.nsaa}</p>
            <p className="mt-3 font-mono text-xs uppercase tracking-widest text-[#C9A227]">
              {rule.action} · {rule.instruction}
            </p>
          </div>
        ))}
      </div>

      <div className="hidden space-y-4 lg:block">
        {rules.map((rule) => (
          <div
            key={rule.engaa}
            className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4"
          >
            <p className="font-semibold text-white">{rule.engaa}</p>
            <span className="text-[#64748B]">↔</span>
            <p className="text-[#94A3B8]">{rule.nsaa}</p>
            <span className="rounded-full bg-[#C9A227]/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#E8D5A3]">
              {rule.instruction}
            </span>
          </div>
        ))}
      </div>

      {era === "2016-2019" ? (
        <div className="space-y-3">
          <h3 className="font-display text-lg font-bold text-white">
            Unique ENGAA Part B questions (2016–2019)
          </h3>
          {Object.entries(UNIQUE_ENGAA_PART_B_BY_YEAR).map(([year, questions]) => (
            <details
              key={year}
              className="rounded-xl bg-white/[0.03] px-4 py-3"
              onToggle={(event) => {
                if ((event.target as HTMLDetailsElement).open) {
                  trackEvent("overlap_year_changed", {
                    year,
                    surface: "past_papers_guide",
                  });
                }
              }}
            >
              <summary className="cursor-pointer font-mono text-sm font-semibold text-white">
                {year}
              </summary>
              <p className="mt-2 font-mono text-sm text-[#94A3B8]">
                Q{questions.join(", Q")}
              </p>
            </details>
          ))}
        </div>
      ) : null}

      <div className="rounded-2xl bg-white/[0.04] p-5">
        <p className="font-semibold text-white">Already completed NSAA?</p>
        <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">
          Skip ENGAA Part A in every year. For 2016–2019, do only the unique
          Part B questions listed above. For 2020–2023, do all of Part B. Skip
          2020–2023 ENGAA Section 2 Physics if you already completed NSAA Section
          2 Part X.
        </p>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowFullList((open) => !open)}
          className="min-h-11 rounded-xl bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
        >
          {showFullList ? "Hide confirmed pairs" : "Show confirmed duplicate pairs"}
        </button>
        {showFullList ? (
          <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto text-sm text-[#94A3B8]">
            {VERIFIED_DUPLICATE_GROUPS.slice(0, 40).map((group) => (
              <li key={group.id} className="rounded-lg bg-white/[0.03] px-3 py-2">
                {group.title}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <p className="text-sm text-[#94A3B8]">
        Exact duplicate detection can be imperfect where a PDF question is mostly
        a diagram.{" "}
        <Link
          href={SEO_ROUTES.engaaNsaaPapers}
          className="text-white underline decoration-white/25 underline-offset-4 hover:decoration-[#3B82F6]"
        >
          Open the full question-by-question overlap checker
        </Link>
        .
      </p>
    </div>
  );
}
