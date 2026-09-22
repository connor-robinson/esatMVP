"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  countdownUntilIso,
  formatDayLabel,
  loadStoredEsatDate,
  resolveEsatDate,
  saveStoredEsatDate,
  selectableDateIsos,
  type CountdownParts,
} from "@/lib/esat/sittingDates";

const ZERO: CountdownParts = { days: 0, hours: 0, minutes: 0, seconds: 0 };

function unitLabel(value: number, singular: string, plural: string) {
  return value === 1 ? singular : plural;
}

export function DaysUntilEsatClient() {
  const [dateIso, setDateIso] = useState(() => resolveEsatDate(null));
  const [ready, setReady] = useState(false);
  const [parts, setParts] = useState<CountdownParts>(ZERO);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setDateIso(resolveEsatDate(loadStoredEsatDate()));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveStoredEsatDate(dateIso);
  }, [ready, dateIso]);

  useEffect(() => {
    if (!ready) return;
    const tick = () => {
      const now = new Date();
      setNowMs(now.getTime());
      const next = resolveEsatDate(dateIso, now);
      if (next !== dateIso) {
        setDateIso(next);
        setParts(countdownUntilIso(next, now));
        return;
      }
      setParts(countdownUntilIso(dateIso, now));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [ready, dateIso]);

  const dayOptions = useMemo(
    () => selectableDateIsos(new Date(nowMs)),
    [nowMs],
  );

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
          className="h-11 w-full cursor-pointer appearance-none rounded-none border-0 bg-surface-elevated py-2 pl-4 pr-10 text-center text-sm font-medium text-text shadow-none outline-none ring-0 transition-colors hover:bg-surface-mid focus:border-0 focus:outline-none focus:ring-0"
        >
          {dayOptions.map((iso) => (
            <option key={iso} value={iso} className="bg-surface-elevated text-text">
              {formatDayLabel(iso)}
            </option>
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
