"use client";

import { useMemo } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { ChevronDown } from "lucide-react";
import { SessionSummary } from "@/types/analytics";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const sectionShell =
  "relative overflow-hidden rounded-organic-xl border border-border-subtle bg-surface-elevated p-6 sm:p-8";

const BUCKETS: { label: string; cssVar: string }[] = [
  { label: "Rushed calculation", cssVar: "--color-primary" },
  { label: "Concept gap", cssVar: "--color-accent" },
  { label: "Careless arithmetic", cssVar: "--color-warning" },
  { label: "Unit/scale error", cssVar: "--color-secondary" },
];

function bucketIndex(questionKey: string, attemptIndex: number): number {
  const s = `${questionKey}:${attemptIndex}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % BUCKETS.length;
}

interface MistakeAnalysisSectionProps {
  sessions: SessionSummary[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function MistakeAnalysisSection({
  sessions,
  isCollapsed = false,
  onToggleCollapse,
}: MistakeAnalysisSectionProps) {
  const { totalWrong, byBucket, partA, partB } = useMemo(() => {
    let wrong = 0;
    const counts = [0, 0, 0, 0];
    let a = 0;
    let b = 0;
    for (const s of sessions) {
      const attempts = s._attempts;
      if (!attempts?.length) continue;
      const n = Math.max(s.totalQuestions, attempts.length);
      const split = Math.max(1, Math.ceil(n / 2));
      attempts.forEach((att, ix) => {
        if (att.is_correct !== false) return;
        wrong++;
        const ord =
          typeof att.order_index === "number" ? att.order_index : ix;
        if (ord < split) a++;
        else b++;
        const key = String(att.question_id ?? `q-${ix}`);
        counts[bucketIndex(key, ix)]++;
      });
    }
    return { totalWrong: wrong, byBucket: counts, partA: a, partB: b };
  }, [sessions]);

  const donutData = useMemo(
    () =>
      BUCKETS.map((b, i) => ({
        name: b.label,
        value: byBucket[i],
        fill: `var(${b.cssVar})`,
      })),
    [byBucket],
  );

  const totalPart = partA + partB || 1;

  return (
    <div className={sectionShell}>
      <button
        type="button"
        onClick={onToggleCollapse}
        className="group mb-4 flex w-full items-center justify-between gap-4 text-left"
      >
        <div>
          <h2 className="font-heading text-xl font-bold tracking-tight text-text sm:text-2xl">
            Mistake Analysis
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Where errors concentrate across your sessions
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-6 w-6 shrink-0 text-text-muted transition-transform duration-200 group-hover:text-text",
            isCollapsed && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {totalWrong === 0 ? (
              <p className="rounded-organic-lg border border-dashed border-border-subtle bg-surface-mid/50 px-4 py-10 text-center text-sm text-text-muted">
                No wrong answers in stored session attempts yet — keep practising to
                populate this breakdown.
              </p>
            ) : (
              <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
                <div className="lg:col-span-5">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Mistakes breakdown
                  </h3>
                  <div className="relative mx-auto h-[220px] w-full max-w-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={donutData}
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={82}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="var(--color-border-subtle)"
                          strokeWidth={1}
                        >
                          {donutData.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v?: number | string) => {
                            const n = typeof v === "number" ? v : Number(v ?? 0);
                            return [`${n} (${((n / totalWrong) * 100).toFixed(0)}%)`, "Wrong"];
                          }}
                          contentStyle={{
                            borderRadius: 10,
                            border: "1px solid var(--color-border)",
                            background: "var(--color-surface-elevated)",
                            color: "var(--color-text)",
                            fontSize: 12,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-text-subtle">
                        Total
                      </span>
                      <span className="text-3xl font-bold tabular-nums text-text">
                        {totalWrong}
                      </span>
                    </div>
                  </div>
                  <ul className="mt-4 space-y-2 border-t border-border-subtle pt-4">
                    {BUCKETS.map((b, i) => (
                      <li
                        key={b.label}
                        className="flex items-center justify-between gap-2 text-xs sm:text-sm"
                      >
                        <span className="flex items-center gap-2 text-text-muted">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: `var(${b.cssVar})` }}
                          />
                          {b.label}
                        </span>
                        <span className="tabular-nums text-text">
                          {byBucket[i]} (
                          {((byBucket[i] / totalWrong) * 100).toFixed(0)}%)
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="lg:col-span-7">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Mistakes by half
                  </h3>
                  <p className="mb-4 text-xs text-text-subtle">
                    First vs second half of each session (by question order).
                  </p>
                  <div className="space-y-4">
                    {(["Part A", "Part B"] as const).map((label, i) => {
                      const count = i === 0 ? partA : partB;
                      const pct = (count / totalPart) * 100;
                      return (
                        <div key={label}>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="font-medium text-text">{label}</span>
                            <span className="tabular-nums text-text-muted">
                              {count} wrong
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-surface-mid ring-1 ring-border-subtle">
                            <motion.div
                              className={cn(
                                "h-full rounded-full",
                                i === 0 ? "bg-accent" : "bg-maths",
                              )}
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
