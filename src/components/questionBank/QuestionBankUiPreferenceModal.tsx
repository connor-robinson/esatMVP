"use client";

interface QuestionBankUiPreferenceModalProps {
  open: boolean;
  onChooseEsat: () => void;
  onChooseClassic: () => void;
  onSkip: () => void;
}

export function QuestionBankUiPreferenceModal({
  open,
  onChooseEsat,
  onChooseClassic,
  onSkip,
}: QuestionBankUiPreferenceModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4"
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-organic-xl bg-surface-elevated p-6 shadow-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qb-ui-pref-title"
      >
        <h2
          id="qb-ui-pref-title"
          className="text-lg font-semibold tracking-tight text-text"
        >
          Which practice layout do you prefer?
        </h2>
        <p className="mt-2 text-sm text-text-muted">
          You have tried the new exam-style layout. Keep it, or switch back to
          the classic question bank UI. You can change this later with Classic
          UI in the header.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            className="rounded-organic-lg bg-secondary px-4 py-3 text-sm font-bold text-background shadow-glow transition-all hover:brightness-110"
            onClick={onChooseEsat}
          >
            Keep new layout
          </button>
          <button
            type="button"
            className="rounded-organic-lg bg-surface-mid px-4 py-3 text-sm font-semibold text-text transition-colors hover:bg-surface-neutral"
            onClick={onChooseClassic}
          >
            Prefer classic UI
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm text-text-muted transition-colors hover:text-text"
            onClick={onSkip}
          >
            Ask me later
          </button>
        </div>
      </div>
    </div>
  );
}
