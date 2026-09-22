"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  DEFAULT_ESAT_DATE_ISO,
  ESAT_SITTINGS,
  daysInSitting,
  daysUntilIso,
  formatDayLabel,
  loadStoredEsatDate,
  saveStoredEsatDate,
} from "@/lib/esat/sittingDates";

export function DaysUntilEsatClient() {
  const [dateIso, setDateIso] = useState(DEFAULT_ESAT_DATE_ISO);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = loadStoredEsatDate();
    if (stored) setDateIso(stored);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveStoredEsatDate(dateIso);
  }, [ready, dateIso]);

  const days = Math.max(0, daysUntilIso(dateIso));
  const dayWord = days === 1 ? "day" : "days";

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-6 py-16">
      <p
        className="font-display text-[clamp(4.5rem,18vw,9rem)] font-semibold leading-none tracking-tight text-text tabular-nums"
        aria-live="polite"
      >
        {ready ? days : "·"}
      </p>
      <p className="mt-2 text-lg text-text-muted sm:text-xl">{dayWord}</p>

      <div className="relative mt-14 w-full max-w-[16rem]">
        <label htmlFor="esat-date" className="sr-only">
          Your ESAT date
        </label>
        <select
          id="esat-date"
          value={dateIso}
          onChange={(e) => setDateIso(e.target.value)}
          className="h-11 w-full cursor-pointer appearance-none rounded-2xl bg-surface-elevated py-2 pl-4 pr-10 text-center text-sm font-medium text-text outline-none transition-colors hover:bg-surface-mid focus:outline-none"
        >
          {ESAT_SITTINGS.map((sitting) => (
            <optgroup key={sitting.id} label={sitting.label}>
              {daysInSitting(sitting).map((iso) => (
                <option key={iso} value={iso} className="bg-surface-elevated text-text">
                  {formatDayLabel(iso)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-text-muted"
          aria-hidden
        />
      </div>
    </div>
  );
}
