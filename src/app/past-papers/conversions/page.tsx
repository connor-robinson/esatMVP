"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ConversionFlipCard } from "@/components/papers/conversions/ConversionFlipCard";
import { isQuestionGenerationEnabled } from "@/lib/features";
import type { ConversionPreviewRow, ConversionRunStatus } from "@/types/conversions";
import type { Paper } from "@/types/papers";

function paperLabel(p: Paper): string {
  return `${p.examName} ${p.examYear} — ${p.paperName}`;
}

export default function ConversionsReviewPage() {
  const router = useRouter();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [paperId, setPaperId] = useState<number | "">("");
  const [limit, setLimit] = useState(10);
  const [dryRun, setDryRun] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [runStatus, setRunStatus] = useState<ConversionRunStatus>({
    status: "idle",
    total: 0,
    completed: 0,
    successful: 0,
    failed: 0,
  });
  const [conversions, setConversions] = useState<ConversionPreviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [shuffleKey, setShuffleKey] = useState(0);

  useEffect(() => {
    setEnabled(isQuestionGenerationEnabled());
  }, []);

  const loadPapers = useCallback(async () => {
    const res = await fetch("/api/past-papers/library-outline");
    if (res.ok) {
      const data = await res.json();
      const list: Paper[] = data.papers ?? [];
      setPapers(list);
      setPaperId((prev) => (prev === "" && list.length ? list[0].id : prev));
    }
  }, []);

  const loadConversions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "24" });
      if (paperId) params.set("paperId", String(paperId));
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (shuffleKey > 0) params.set("shuffle", "1");

      const res = await fetch(`/api/past-papers/conversions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setConversions(data.conversions ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [paperId, statusFilter, shuffleKey]);

  const pollStatus = useCallback(async () => {
    const res = await fetch("/api/past-papers/conversions/status");
    if (res.ok) {
      const s: ConversionRunStatus = await res.json();
      setRunStatus(s);
      setRunning(s.status === "running");
      return s;
    }
    return null;
  }, []);

  useEffect(() => {
    if (enabled === false) {
      router.replace("/");
      return;
    }
    if (enabled) {
      loadPapers();
      pollStatus();
    }
  }, [enabled, router, loadPapers, pollStatus]);

  useEffect(() => {
    if (enabled) loadConversions();
  }, [enabled, loadConversions]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(async () => {
      const s = await pollStatus();
      if (s && s.status !== "running") {
        loadConversions();
      }
    }, 2000);
    return () => clearInterval(id);
  }, [running, pollStatus, loadConversions]);

  const handleRun = async () => {
    if (!paperId) return;
    setRunning(true);
    const res = await fetch("/api/past-papers/conversions/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paperId, limit: limit || undefined, dryRun }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "Failed to start");
      setRunning(false);
      return;
    }
    pollStatus();
  };

  if (enabled === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!enabled) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-text">Past Paper Conversion Review</h1>
        <p className="text-sm text-text-muted">
          Run AI conversion on a paper, then flip cards to compare screenshots vs text output.
        </p>
      </header>

      {/* Run controls */}
      <section className="rounded-organic-lg bg-surface-mid p-5 space-y-4">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">
          Generate
        </h2>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-text-muted">Paper</span>
            <select
              value={paperId}
              onChange={(e) => setPaperId(Number(e.target.value))}
              className="min-w-[280px] rounded-organic-md bg-surface-elevated px-3 py-2 text-text"
            >
              {papers.map((p) => (
                <option key={p.id} value={p.id}>
                  {paperLabel(p)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-text-muted">Limit</span>
            <input
              type="number"
              min={1}
              max={200}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-24 rounded-organic-md bg-surface-elevated px-3 py-2 text-text tabular-nums"
            />
          </label>

          <label className="flex items-center gap-2 pb-2 text-sm text-text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="rounded"
            />
            Dry run (no DB writes)
          </label>

          <Button
            variant="primary"
            onClick={handleRun}
            disabled={running || !paperId}
          >
            {running ? "Running…" : "Run conversion"}
          </Button>
        </div>

        {(running || runStatus.status !== "idle") && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-4 text-sm text-text-muted">
              <span className="capitalize">Status: {runStatus.status}</span>
              <span className="tabular-nums">
                {runStatus.completed}/{runStatus.total} done
              </span>
              <span className="tabular-nums text-emerald-400">
                {runStatus.successful} ok
              </span>
              <span className="tabular-nums text-red-400">
                {runStatus.failed} failed
              </span>
            </div>
            {runStatus.message && (
              <p className="text-xs text-text-muted">{runStatus.message}</p>
            )}
            {runStatus.status === "running" && runStatus.total > 0 && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{
                    width: `${Math.round((runStatus.completed / runStatus.total) * 100)}%`,
                  }}
                />
              </div>
            )}
          </div>
        )}
      </section>

      {/* Preview filters */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide mr-auto">
            Preview
          </h2>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-organic-md bg-surface-mid px-3 py-1.5 text-sm text-text"
          >
            <option value="all">All statuses</option>
            <option value="auto_approved">Auto approved</option>
            <option value="failed">Failed</option>
          </select>

          <Button variant="secondary" size="sm" onClick={() => loadConversions()}>
            Refresh
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShuffleKey((k) => k + 1)}
          >
            Shuffle preview
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : conversions.length === 0 ? (
          <p className="py-12 text-center text-text-muted">
            No conversions yet for this paper. Run conversion above to get started.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {conversions.map((row) => (
              <ConversionFlipCard key={row.id} row={row} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
