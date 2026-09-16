/**
 * Layout strip: default-layout dropdown only (right-aligned).
 */

"use client";

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
  current: PastPapersUiPreference;
  /** Open the delayed survey immediately (change default). */
  onRequestSurvey?: () => void;
  className?: string;
};

export function PastPapersLegacyLinks({
  current,
  onRequestSurvey,
  className,
}: Props) {
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
    if (value !== "home" && value !== "library" && value !== "roadmap") {
      return;
    }
    setDefaultLayout(value);
    const href = applyPastPapersUiPreference(value, "toggle");
    if (href !== pathForPreference(current)) {
      router.push(href);
    }
  };

  return (
    <div
      className={
        className ??
        "flex flex-wrap items-center justify-end gap-x-3 gap-y-2 text-xs text-text-muted"
      }
    >
      <label className="flex items-center gap-2">
        <span className="whitespace-nowrap">Default layout</span>
        <select
          value={defaultLayout}
          onChange={(e) => handleDefaultChange(e.target.value)}
          className="rounded-sm border-0 bg-background px-2 py-1.5 text-xs font-medium text-text outline-none"
          aria-label="Default Past Papers layout"
        >
          <option value="home">Home</option>
          <option value="roadmap">Roadmap</option>
          <option value="library">Library</option>
          <option value="ask">Ask me again…</option>
        </select>
      </label>
    </div>
  );
}

function pathForPreference(preference: PastPapersUiPreference): string {
  if (preference === "library") return PAST_PAPERS_LIBRARY_PATH;
  if (preference === "roadmap") return PAST_PAPERS_ROADMAP_PATH;
  return PAST_PAPERS_HOME_PATH;
}
