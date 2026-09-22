"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_SITTING_ID,
  ESAT_SITTINGS,
  daysInSitting,
  daysUntilIso,
  defaultDateForSitting,
  formatDayLabel,
  getSitting,
  loadStoredEsatDate,
  saveStoredEsatDate,
  type EsatSittingId,
} from "@/lib/esat/sittingDates";

export function DaysUntilEsatClient() {
  const [sittingId, setSittingId] = useState<EsatSittingId>(DEFAULT_SITTING_ID);
  const [dateIso, setDateIso] = useState(defaultDateForSitting(DEFAULT_SITTING_ID));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = loadStoredEsatDate();
    if (stored) {
      setSittingId(stored.sittingId);
      setDateIso(stored.dateIso);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveStoredEsatDate({ sittingId, dateIso });
  }, [ready, sittingId, dateIso]);

  const sitting = getSitting(sittingId);
  const dayOptions = useMemo(() => daysInSitting(sitting), [sitting]);

  const days = Math.max(0, daysUntilIso(dateIso));
  const dayWord = days === 1 ? "day" : "days";

  function onSittingChange(next: EsatSittingId) {
    setSittingId(next);
    setDateIso(defaultDateForSitting(next));
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-6 py-16">
      <p
        className="font-display text-[clamp(4.5rem,18vw,9rem)] font-semibold leading-none tracking-tight text-text tabular-nums"
        aria-live="polite"
      >
        {ready ? days : "·"}
      </p>
      <p className="mt-2 text-lg text-text-muted sm:text-xl">{dayWord}</p>

      <div className="mt-14 flex flex-col items-center gap-8">
        <div
          className="flex items-center gap-5 text-sm"
          role="tablist"
          aria-label="ESAT sitting"
        >
          {ESAT_SITTINGS.map((option) => {
            const active = option.id === sittingId;
            return (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSittingChange(option.id)}
                className={
                  active
                    ? "text-text"
                    : "text-text-muted hover:text-text"
                }
              >
                {option.id === "october" ? "October" : "January"}
              </button>
            );
          })}
        </div>

        <label className="text-sm text-text-muted">
          <span className="sr-only">Your ESAT date</span>
          <select
            value={dateIso}
            onChange={(e) => setDateIso(e.target.value)}
            className="cursor-pointer appearance-none bg-transparent text-center text-base text-text outline-none"
            aria-label="Your ESAT date"
          >
            {dayOptions.map((iso) => (
              <option key={iso} value={iso}>
                {formatDayLabel(iso)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
