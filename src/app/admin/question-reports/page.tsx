"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import type {
  QuestionReportStatusFilter,
  ReportedQuestionItem,
} from "@/lib/admin/reportedQuestions";
import { cn } from "@/lib/utils";

const FILTERS: { id: QuestionReportStatusFilter; label: string; description: string }[] = [
  { id: "open", label: "Not Checked", description: "Reports waiting for admin review" },
  { id: "resolved", label: "Reviewed", description: "Reports that have been checked and resolved" },
  { id: "all", label: "All Reports", description: "Every report regardless of status" },
];

function reporterLabel(meta: ReportedQuestionItem["meta"]): string {
  if (meta.username && meta.email) return `${meta.username} (${meta.email})`;
  return meta.username || meta.email || "Unknown user";
}

function statusBadge(status: string): string {
  if (status === "open" || status === "in_progress") {
    return "bg-amber-500/20 text-amber-900 dark:text-amber-200";
  }
  if (status === "resolved" || status === "closed") {
    return "bg-secondary/20 text-text";
  }
  return "bg-surface-mid text-text-muted";
}

export default function AdminQuestionReportsDashboardPage() {
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<QuestionReportStatusFilter>("open");
  const [items, setItems] = useState<ReportedQuestionItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(
      `/api/admin/question-reports?status=${encodeURIComponent(status)}`,
      { cache: "no-store" },
    );
    if (res.status === 401 || res.status === 403) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof json.error === "string" ? json.error : "Failed to load");
      setLoading(false);
      return;
    }
    setItems((json.items ?? []) as ReportedQuestionItem[]);
    setLoading(false);
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCount = useMemo(() => {
    return items.filter(item => 
      item.meta.ticketStatus === "open" || item.meta.ticketStatus === "in_progress"
    ).length;
  }, [items]);

  if (forbidden) {
    return (
      <Container size="md" className="py-16">
        <p className="text-sm text-text-muted">Admin only.</p>
      </Container>
    );
  }

  const currentFilter = FILTERS.find(f => f.id === status) || FILTERS[0];

  return (
    <Container size="xl" className="py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Question Reports</h1>
          <p className="mt-2 text-sm text-text-muted">
            {currentFilter.description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/question-reports/review?status=${encodeURIComponent(status)}`}
            className="bg-primary/25 px-4 py-2 text-sm font-semibold text-text"
          >
            Open Reviewer
          </Link>
          <button
            type="button"
            onClick={() => void load()}
            className="bg-surface-mid px-4 py-2 text-sm font-medium text-text"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setStatus(filter.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors",
              status === filter.id
                ? "bg-primary/25 text-text"
                : "bg-surface-mid text-text-muted hover:text-text",
            )}
          >
            <div className="flex items-center gap-2">
              <span>{filter.label}</span>
              {filter.id === "open" && openCount > 0 ? (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-bold tabular-nums">
                  {openCount}
                </span>
              ) : null}
            </div>
          </button>
        ))}
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      {loading && items.length === 0 ? (
        <div className="mt-8 text-center">
          <p className="text-sm text-text-muted">Loading reports…</p>
        </div>
      ) : items.length === 0 ? (
        <div className="mt-8 border border-border-subtle bg-surface-elevated px-6 py-12 text-center">
          <p className="text-lg font-semibold text-text">
            {status === "open" ? "All clear!" : "No reports found"}
          </p>
          <p className="mt-2 text-sm text-text-muted">
            {status === "open" 
              ? "There are no question reports waiting for review."
              : "No reports match the current filter."}
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((item) => (
            <div
              key={item.meta.ticketId}
              className="border border-border-subtle bg-surface-elevated px-5 py-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span
                      className={cn(
                        "inline-flex items-center px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
                        statusBadge(item.meta.ticketStatus),
                      )}
                    >
                      {item.meta.ticketStatus.replace("_", " ")}
                    </span>
                    <span className="text-xs text-text-subtle">
                      {item.meta.reportedAt}
                    </span>
                    {item.meta.thankYouSent ? (
                      <span className="inline-flex items-center bg-secondary/20 px-2 py-0.5 text-xs font-semibold text-text">
                        Thank-you sent
                      </span>
                    ) : null}
                  </div>
                  
                  <h3 className="mt-3 text-base font-semibold text-text">
                    {item.meta.reason}
                  </h3>
                  
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 text-sm">
                    <div>
                      <span className="text-text-muted">Reporter: </span>
                      <span className="text-text font-medium">
                        {reporterLabel(item.meta)}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted">Subject: </span>
                      <span className="text-text font-medium">
                        {item.meta.db.subjects}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted">Topic: </span>
                      <span className="text-text">
                        {item.meta.topicLabel}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted">Question status: </span>
                      <span className="text-text capitalize">
                        {item.meta.db.status}
                      </span>
                    </div>
                  </div>

                  {item.meta.reporters.length > 1 ? (
                    <p className="mt-2 text-xs text-primary font-medium">
                      {item.meta.reporters.length} reports for this question
                    </p>
                  ) : null}
                </div>
                
                <Link
                  href={`/admin/question-reports/review?status=${encodeURIComponent(status)}&ticket=${encodeURIComponent(item.meta.ticketId)}`}
                  className="shrink-0 bg-primary/25 px-4 py-2 text-sm font-semibold text-text hover:bg-primary/30"
                >
                  Review
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-6 border-t border-border-subtle pt-6">
          <p className="text-sm text-text-muted">
            Showing {items.length} report{items.length === 1 ? "" : "s"}
            {status === "open" && openCount > 0 ? (
              <span className="ml-2 text-primary font-medium">
                ({openCount} waiting for review)
              </span>
            ) : null}
          </p>
          <p className="mt-2 text-xs text-text-subtle">
            💡 Reported questions are automatically hidden from the question bank until reviewed
          </p>
        </div>
      )}
    </Container>
  );
}
