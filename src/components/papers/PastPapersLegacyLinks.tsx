/**
 * Small legacy switcher under Library / Roadmap pages.
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PAST_PAPERS_HUB_PATH,
  PAST_PAPERS_LIBRARY_PATH,
  PAST_PAPERS_ROADMAP_PATH,
  clearPastPapersUiPreference,
  type PastPapersUiPreference,
} from "@/lib/papers/pastPapersUiPreference";

type Props = {
  current: PastPapersUiPreference;
};

export function PastPapersLegacyLinks({ current }: Props) {
  const router = useRouter();
  const other: PastPapersUiPreference =
    current === "library" ? "roadmap" : "library";
  const otherHref =
    other === "library" ? PAST_PAPERS_LIBRARY_PATH : PAST_PAPERS_ROADMAP_PATH;
  const otherLabel = other === "library" ? "Library" : "Roadmap";

  return (
    <p className="mb-4 text-xs text-text-muted sm:mb-5">
      Prefer a different layout?{" "}
      <Link
        href={otherHref}
        className="font-medium text-text underline underline-offset-2 hover:text-primary"
      >
        Open legacy {otherLabel}
      </Link>
      {" · "}
      <button
        type="button"
        className="font-medium text-text underline underline-offset-2 hover:text-primary"
        onClick={() => {
          clearPastPapersUiPreference();
          router.push(`${PAST_PAPERS_HUB_PATH}?choose=1`);
        }}
      >
        Change default
      </button>
    </p>
  );
}
