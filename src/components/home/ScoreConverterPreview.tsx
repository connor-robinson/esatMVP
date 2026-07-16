"use client";

import Link from "next/link";

const PREVIEW_SECTIONS = [
  {
    subject: "Mathematics 1",
    raw: "24",
    max: "40",
    scaled: "7.1",
    percentile: "Top 12%",
    accent: "#3B82F6",
  },
  {
    subject: "Physics",
    raw: "19",
    max: "40",
    scaled: "6.4",
    percentile: "Top 22%",
    accent: "#60A5FA",
  },
] as const;

/**
 * Static homepage preview of the ESAT score converter — fake sample data only.
 */
export function ScoreConverterPreview() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#161D2F] p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#3B82F6]">
            Score converter
          </p>
          <p className="mt-1 text-sm text-[#94A3B8]">
            NSAA 2023 · sample result
          </p>
        </div>
        <span className="rounded-lg bg-[#3B82F6]/15 px-2.5 py-1 text-[11px] font-semibold text-[#93C5FD]">
          Maps to ESAT
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-[#0A0F1D]/70 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
            Exam
          </p>
          <p className="mt-1 text-sm font-semibold text-white">NSAA</p>
        </div>
        <div className="rounded-xl bg-[#0A0F1D]/70 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
            Year
          </p>
          <p className="mt-1 text-sm font-semibold text-white">2023</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {PREVIEW_SECTIONS.map((section) => (
          <div
            key={section.subject}
            className="rounded-xl bg-[#0A0F1D]/70 px-4 py-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: section.accent }}
                >
                  {section.subject}
                </p>
                <p className="mt-1 text-xs text-[#94A3B8]">
                  Raw mark{" "}
                  <span className="font-semibold tabular-nums text-white">
                    {section.raw}/{section.max}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-display font-bold tabular-nums text-white">
                  {section.scaled}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-[#93C5FD]">
                  {section.percentile}
                </p>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full"
                style={{
                  width: section.subject === "Mathematics 1" ? "88%" : "78%",
                  backgroundColor: section.accent,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-xl bg-[#3B82F6]/10 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#93C5FD]">
          Overall estimate
        </p>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <p className="text-3xl font-display font-bold tabular-nums text-white">
            6.8
          </p>
          <p className="text-sm font-semibold text-[#93C5FD]">Top 16%</p>
        </div>
      </div>

      <Link
        href="/tools/score-converter"
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#3B82F6] py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#2563EB]"
      >
        Try me
        <span aria-hidden className="text-lg leading-none">
          →
        </span>
      </Link>
    </div>
  );
}
