/**
 * First-run chooser: Library vs Roadmap. Both stay available via legacy links.
 */

"use client";

import Link from "next/link";
import { Library, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PastPapersUiPreference } from "@/lib/papers/pastPapersUiPreference";
import {
  PAST_PAPERS_LIBRARY_PATH,
  PAST_PAPERS_ROADMAP_PATH,
} from "@/lib/papers/pastPapersUiPreference";

type Props = {
  onChoose: (preference: PastPapersUiPreference) => void;
  /** When true, show as a compact switcher rather than the first-run hub. */
  compact?: boolean;
};

const OPTIONS: Array<{
  id: PastPapersUiPreference;
  title: string;
  description: string;
  href: string;
  icon: typeof Map;
  recommended?: boolean;
}> = [
  {
    id: "roadmap",
    title: "Roadmap",
    description:
      "Practice table with years, scores, downloads, and one-click start.",
    href: PAST_PAPERS_ROADMAP_PATH,
    icon: Map,
    recommended: true,
  },
  {
    id: "library",
    title: "Library",
    description: "Browse papers and build a session from selected sections.",
    href: PAST_PAPERS_LIBRARY_PATH,
    icon: Library,
  },
];

export function PastPapersPreferenceChooser({ onChoose, compact }: Props) {
  return (
    <div
      className={cn(
        "font-sans",
        compact
          ? "rounded-sm border border-border-subtle bg-surface-elevated p-4"
          : "mx-auto w-full max-w-2xl",
      )}
    >
      <div className={compact ? "" : "text-center"}>
        <h1
          className={cn(
            "font-semibold tracking-tight text-text",
            compact ? "text-base" : "text-2xl sm:text-3xl",
          )}
        >
          {compact
            ? "Switch Past Papers layout"
            : "Which Past Papers layout do you prefer?"}
        </h1>
        <p
          className={cn(
            "text-text-muted",
            compact ? "mt-1 text-sm" : "mt-2 text-sm sm:text-base",
          )}
        >
          Pick one as your default. You can still open the other anytime from
          legacy links.
        </p>
      </div>

      <div
        className={cn(
          "grid gap-3",
          compact ? "mt-4 sm:grid-cols-2" : "mt-8 sm:grid-cols-2 sm:gap-4",
        )}
      >
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChoose(option.id)}
              className={cn(
                "flex flex-col items-start rounded-sm border bg-surface-elevated p-4 text-left transition-colors",
                "hover:border-primary hover:bg-surface-mid",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                option.recommended
                  ? "border-primary/40"
                  : "border-border-subtle",
              )}
            >
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" aria-hidden />
                <span className="text-sm font-semibold text-text">
                  {option.title}
                </span>
                {option.recommended ? (
                  <span className="rounded-sm bg-surface-mid px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                    Recommended
                  </span>
                ) : null}
              </span>
              <span className="mt-2 text-sm text-text-muted">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>

      {!compact ? (
        <p className="mt-6 text-center text-xs text-text-muted">
          Legacy links:{" "}
          <Link
            href={PAST_PAPERS_ROADMAP_PATH}
            className="underline underline-offset-2 hover:text-text"
          >
            Roadmap
          </Link>
          {" · "}
          <Link
            href={PAST_PAPERS_LIBRARY_PATH}
            className="underline underline-offset-2 hover:text-text"
          >
            Library
          </Link>
        </p>
      ) : null}
    </div>
  );
}
