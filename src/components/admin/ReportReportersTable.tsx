"use client";

import type { ReportedQuestionReporter } from "@/lib/admin/reportedQuestions";
import { cn } from "@/lib/utils";

function reporterName(row: ReportedQuestionReporter): string {
  if (row.username && row.email) return `${row.username} (${row.email})`;
  return row.username || row.email || "Unknown user";
}

function whyText(row: ReportedQuestionReporter): string {
  const reason = row.reason?.trim() || "Question report";
  const message = row.message?.trim() || "";
  if (!message) return reason;
  // Message often repeats "Issue: …" then details.
  const cleaned = message.replace(/^Issue:\s*/i, "").trim();
  if (!cleaned || cleaned === reason) return reason;
  if (cleaned.toLowerCase().startsWith(reason.toLowerCase())) return cleaned;
  return `${reason}: ${cleaned}`;
}

export function ReportReportersTable({
  reporters,
  activeTicketId,
}: {
  reporters: ReportedQuestionReporter[];
  activeTicketId?: string;
}) {
  const rows = reporters.length > 0 ? reporters : [];

  return (
    <section
      className="rounded-organic-xl border-2 border-amber-500/40 bg-amber-50/70 px-4 py-4 dark:bg-amber-950/40"
      aria-label="Who reported this question"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800 dark:text-amber-200">
            Reports on this question
          </p>
          <p className="mt-1 text-sm font-medium text-text">
            Who reported it and why
          </p>
        </div>
        <p className="text-xs text-text-muted tabular-nums">
          {rows.length} report{rows.length === 1 ? "" : "s"}
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-text-muted">No reporter details.</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-organic-lg border border-amber-500/25 bg-surface-elevated">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-mid/70 text-xs uppercase tracking-[0.08em] text-text-muted">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Who</th>
                <th className="px-3 py-2.5 font-semibold">Why</th>
                <th className="px-3 py-2.5 font-semibold">When</th>
                <th className="px-3 py-2.5 font-semibold">Ticket</th>
                <th className="px-3 py-2.5 font-semibold">Thank-you</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const active = row.ticketId === activeTicketId;
                return (
                  <tr
                    key={row.ticketId}
                    className={cn(
                      "border-t border-border-subtle align-top",
                      active && "bg-secondary/10",
                    )}
                  >
                    <td className="px-3 py-2.5 text-text">
                      <span className="font-medium">{reporterName(row)}</span>
                      {active ? (
                        <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                          Viewing
                        </span>
                      ) : null}
                    </td>
                    <td className="max-w-md px-3 py-2.5 text-text">
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {whyText(row)}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-text-muted">
                      {row.reportedAt}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex rounded-organic-md bg-surface-mid px-2 py-0.5 text-xs font-medium capitalize text-text">
                        {row.ticketStatus.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {row.thankYouSent ? (
                        <span className="inline-flex rounded-organic-md bg-[#2E79B5]/20 px-2 py-0.5 text-xs font-semibold text-text">
                          Thank you sent
                        </span>
                      ) : (
                        <span className="text-xs text-text-subtle">Not sent</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
