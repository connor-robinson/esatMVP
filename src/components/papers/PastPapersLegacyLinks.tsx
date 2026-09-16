/**
 * Layout strip: legacy link + default-layout dropdown.
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  PAST_PAPERS_HOME_PATH,
  PAST_PAPERS_LIBRARY_PATH,
  PAST_PAPERS_ROADMAP_PATH,
  applyPastPapersUiPreference,
  clearPastPapersUiSurveyChoice,
  readPastPapersUiPreference,
  type PastPapersUiPreference,
} from "@/lib/papers/pastPapersUiPreference";

type Props = {
  current: "home" | "library";
  /** Open the delayed survey immediately (change default). */
  onRequestSurvey?: () => void;
};

export function PastPapersLegacyLinks({ current, onRequestSurvey }: Props) {
  const router = useRouter();
  const [defaultLayout, setDefaultLayout] = useState<PastPapersUiPreference>(
    () => readPastPapersUiPreference(),
  );

  const handleDefaultChange = (value: string) => {
    if (value === "ask") {
      clearPastPapersUiSurveyChoice();
      onRequestSurvey?.();
      return;
    }
    if (value !== "home" && value !== "library") return;
    setDefaultLayout(value);
    const href = applyPastPapersUiPreference(value, "toggle");
    if (href !== pathForCurrent(current)) {
      router.push(href);
    }
  };

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 sm:mb-5">
      <p className="text-xs text-text-muted">
        Prefer a different layout?{" "}
        {current === "home" ? (
          <>
            Open legacy{" "}
            <Link
              href={PAST_PAPERS_LIBRARY_PATH}
              className="font-medium text-text underline underline-offset-2 hover:text-primary"
            >
              Library
            </Link>
            {" · "}
            <Link
              href={PAST_PAPERS_ROADMAP_PATH}
              className="font-medium text-text underline underline-offset-2 hover:text-primary"
            >
              Roadmap
            </Link>
          </>
        ) : (
          <>
            Open{" "}
            <Link
              href={PAST_PAPERS_ROADMAP_PATH}
              className="font-medium text-text underline underline-offset-2 hover:text-primary"
            >
              Roadmap
            </Link>
            {" · "}
            <Link
              href={PAST_PAPERS_HOME_PATH}
              className="font-medium text-text underline underline-offset-2 hover:text-primary"
            >
              Home
            </Link>
          </>
        )}
      </p>

      <label className="flex items-center gap-2 text-xs text-text-muted">
        <span className="whitespace-nowrap">Default layout</span>
        <select
          value={defaultLayout}
          onChange={(e) => handleDefaultChange(e.target.value)}
          className="rounded-sm border-0 bg-background px-2 py-1.5 text-xs font-medium text-text outline-none ring-1 ring-border-subtle"
          aria-label="Default Past Papers layout"
        >
          <option value="home">Home</option>
          <option value="library">Library</option>
          <option value="ask">Ask me again…</option>
        </select>
      </label>
    </div>
  );
}

function pathForCurrent(current: "home" | "library"): string {
  return current === "library"
    ? PAST_PAPERS_LIBRARY_PATH
    : PAST_PAPERS_HOME_PATH;
}
