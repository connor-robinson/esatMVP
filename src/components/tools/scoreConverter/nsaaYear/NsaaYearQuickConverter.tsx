"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  buildNsaaFullConverterHref,
  formatScaledScore,
  type NsaaSubjectColumn,
  type NsaaYearPageData,
} from "@/lib/scoreConverter/nsaaYearConversion.shared";
import { APP_ROUTES } from "@/lib/seo/config";

const controlBase =
  "border-0 shadow-none outline-none focus:outline-none focus:ring-0 focus:border-0";

const fieldClass = cn(
  "h-10 w-full rounded-organic-lg bg-surface-mid px-3 text-sm font-medium text-text",
  controlBase,
);

type Props = {
  data: NsaaYearPageData;
};

export function NsaaYearQuickConverter({ data }: Props) {
  const [subjectId, setSubjectId] = useState(data.subjects[0]?.id ?? "");
  const subject: NsaaSubjectColumn | undefined = useMemo(
    () => data.subjects.find((s) => s.id === subjectId) ?? data.subjects[0],
    [data.subjects, subjectId],
  );

  const maxRaw = subject?.maxRaw ?? 0;
  const [rawMark, setRawMark] = useState(Math.min(10, maxRaw));

  const clampedRaw = Math.max(0, Math.min(maxRaw, Number.isFinite(rawMark) ? rawMark : 0));
  const scaled =
    subject != null ? subject.scoresByRaw[clampedRaw] : undefined;

  const fullHref =
    subject != null
      ? buildNsaaFullConverterHref(subject, data.year)
      : `${APP_ROUTES.scoreConverter}?exam=nsaa&year=${data.year}`;

  return (
    <section
      className="space-y-3"
      aria-labelledby="nsaa-year-quick-converter-heading"
    >
      <div>
        <h2
          id="nsaa-year-quick-converter-heading"
          className="text-base font-semibold text-text"
        >
          Quick score converter
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Fixed to NSAA {data.year}. Pick a subject or section, enter a raw mark,
          and read the published scaled score here.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_auto] sm:items-end">
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
            Subject / section
          </span>
          <select
            className={fieldClass}
            value={subject?.id ?? ""}
            onChange={(event) => {
              const nextId = event.target.value;
              setSubjectId(nextId);
              const next = data.subjects.find((s) => s.id === nextId);
              if (next) {
                setRawMark((current) => Math.min(current, next.maxRaw));
              }
            }}
          >
            {data.subjects.map((option) => (
              <option key={option.id} value={option.id}>
                {option.filterLabel} ({option.partName})
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
            Raw mark
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={maxRaw}
            value={clampedRaw}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (!Number.isFinite(next)) {
                setRawMark(0);
                return;
              }
              setRawMark(Math.max(0, Math.min(maxRaw, Math.round(next))));
            }}
            className={fieldClass}
          />
        </label>

        <div className="rounded-organic-lg bg-surface-mid px-4 py-2.5 sm:min-w-[7.5rem]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
            Scaled score
          </p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums text-text">
            {formatScaledScore(scaled)}
          </p>
        </div>
      </div>

      <p className="text-sm text-text-muted">
        <Link
          href={fullHref}
          className="font-semibold text-secondary hover:underline"
        >
          Open the full score converter
        </Link>
        {" "}
        with NSAA, {data.year}
        {subject ? ` and ${subject.subject}` : ""} pre-selected.
      </p>
    </section>
  );
}
