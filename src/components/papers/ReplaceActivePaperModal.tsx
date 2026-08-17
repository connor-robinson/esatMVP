'use client';

import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';

type ReplaceActivePaperModalProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onResume?: () => void;
  isConfirming?: boolean;
  isResuming?: boolean;
};

export function ReplaceActivePaperModal({
  open,
  onCancel,
  onConfirm,
  onResume,
  isConfirming = false,
  isResuming = false,
}: ReplaceActivePaperModalProps) {
  if (!open || typeof window === 'undefined') return null;

  const busy = isConfirming || isResuming;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="replace-paper-title"
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-md rounded-organic-lg border border-white/15 bg-[#1a1f27] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <div className="flex items-center gap-3">
            <AlertTriangle
              className="h-5 w-5 shrink-0 text-amber-400"
              strokeWidth={2.2}
            />
            <h2
              id="replace-paper-title"
              className="text-lg font-semibold text-white"
            >
              Paper already in progress
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg p-2 text-white/50 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-40"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-5 text-sm leading-relaxed text-white/75">
          <p>
            You already have a past paper session in progress. Starting this
            paper will <span className="font-medium text-white">end that session</span>{' '}
            and you will{' '}
            <span className="font-medium text-amber-200/90">
              lose unsaved progress
            </span>{' '}
            on the current paper.
          </p>
          <p className="text-white/50 text-xs">
            To continue where you left off, resume your saved session — the
            progress bar will reappear when you return to the paper.
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-white/10 p-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-organic-md px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 disabled:opacity-40"
          >
            Cancel
          </button>
          {onResume && (
            <button
              type="button"
              onClick={onResume}
              disabled={busy}
              className="rounded-organic-md bg-accent px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              {isResuming ? 'Resuming…' : 'Resume session'}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-organic-md bg-amber-600/90 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
          >
            {isConfirming ? 'Starting…' : 'Start anyway'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
