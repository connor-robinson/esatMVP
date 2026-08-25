"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
    <div className="overflow-hidden rounded-organic-xl bg-surface-elevated">
      <section
        className="space-y-3 px-4 py-5 sm:px-5 sm:py-6"
        aria-labelledby="nsaa-year-quick-converter-heading"
      >
        <h2
          id="nsaa-year-quick-converter-heading"
          className="text-base font-semibold text-text"
        >
          Quick score converter
        </h2>

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
              ESAT score
            </p>
            <p className="mt-0.5 text-2xl font-semibold tabular-nums text-text">
              {formatScaledScore(scaled)}
            </p>
          </div>
        </div>
      </section>

      <div className="relative isolate overflow-hidden">
        <Image
          src="/images/score-converter/esat-score-converter-preview.png"
          alt=""
          width={1024}
          height={768}
          className="h-36 w-full object-cover object-[center_78%] sm:h-40"
          aria-hidden
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/85 via-background/50 to-background/25"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 px-4 text-center">
          <p className="max-w-md text-sm font-medium text-text sm:text-base">
            View where you rank amongst others
          </p>
          <Link
            href={fullHref}
            className="inline-flex items-center gap-2 rounded-organic-md bg-secondary px-4 py-2 text-sm font-semibold text-background transition-colors hover:brightness-110"
          >
            Open full converter
            <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </div>
  );
}
