"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export function BugReportPanel() {
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = description.trim().length >= 3 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/support/bug-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          pageUrl: window.location.href,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not submit report");
      }
      setSubmitted(true);
      setDescription("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit report");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className="h-10 w-10 text-success" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-text">Thank you!</p>
          <p className="mt-1 text-sm text-text-muted">
            We&apos;ve received your report and will look into it.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-1 border-0 bg-surface-mid shadow-none hover:bg-surface-neutral"
          onClick={() => setSubmitted(false)}
        >
          Report another issue
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">
        Found something broken or confusing? Tell us what happened and we&apos;ll
        fix it.
      </p>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Describe the bug..."
        rows={5}
        maxLength={2000}
        className={cn(
          "w-full resize-none rounded-organic-md border border-border-subtle bg-surface-mid px-3 py-2.5",
          "text-sm text-text placeholder:text-text-disabled",
          "outline-none transition-colors duration-fast focus:border-border focus:bg-surface",
        )}
      />

      {error && (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-text-subtle">
          {description.length}/2000
        </span>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="min-w-[7rem]"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Submit"
          )}
        </Button>
      </div>
    </div>
  );
}
