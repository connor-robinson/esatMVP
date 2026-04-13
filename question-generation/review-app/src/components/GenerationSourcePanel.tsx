"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { isTMUAQuestion } from "@/lib/curriculum";
import type { ReviewQuestion } from "@/types/review";

function jsonPreview(data: unknown): string {
  if (data == null) return "";
  try {
    return JSON.stringify(
      data,
      (key, value) => {
        if (key === "_raw_text" && typeof value === "string" && value.length > 12000) {
          return `${value.slice(0, 12000)}\n… [truncated ${value.length - 12000} chars]`;
        }
        return value;
      },
      2
    );
  } catch {
    return String(data);
  }
}

function Fold({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-organic-md border border-white/10 bg-white/[0.02] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-mono text-white/70 hover:bg-white/[0.04] transition-colors"
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
        )}
        {title}
      </button>
      {open ? (
        <div className="px-3 pb-3 pt-0 border-t border-white/5 max-h-[min(70vh,520px)] overflow-auto">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function GenerationSourcePanel({ question }: { question: ReviewQuestion }) {
  const hasSnapshot = Boolean(question.schema_block_snapshot?.trim());
  const hasIdea = question.idea_plan != null && Object.keys(question.idea_plan).length > 0;
  const hasVerifier =
    question.verifier_report != null && Object.keys(question.verifier_report).length > 0;
  const hasStyle =
    question.style_report != null && Object.keys(question.style_report).length > 0;
  const hasModels =
    question.models_used != null && Object.keys(question.models_used).length > 0;
  const hasTokens =
    question.token_usage != null && Object.keys(question.token_usage).length > 0;

  const metaLine = [
    question.generation_id ? `generation_id: ${question.generation_id}` : null,
    question.run_id ? `run_id: ${question.run_id}` : null,
    question.generation_attempts != null && question.generation_attempts > 0
      ? `attempts: ${question.generation_attempts}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const reclass = question.schema_reclass_review_tier;
  const showPanel =
    Boolean(question.schema_id?.trim()) ||
    Boolean(reclass) ||
    hasSnapshot ||
    hasIdea ||
    hasVerifier ||
    hasStyle ||
    hasModels ||
    hasTokens ||
    Boolean(metaLine);

  if (!showPanel) {
    return null;
  }

  return (
    <div className="mx-4 mb-0 space-y-2 pb-1">
      <p className="text-xs font-mono text-white/50 uppercase tracking-wide">
        Schema &amp; generation inputs
      </p>
      {reclass ? (
        <div
          className={cn(
            "rounded-organic-sm border px-3 py-2 text-[11px] font-mono leading-relaxed",
            reclass === "urgent"
              ? "border-rose-400/45 bg-rose-950/35 text-rose-100/95"
              : reclass === "secondary"
                ? "border-amber-400/40 bg-amber-950/25 text-amber-100/90"
                : "border-violet-400/40 bg-violet-950/30 text-violet-100/90"
          )}
        >
          <span className="font-semibold">
            {reclass === "urgent"
              ? "Reclass review (urgent)"
              : reclass === "secondary"
                ? "Reclass review (secondary)"
                : "Schema reclass — review needed"}
          </span>
          {" — "}
          {reclass === "urgent"
            ? "Sibling-style variation; schema subject prefix was corrected after generation — check fit."
            : reclass === "secondary"
              ? "Far variation; lower urgency — still confirm the item matches the new schema subject."
              : "schema_id and subjects are unchanged from generation. Schemas_ESAT.md now uses the canonical id below — keep or delete this row; generate fresh questions under the canonical id separately."}
          {question.schema_reclass_new_id ? (
            <>
              {" "}
              Canonical id:{" "}
              <code className="text-white/90">{question.schema_reclass_new_id}</code>
            </>
          ) : null}
        </div>
      ) : null}
      {question.schema_id ? (
        <p className="text-[11px] text-white/55 font-mono break-all">
          schema_id: {question.schema_id}
        </p>
      ) : null}
      <p className="text-[11px] text-white/40 font-mono leading-snug">
        The schema block (when stored) is what the Designer saw for this{" "}
        {isTMUAQuestion(question) ? "TMUA" : "ESAT"} task; the idea plan is the structured plan
        passed into the Implementer. Schema snapshots are only filled for new ESAT syncs after the
        migration runs.
      </p>
      {metaLine ? (
        <p className="text-[11px] text-white/45 font-mono break-all">{metaLine}</p>
      ) : null}

      <div className="space-y-2">
        {hasSnapshot ? (
          <Fold title="Schema block (Designer input)" defaultOpen>
            <pre className="text-[11px] text-white/75 font-mono whitespace-pre-wrap leading-relaxed mt-2">
              {question.schema_block_snapshot}
            </pre>
          </Fold>
        ) : null}

        {hasIdea ? (
          <Fold title="Idea plan (Designer → Implementer)">
            <pre className="text-[11px] text-sky-200/80 font-mono whitespace-pre-wrap leading-relaxed mt-2">
              {jsonPreview(question.idea_plan)}
            </pre>
          </Fold>
        ) : null}

        {hasVerifier ? (
          <Fold title="Verifier report">
            <pre className="text-[11px] text-white/65 font-mono whitespace-pre-wrap leading-relaxed mt-2">
              {jsonPreview(question.verifier_report)}
            </pre>
          </Fold>
        ) : null}

        {hasStyle ? (
          <Fold title="Style judge report">
            <pre className="text-[11px] text-white/65 font-mono whitespace-pre-wrap leading-relaxed mt-2">
              {jsonPreview(question.style_report)}
            </pre>
          </Fold>
        ) : null}

        {hasModels || hasTokens ? (
          <Fold title="Models &amp; token usage">
            {hasModels ? (
              <pre className="text-[11px] text-white/65 font-mono whitespace-pre-wrap leading-relaxed mt-2">
                {jsonPreview(question.models_used)}
              </pre>
            ) : null}
            {hasTokens ? (
              <pre className="text-[11px] text-emerald-200/70 font-mono whitespace-pre-wrap leading-relaxed mt-2">
                {jsonPreview(question.token_usage)}
              </pre>
            ) : null}
          </Fold>
        ) : null}
      </div>
    </div>
  );
}
