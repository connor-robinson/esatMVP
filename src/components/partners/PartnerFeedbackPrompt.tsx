"use client";

import { FormEvent, useEffect, useState } from "react";
import { PARTNER_FEEDBACK_FEATURES } from "@/lib/partners/types";
import { trackPartnerFeedbackSubmittedGa } from "@/lib/partners/analytics";

type PromptState = {
  entitlementId: string;
  partnerDisplayName: string;
  partnerSlug: string;
};

export function PartnerFeedbackPrompt() {
  const [prompt, setPrompt] = useState<PromptState | null>(null);
  const [mode, setMode] = useState<"card" | "form" | "done" | "hidden">(
    "hidden",
  );
  const [usefulness, setUsefulness] = useState(0);
  const [feature, setFeature] = useState("");
  const [improvement, setImprovement] = useState("");
  const [recommendation, setRecommendation] = useState<number | "">("");
  const [contact, setContact] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/access/feedback", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted || !data.show) return;
        setPrompt({
          entitlementId: data.entitlementId,
          partnerDisplayName: data.partnerDisplayName,
          partnerSlug: data.partnerSlug,
        });
        setMode("card");
      } catch {
        /* ignore */
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function dismiss() {
    if (!prompt) return;
    await fetch("/api/access/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "dismiss",
        entitlementId: prompt.entitlementId,
      }),
    });
    setMode("hidden");
    setPrompt(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!prompt) return;
    setError(null);
    if (usefulness < 1 || !feature) {
      setError("Please answer the required questions.");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/access/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submit",
        entitlementId: prompt.entitlementId,
        usefulnessRating: usefulness,
        mostUsefulFeature: feature,
        improvementFeedback: improvement || null,
        recommendationRating:
          recommendation === "" ? null : Number(recommendation),
        contactPermission: contact,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error || "Could not submit feedback");
      return;
    }
    if (data.ga) {
      trackPartnerFeedbackSubmittedGa({
        partnerSlug: data.ga.partner,
        usefulnessRating: data.ga.usefulnessRating,
        recommendationRating: data.ga.recommendationRating,
      });
    }
    setMode("done");
  }

  if (mode === "hidden" || !prompt) return null;

  if (mode === "done") {
    return (
      <div className="fixed bottom-4 right-4 z-40 max-w-sm rounded-xl bg-stone-900 px-4 py-3 text-sm text-white shadow-lg">
        Thanks for your feedback.
        <button
          type="button"
          className="ml-3 underline"
          onClick={() => setMode("hidden")}
        >
          Close
        </button>
      </div>
    );
  }

  if (mode === "card") {
    return (
      <div className="fixed bottom-4 right-4 z-40 max-w-sm rounded-xl bg-white px-4 py-4 shadow-lg">
        <h3 className="text-sm font-semibold text-stone-900">
          Help us improve ESAT Camp
        </h3>
        <p className="mt-2 text-sm text-stone-600">
          You&apos;ve been using ESAT Camp through {prompt.partnerDisplayName}.
          We&apos;d really value a minute of feedback.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("form")}
            className="rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white"
          >
            Give feedback
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-700"
          >
            Maybe later
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-md rounded-xl bg-white p-5 shadow-lg sm:inset-x-auto sm:right-4">
      <h3 className="text-base font-semibold text-stone-900">
        Partner feedback
      </h3>
      <form onSubmit={onSubmit} className="mt-4 space-y-4 text-sm">
        <fieldset>
          <legend className="font-medium text-stone-800">
            How useful has ESAT Camp been for your preparation?
          </legend>
          <div className="mt-2 flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setUsefulness(n)}
                className={`h-9 w-9 rounded-lg text-sm ${
                  usefulness === n
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-800"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="font-medium text-stone-800">
            Which part has been most useful?
          </span>
          <select
            value={feature}
            onChange={(e) => setFeature(e.target.value)}
            className="mt-2 w-full rounded-lg bg-stone-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400"
          >
            <option value="">Select…</option>
            {PARTNER_FEEDBACK_FEATURES.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="font-medium text-stone-800">
            What could we improve? (optional)
          </span>
          <textarea
            value={improvement}
            onChange={(e) => setImprovement(e.target.value)}
            rows={3}
            className="mt-2 w-full rounded-lg bg-stone-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
        </label>

        <label className="block">
          <span className="font-medium text-stone-800">
            How likely are you to recommend ESAT Camp to another ESAT applicant?
            (0–10)
          </span>
          <input
            type="number"
            min={0}
            max={10}
            value={recommendation}
            onChange={(e) =>
              setRecommendation(
                e.target.value === "" ? "" : Number(e.target.value),
              )
            }
            className="mt-2 w-24 rounded-lg bg-stone-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
        </label>

        <label className="flex items-start gap-2 text-stone-700">
          <input
            type="checkbox"
            checked={contact}
            onChange={(e) => setContact(e.target.checked)}
            className="mt-1"
          />
          <span>May we contact you about your feedback?</span>
        </label>

        {error && <p className="text-red-700">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-stone-900 px-4 py-2 font-medium text-white disabled:opacity-60"
          >
            {submitting ? "Sending…" : "Submit"}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg bg-stone-100 px-4 py-2 text-stone-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
