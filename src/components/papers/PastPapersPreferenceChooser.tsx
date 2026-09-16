/**
 * First-run / change-default chooser: Home, Roadmap, or Library.
 */

"use client";

import Link from "next/link";
import { Home, Library, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PastPapersUiPreference } from "@/lib/papers/pastPapersUiPreference";
import {
  PAST_PAPERS_HOME_PATH,
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
  icon: typeof Home;
  recommended?: boolean;
}> = [
  {
    id: "home",
    title: "Home",
    description:
      "Updated practice table with years, scores, downloads, and one-click start.",
    icon: Home,
    recommended: true,
  },
  {
    id: "roadmap",
    title: "Roadmap",
    description: "Same practice table at the classic Roadmap URL.",
    icon: Map,
  },
  {
    id: "library",
    title: "Library",
    description: "Browse papers and build a session from selected sections.",
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
          : "mx-auto w-full max-w-3xl",
      )}
    >
      <div className={compact ? "" : "text-center"}>
        <h2
          className={cn(
            "font-semibold tracking-tight text-text",
            compact ? "text-base" : "text-2xl sm:text-3xl",
          )}
        >
          {compact
            ? "Which layout do you prefer?"
            : "Which Past Papers layout do you prefer?"}
        </h2>
        <p
          className={cn(
            "text-text-muted",
            compact ? "mt-1 text-sm" : "mt-2 text-sm sm:text-base",
          )}
        >
          We recently updated the past paper layout. Home is the new default;
          Roadmap and Library are still available. You can switch anytime from
          the layout menu.
        </p>
      </div>

      <div
        className={cn(
          "grid gap-3",
          compact
            ? "mt-4 sm:grid-cols-3"
            : "mt-8 sm:grid-cols-3 sm:gap-4",
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
              <span className="flex flex-wrap items-center gap-2">
                <Icon className="h-4 w-4 text-primary" aria-hidden />
                <span className="text-sm font-semibold text-text">
                  {option.title}
                </span>
                {option.recommended ? (
                  <span className="rounded-sm bg-surface-mid px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                    Default
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
          Also:{" "}
          <Link
            href={PAST_PAPERS_HOME_PATH}
            className="underline underline-offset-2 hover:text-text"
          >
            Home
          </Link>
          {" · "}
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
