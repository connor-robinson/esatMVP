/**
 * Delayed Home vs Library preference questionnaire.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PastPapersPreferenceChooser } from "@/components/papers/PastPapersPreferenceChooser";
import {
  PAST_PAPERS_SURVEY_DELAY_MS,
  applyPastPapersUiPreference,
  hasCompletedPastPapersUiSurvey,
  hydratePastPapersUiPreferenceFromServer,
  type PastPapersUiPreference,
} from "@/lib/papers/pastPapersUiPreference";

type Props = {
  /** Force-open (e.g. Change default), skip the dwell timer. */
  forceOpen?: boolean;
  onClose?: () => void;
};

export function PastPapersPreferenceSurvey({
  forceOpen = false,
  onClose,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    void (async () => {
      await hydratePastPapersUiPreferenceFromServer();
      if (cancelled) return;

      if (forceOpen) {
        setOpen(true);
        return;
      }

      if (hasCompletedPastPapersUiSurvey()) return;

      timer = setTimeout(() => {
        if (cancelled) return;
        if (hasCompletedPastPapersUiSurvey()) return;
        setOpen(true);
      }, PAST_PAPERS_SURVEY_DELAY_MS);
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [forceOpen]);

  if (!open) return null;

  const close = () => {
    setOpen(false);
    onClose?.();
  };

  const handleChoose = (preference: PastPapersUiPreference) => {
    const href = applyPastPapersUiPreference(preference, "survey");
    setOpen(false);
    onClose?.();
    router.replace(href);
  };

  return (
    <div
      className="past-papers-theme fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="past-papers-pref-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="Dismiss"
        onClick={close}
      />
      <div className="relative z-[101] w-full max-w-2xl rounded-sm border border-border-subtle bg-surface-elevated p-5 shadow-modal-card sm:p-6">
        <div id="past-papers-pref-title" className="sr-only">
          Which Past Papers layout do you prefer?
        </div>
        <PastPapersPreferenceChooser onChoose={handleChoose} compact />
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={close}
            className="rounded-sm px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-mid hover:text-text"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
