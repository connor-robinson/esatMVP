"use client";

import Link from "next/link";
import { APP_ROUTES } from "@/lib/seo/config";

type Props = {
  onStay: () => void;
};

export function HubMoreSectionsLibraryModal({ onStay }: Props) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        aria-label="Dismiss"
        onClick={onStay}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hub-more-sections-title"
        className="relative w-full max-w-sm rounded-2xl bg-surface-elevated p-6 shadow-modal-card sm:p-8"
      >
        <div className="text-center">
          <h2
            id="hub-more-sections-title"
            className="text-lg font-semibold tracking-tight text-text sm:text-xl"
          >
            Section complete
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            To sit more sections, go to the past paper library.
          </p>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onStay}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#334155] px-5 text-sm font-semibold text-[#F8FAFC] transition-colors hover:bg-[#475569]"
          >
            Stay here
          </button>
          <Link
            href={APP_ROUTES.pastPaperLibrary}
            onClick={onStay}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#3B82F6] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#2563EB]"
          >
            Open the library
          </Link>
        </div>
      </div>
    </div>
  );
}
