"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface ConversionReportButtonProps {
  questionId: number;
  className?: string;
}

export function ConversionReportButton({
  questionId,
  className,
}: ConversionReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  if (process.env.NEXT_PUBLIC_PAST_PAPER_TEXT !== "1") {
    return null;
  }

  async function submit() {
    if (!reason.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/past-papers/questions/conversion-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, reportReason: reason.trim() }),
      });
      if (!res.ok) throw new Error("Failed");
      setStatus("sent");
      setOpen(false);
      setReason("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-text-muted hover:text-text transition-colors"
      >
        Report text error
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-72 rounded-organic-md bg-surface-elevated p-3 shadow-lg">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe the KaTeX / text issue..."
            className="w-full min-h-[80px] rounded-organic-sm bg-surface-mid px-2 py-1.5 text-sm text-text resize-none"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-text-muted px-2 py-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={status === "sending" || !reason.trim()}
              className="text-xs bg-primary text-background px-3 py-1 rounded-organic-sm disabled:opacity-50"
            >
              {status === "sending" ? "Sending..." : "Submit"}
            </button>
          </div>
          {status === "error" && (
            <p className="text-xs text-error mt-1">Could not submit report.</p>
          )}
          {status === "sent" && (
            <p className="text-xs text-success mt-1">Thanks — we&apos;ll review this.</p>
          )}
        </div>
      )}
    </div>
  );
}
