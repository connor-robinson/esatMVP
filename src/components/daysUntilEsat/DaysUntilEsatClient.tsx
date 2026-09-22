"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  DEFAULT_ESAT_DATE_ISO,
  ESAT_SITTINGS,
  countdownUntilIso,
  daysInSitting,
  formatDayLabel,
  loadStoredEsatDate,
  saveStoredEsatDate,
  type CountdownParts,
} from "@/lib/esat/sittingDates";

const ZERO: CountdownParts = { days: 0, hours: 0, minutes: 0, seconds: 0 };

function unitLabel(value: number, singular: string, plural: string) {
  return value === 1 ? singular : plural;
}

export function DaysUntilEsatClient() {
  const [dateIso, setDateIso] = useState(DEFAULT_ESAT_DATE_ISO);
  const [ready, setReady] = useState(false);
  const [parts, setParts] = useState<CountdownParts>(ZERO);

  useEffect(() => {
    const stored = loadStoredEsatDate();
    if (stored) setDateIso(stored);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveStoredEsatDate(dateIso);
  }, [ready, dateIso]);

  useEffect(() => {
    if (!ready) return;
    const tick = () => setParts(countdownUntilIso(dateIso));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [ready, dateIso]);

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-6 py-16">
      <div
        className="flex items-center gap-3 sm:gap-4"
        aria-live="polite"
        aria-atomic="true"
      >
        <p className="font-display text-[clamp(4.5rem,18vw,9rem)] font-semibold leading-none tracking-tight text-text tabular-nums">
          {ready ? parts.days : "·"}
        </p>
        <div className="flex flex-col justify-center gap-0.5 text-left text-[clamp(0.7rem,2.2vw,0.95rem)] leading-snug text-text-muted tabular-nums">
          <span>{unitLabel(parts.days, "day", "days")}</span>
          <span>
            {ready ? parts.hours : 0}{" "}
            {unitLabel(parts.hours, "hour", "hours")}
          </span>
          <span>
            {ready ? parts.minutes : 0}{" "}
            {unitLabel(parts.minutes, "minute", "minutes")}
          </span>
          <span>
            {ready ? parts.seconds : 0}{" "}
            {unitLabel(parts.seconds, "second", "seconds")}
          </span>
        </div>
      </div>

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
