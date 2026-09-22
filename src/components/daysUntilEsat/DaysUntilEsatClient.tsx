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

  const timeUnits = [
    {
      value: ready ? parts.hours : 0,
      label: unitLabel(parts.hours, "hour", "hours"),
    },
    {
      value: ready ? parts.minutes : 0,
      label: unitLabel(parts.minutes, "minute", "minutes"),
    },
    {
      value: ready ? parts.seconds : 0,
      label: unitLabel(parts.seconds, "second", "seconds"),
    },
  ] as const;

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-6 py-16">
      <div
        className="flex flex-col items-center"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="flex items-baseline gap-2">
          <span className="font-display text-[clamp(4.5rem,16vw,8rem)] font-semibold leading-none tracking-tight text-text tabular-nums">
            {ready ? parts.days : "·"}
          </span>
          <span className="text-[clamp(0.85rem,2.2vw,1.15rem)] leading-none text-text-muted">
            {unitLabel(parts.days, "day", "days")}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-baseline justify-center gap-x-5 gap-y-2 sm:gap-x-7">
          {timeUnits.map((unit) => (
            <div key={unit.label} className="flex items-baseline gap-1.5">
              <span className="font-display text-[clamp(1.75rem,6vw,3.25rem)] font-semibold leading-none tracking-tight text-text tabular-nums">
                {unit.value}
              </span>
              <span className="text-[clamp(0.7rem,1.8vw,0.95rem)] leading-none text-text-muted">
                {unit.label}
              </span>
            </div>
          ))}
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
