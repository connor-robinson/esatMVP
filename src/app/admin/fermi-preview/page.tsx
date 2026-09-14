"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import type { FermiBatchQuestion } from "@/lib/fermi/batchQuestion";
import { cn } from "@/lib/utils";

type DayBundle = {
  date: string;
  editionTitle: string | null;
  questionCount: number;
  factCount: number;
  questions: FermiBatchQuestion[];
};

type PreviewPayload = {
  meta: {
    batchId: string;
    title: string;
    startDate: string;
    endDate: string;
    generatedAt?: string;
    model?: string;
  };
  dayCount: number;
  questionCount: number;
  days: DayBundle[];
};

function formatAnswer(n: number, unit?: string): string {
  const abs = Math.abs(n);
  let core: string;
  if (abs >= 1e12 || (abs > 0 && abs < 1e-3)) {
    core = n.toExponential(3);
  } else if (abs >= 1000) {
    core = n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  } else {
    core = String(n);
  }
  return unit ? `${core} ${unit}` : core;
}

export default function FermiPreviewPage() {
  const [batch, setBatch] = useState<"02" | "01">("02");
  const [data, setData] = useState<PreviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [factsOnly, setFactsOnly] = useState(false);

  const load = useCallback(async (which: "02" | "01") => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/fermi-preview?batch=${which}`);
      const json = (await res.json()) as PreviewPayload & { error?: string };
      if (!res.ok) {
        setData(null);
        setError(json.error || "Failed to load batch");
        return;
      }
      setData(json);
      setSelectedDate((prev) => {
        if (prev && json.days.some((d) => d.date === prev)) return prev;
        return json.days[0]?.date ?? null;
      });
    } catch (err) {
      setError(String(err));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(batch);
  }, [batch, load]);

  const day = useMemo(
    () => data?.days.find((d) => d.date === selectedDate) ?? null,
    [data, selectedDate],
  );

  const visibleQuestions = useMemo(() => {
    if (!day) return [];
    if (!factsOnly) return day.questions;
    return day.questions.filter((q) => q.showDidYouKnow);
  }, [day, factsOnly]);

  return (
    <Container className="py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Local preview
          </p>
          <h1 className="font-serif text-3xl text-text">FermiGuessr month</h1>
          <p className="mt-1 max-w-xl text-sm text-text-muted">
            Browse generated daily rounds before seeding. Regenerate with{" "}
            <code className="rounded bg-surface-elevated px-1.5 py-0.5 text-xs">
              npx tsx scripts/generate-fermi-month.ts
            </code>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setBatch("02")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-semibold",
              batch === "02"
                ? "bg-secondary text-white"
                : "bg-surface-elevated text-text",
            )}
          >
            Batch 02
          </button>
          <button
            type="button"
            onClick={() => setBatch("01")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-semibold",
              batch === "01"
                ? "bg-secondary text-white"
                : "bg-surface-elevated text-text",
            )}
          >
            Batch 01
          </button>
          <button
            type="button"
            onClick={() => void load(batch)}
            className="rounded-lg bg-surface-elevated px-3 py-1.5 text-sm font-semibold text-text"
          >
            Reload
          </button>
          <Link
            href="/mental-maths/fermiguessr"
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-primary underline-offset-2 hover:underline"
          >
            Open game
          </Link>
        </div>
      </div>

      {loading && (
        <p className="text-sm text-text-muted">Loading batch…</p>
      )}
      {error && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="mb-4 flex flex-wrap gap-4 text-sm text-text-muted">
            <span>
              <strong className="text-text">{data.questionCount}</strong> questions
            </span>
            <span>
              <strong className="text-text">{data.dayCount}</strong> days
            </span>
            <span>
              {data.meta.startDate} → {data.meta.endDate}
            </span>
            {data.meta.model && <span>model: {data.meta.model}</span>}
            {data.meta.generatedAt && (
              <span>
                generated {new Date(data.meta.generatedAt).toLocaleString()}
              </span>
            )}
            <label className="ml-auto flex items-center gap-2 text-text">
              <input
                type="checkbox"
                checked={factsOnly}
                onChange={(e) => setFactsOnly(e.target.checked)}
              />
              Fact cards only
            </label>
          </div>

          <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
            <aside className="max-h-[70vh] overflow-y-auto rounded-xl bg-surface-elevated p-2">
              {data.days.map((d) => {
                const active = d.date === selectedDate;
                return (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => setSelectedDate(d.date)}
                    className={cn(
                      "mb-1 flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm transition",
                      active
                        ? "bg-secondary text-white"
                        : "hover:bg-surface",
                    )}
                  >
                    <span className="font-semibold tabular-nums">{d.date}</span>
                    <span
                      className={cn(
                        "text-xs",
                        active ? "text-white/80" : "text-text-muted",
                      )}
                    >
                      {d.editionTitle
                        ? d.editionTitle
                        : `${d.questionCount} Qs · ${d.factCount} fact`}
                    </span>
                  </button>
                );
              })}
            </aside>

            <section>
              {!day ? (
                <p className="text-sm text-text-muted">Pick a day.</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h2 className="font-serif text-2xl text-text">
                      {day.date}
                      {day.editionTitle ? (
                        <span className="ml-2 text-lg text-secondary">
                          · {day.editionTitle}
                        </span>
                      ) : null}
                    </h2>
                    <p className="text-sm text-text-muted">
                      {day.questionCount} questions · {day.factCount} Did you
                      know card
                      {day.factCount === 1 ? "" : "s"}
                    </p>
                  </div>

                  {visibleQuestions.map((q, idx) => (
                    <article
                      key={q.id}
                      className={cn(
                        "rounded-2xl border border-border/60 bg-surface p-4",
                        q.showDidYouKnow && "ring-2 ring-secondary/40",
                      )}
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                        <span>#{idx + 1}</span>
                        <span>·</span>
                        <span>{q.category}</span>
                        <span>·</span>
                        <span>{q.difficulty}</span>
                        {q.exact && <span>· exact</span>}
                        {q.isSeasonal && <span>· seasonal</span>}
                        {q.showDidYouKnow && (
                          <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-secondary">
                            Did you know
                          </span>
                        )}
                      </div>
                      <p className="font-serif text-xl leading-snug text-text">
                        {q.question}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-primary">
                        Answer: {formatAnswer(q.answer, q.unit)}
                      </p>
                      {q.themeHook && (
                        <p className="mt-1 text-xs text-text-muted">
                          Hook: {q.themeHook}
                        </p>
                      )}
                      {q.sourceNote && (
                        <p className="mt-1 text-xs text-text-muted">
                          Note: {q.sourceNote}
                        </p>
                      )}
                      {q.showDidYouKnow && q.didYouKnow && (
                        <div className="mt-3 rounded-xl bg-surface-elevated px-3 py-2.5">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                            Did you know?
                          </p>
                          <p className="mt-1 text-sm leading-snug text-text">
                            {q.didYouKnow}
                          </p>
                          {q.factSourceUrl && (
                            <a
                              href={q.factSourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1.5 inline-block text-xs font-semibold text-primary underline-offset-2 hover:underline"
                            >
                              {q.factSourceLabel || "Source"}
                            </a>
                          )}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </Container>
  );
}
