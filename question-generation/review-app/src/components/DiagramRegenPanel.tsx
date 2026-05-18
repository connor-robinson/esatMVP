"use client";

import { useState, useEffect, useRef } from "react";
import { RefreshCw, AlertCircle, CheckCircle2, Wand2 } from "lucide-react";
import type { ReviewQuestion } from "@/types/review";
import { cn } from "@/lib/utils";

type Props = {
  question: ReviewQuestion;
  onRequestRegen?: (userNote: string) => Promise<ReviewQuestion | null>;
  onPollStatus?: () => Promise<void>;
};

function statusToLabel(s: ReviewQuestion["diagram_regen_status"]): string {
  switch (s) {
    case "queued":
      return "Queued — waiting for worker";
    case "in_progress":
      return "Regenerating in the background";
    case "done":
      return "New diagram applied";
    case "failed":
      return "Last regen attempt failed";
    default:
      return "";
  }
}

function fmtTime(iso?: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function DiagramRegenPanel({ question, onRequestRegen, onPollStatus }: Props) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const status = question.diagram_regen_status ?? null;
  const pending = status === "queued" || status === "in_progress";

  /** Reset the note textarea when switching to another question. */
  useEffect(() => {
    setNote("");
    setError(null);
  }, [question.id]);

  /** Poll the server for status while a job is in flight. Stops once status
   * settles (done / failed / null) or the row id changes. */
  useEffect(() => {
    if (!pending || !onPollStatus) return;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      void onPollStatus();
    }, 6000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [pending, onPollStatus, question.id]);

  const handleClick = async () => {
    if (!onRequestRegen) return;
    setError(null);
    setSubmitting(true);
    try {
      await onRequestRegen(note.trim());
      setNote("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const statusLabel = statusToLabel(status);
  const requestedAt = question.diagram_regen_requested_at;
  const completedAt = question.diagram_regen_completed_at;
  const reason = question.diagram_regen_reason;
  const newPrompt = question.diagram_regen_new_prompt;
  const lastError = question.diagram_regen_last_error;
  const visualTypeLabel =
    question.visual_type && question.visual_type !== "none"
      ? question.visual_type.replace(/_/g, " ")
      : "diagram";

  return (
    <div className="rounded-xl bg-sky-500/[0.08] ring-1 ring-sky-400/35 px-4 py-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-mono text-sky-200/95 leading-relaxed">
          This question has a {visualTypeLabel}.
          {question.visual_renderer ? (
            <span className="text-white/45"> · renderer: {question.visual_renderer}</span>
          ) : null}
        </div>
        {status ? (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded-organic-sm",
              status === "queued" &&
                "bg-amber-500/25 text-amber-100 ring-1 ring-amber-400/50",
              status === "in_progress" &&
                "bg-amber-500/30 text-amber-100 ring-1 ring-amber-400/60",
              status === "done" &&
                "bg-emerald-500/25 text-emerald-100 ring-1 ring-emerald-400/50",
              status === "failed" &&
                "bg-rose-500/25 text-rose-100 ring-1 ring-rose-400/50"
            )}
          >
            {status === "in_progress" || status === "queued" ? (
              <RefreshCw
                className={cn("w-3 h-3 shrink-0", status === "in_progress" && "animate-spin")}
                aria-hidden
              />
            ) : status === "failed" ? (
              <AlertCircle className="w-3 h-3 shrink-0" aria-hidden />
            ) : (
              <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden />
            )}
            {statusLabel}
          </span>
        ) : null}
      </div>

      {pending ? (
        <p className="text-[11px] font-mono text-white/60 leading-relaxed">
          The Python worker will pick this up, run a Gemini Vision audit of the current
          diagram + stem, draft a stricter Imagen prompt, generate a new image, upload it
          to Supabase Storage, and overwrite the stem. Safe to leave this page —
          progress persists to the database.
          {requestedAt ? (
            <span className="text-white/35"> · Requested {fmtTime(requestedAt)}</span>
          ) : null}
        </p>
      ) : null}

      {!pending && status === "done" ? (
        <p className="text-[11px] font-mono text-emerald-100/85 leading-relaxed">
          Worker replaced the diagram{completedAt ? ` at ${fmtTime(completedAt)}` : ""}. The
          updated stem is shown below.
        </p>
      ) : null}

      {reason ? (
        <details className="rounded-md bg-black/20 ring-1 ring-white/10 px-3 py-2 text-[11px] text-white/85 font-mono">
          <summary className="cursor-pointer text-sky-200/90">Why the worker rejected the previous diagram</summary>
          <pre className="mt-2 whitespace-pre-wrap text-white/80 leading-relaxed">{reason}</pre>
          {newPrompt ? (
            <>
              <div className="mt-3 text-sky-200/90">Rewritten Imagen prompt</div>
              <pre className="mt-1 whitespace-pre-wrap text-white/70 leading-relaxed">{newPrompt}</pre>
            </>
          ) : null}
        </details>
      ) : null}

      {status === "failed" && lastError ? (
        <pre className="rounded-md bg-rose-500/10 ring-1 ring-rose-400/40 px-3 py-2 text-[11px] text-rose-100 font-mono whitespace-pre-wrap">
          {lastError}
        </pre>
      ) : null}

      <div className="space-y-2">
        <label className="text-[10px] font-mono uppercase tracking-wide text-white/55">
          Optional reviewer note for the worker
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder='e.g. "trolley platform is too narrow", "remove the magnetic field arrows", "make the cement bag rest on the platform, not the ground"'
          rows={2}
          disabled={submitting || pending || !onRequestRegen}
          className={cn(
            "w-full rounded-md bg-black/30 px-3 py-2 text-xs font-mono text-white/85 resize-y placeholder:text-white/35",
            "focus:outline-none focus:ring-2 focus:ring-sky-400/40 disabled:opacity-50"
          )}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-mono text-white/40">
            The worker also automatically reads the stem, the current diagram, and the
            V4 idea_plan brief — your note is added on top.
          </span>
          <button
            type="button"
            onClick={handleClick}
            disabled={submitting || pending || !onRequestRegen}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-mono",
              "bg-sky-500/25 text-sky-50 ring-1 ring-sky-400/50 hover:bg-sky-500/35",
              "disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            )}
          >
            <Wand2 className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden />
            {pending
              ? "Regen in progress…"
              : status === "done"
                ? "Regenerate again"
                : "Regenerate diagram"}
          </button>
        </div>
      </div>

      {error ? (
        <pre className="rounded-md bg-rose-500/10 ring-1 ring-rose-400/40 px-3 py-2 text-[11px] text-rose-100 font-mono whitespace-pre-wrap">
          {error}
        </pre>
      ) : null}
    </div>
  );
}
