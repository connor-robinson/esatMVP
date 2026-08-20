import Link from "next/link";
import {
  OVERLAP_RULES_2016_2019,
  OVERLAP_RULES_2020_2023,
  UNIQUE_ENGAA_PART_B_BY_YEAR,
} from "@/content/pastPapersGuide";
import { SEO_ROUTES } from "@/lib/seo/config";
import { cn } from "@/lib/utils";

type Status = "duplicate" | "partial" | "fresh";

function statusFromRule(action: string): Status {
  if (action.includes("COMPLETE")) return "duplicate";
  if (action.includes("MOSTLY")) return "partial";
  return "fresh";
}

function StatusLabel({ status }: { status: Status }) {
  if (status === "duplicate") {
    return (
      <span className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
        Duplicate
      </span>
    );
  }
  if (status === "partial") {
    return (
      <span className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
        Mostly duplicate
      </span>
    );
  }
  return (
    <span className="text-xs font-semibold uppercase tracking-wide text-white">
      Fresh
    </span>
  );
}

function EraColumn({
  title,
  rules,
}: {
  title: string;
  rules: readonly {
    engaa: string;
    nsaa: string;
    action: string;
    instruction: string;
  }[];
}) {
  const duplicates = rules.filter(
    (rule) => statusFromRule(rule.action) !== "fresh",
  );
  const fresh = rules.filter(
    (rule) => statusFromRule(rule.action) === "fresh",
  );

  return (
    <div className="space-y-4">
      <h3 className="font-mono text-sm font-bold uppercase tracking-widest text-[#94A3B8]">
        {title}
      </h3>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
          Duplicates
        </p>
        {duplicates.map((rule) => {
          const status = statusFromRule(rule.action);
          return (
            <div
              key={rule.engaa}
              className={cn(
                "rounded-xl px-4 py-3",
                status === "duplicate"
                  ? "bg-white/[0.03] opacity-60"
                  : "bg-white/[0.04]",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <StatusLabel status={status} />
                <span className="text-[11px] font-medium uppercase tracking-wide text-[#64748B]">
                  {rule.instruction.toLowerCase()}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-white">
                {rule.engaa}
              </p>
              <p className="mt-1 text-sm text-[#94A3B8]">{rule.nsaa}</p>
            </div>
          );
        })}
      </div>

      {fresh.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
            Fresh
          </p>
          {fresh.map((rule) => (
            <div
              key={rule.engaa}
              className="rounded-xl bg-white/[0.07] px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <StatusLabel status="fresh" />
                <span className="text-[11px] font-medium uppercase tracking-wide text-[#94A3B8]">
                  {rule.instruction.toLowerCase()}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-white">
                {rule.engaa}
              </p>
              <p className="mt-1 text-sm text-[#94A3B8]">{rule.nsaa}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function OverlapExplorerSection() {
  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <EraColumn title="2016–2019" rules={OVERLAP_RULES_2016_2019} />
        <EraColumn title="2020–2023" rules={OVERLAP_RULES_2020_2023} />
      </div>

      <div>
        <h3 className="font-display text-lg font-bold text-white">
          Unique ENGAA Part B questions (2016–2019)
        </h3>
        <p className="mt-2 text-sm text-[#94A3B8]">
          After NSAA Part E, only these ENGAA Part B questions are fresh.
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl bg-white/[0.03]">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-[#64748B]">
                <th className="px-4 py-3 font-semibold">Year</th>
                <th className="px-4 py-3 font-semibold">Unique question numbers</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(UNIQUE_ENGAA_PART_B_BY_YEAR).map(
                ([year, questions]) => (
                  <tr key={year} className="bg-white/[0.02]">
                    <td className="px-4 py-3 font-mono font-semibold text-white">
                      {year}
                    </td>
                    <td className="px-4 py-3 font-mono text-[#CBD5E1]">
                      Q{questions.join(", Q")}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-[#94A3B8]">
        Already done NSAA? Skip ENGAA Part A every year. For 2016–2019, do only
        the unique Part B questions above. For 2020–2023, do all of Part B. Skip
        2020–2023 ENGAA Section 2 if you already did NSAA Section 2 Part X.{" "}
        <Link
          href={SEO_ROUTES.engaaNsaaPapers}
          className="text-white underline decoration-white/25 underline-offset-4 hover:decoration-white/60"
        >
          Full question-by-question checker
        </Link>
        .
      </p>
    </div>
  );
}
