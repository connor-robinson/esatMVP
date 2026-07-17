"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import {
  ESAT_SUBJECTS,
  esatSubjectPillClass,
} from "@/components/profile/settingsSubjectPills";
import { cn } from "@/lib/utils";
import { sanitizeRedirectTo } from "@/lib/onboarding/redirect";
import { CALIBRATION_ROUTES } from "@/lib/calibration/constants";
import { Check, Loader2, Sparkles } from "lucide-react";
import type { SubjectTileKey } from "@/lib/questionBank/subjectTileTheme";

type ExamPref = "ESAT" | "TMUA";
type Step = "exam" | "applicant" | "arrangements" | "emails" | "calibration" | "offer";

const STEPS: Step[] = ["exam", "applicant", "arrangements", "emails", "calibration", "offer"];

function StepDots({ current }: { current: Step }) {
  const idx = STEPS.indexOf(current);
  return (
    <div className="flex items-center justify-center gap-2" aria-hidden>
      {STEPS.map((step, i) => (
        <span
          key={step}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            i === idx ? "w-6 bg-primary" : i < idx ? "w-1.5 bg-primary/50" : "w-1.5 bg-white/15",
          )}
        />
      ))}
    </div>
  );
}

function ChoiceCard({
  selected,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-organic-xl px-5 py-4 text-left transition-all duration-200",
        selected
          ? "bg-primary text-black shadow-[0_12px_32px_-16px_rgba(0,0,0,0.45)]"
          : "bg-surface-elevated text-text hover:bg-surface-mid",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold">{title}</p>
          <p className={cn("mt-1 text-sm", selected ? "text-black/70" : "text-text-muted")}>
            {description}
          </p>
        </div>
        {selected ? <Check className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /> : null}
      </div>
    </button>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = useMemo(
    () => sanitizeRedirectTo(searchParams.get("redirectTo")),
    [searchParams],
  );

  const [step, setStep] = useState<Step>("exam");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [exam, setExam] = useState<ExamPref>("ESAT");
  const [subjects, setSubjects] = useState<SubjectTileKey[]>([]);
  const [earlyApplicant, setEarlyApplicant] = useState(true);
  const [extraTime, setExtraTime] = useState(false);
  const [extraTimePct, setExtraTimePct] = useState(25);
  const [restBreaks, setRestBreaks] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState<boolean | null>(null);

  const toggleSubject = (subject: SubjectTileKey) => {
    setSubjects((prev) => {
      if (prev.includes(subject)) return prev.filter((s) => s !== subject);
      if (prev.length >= 3) return prev;
      return [...prev, subject];
    });
  };

  const savePrefs = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/profile/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Could not save preferences");
  };

  const finish = async (nextHref: string) => {
    setSaving(true);
    setError(null);
    try {
      await savePrefs({
        exam_preference: exam,
        esat_subjects: exam === "ESAT" ? subjects : [],
        is_early_applicant: earlyApplicant,
        has_extra_time: extraTime,
        extra_time_percentage: extraTime ? extraTimePct : 25,
        has_rest_breaks: restBreaks,
        marketing_emails_consent: marketingEmails,
        onboarding_completed: true,
      });
      router.replace(nextHref);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  };

  const goNextFromExam = async () => {
    if (exam === "ESAT" && subjects.length !== 3) {
      setError("Pick exactly 3 ESAT subjects");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await savePrefs({
        exam_preference: exam,
        esat_subjects: exam === "ESAT" ? subjects : [],
      });
      setStep("applicant");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const goNextFromApplicant = async () => {
    setSaving(true);
    setError(null);
    try {
      await savePrefs({ is_early_applicant: earlyApplicant });
      setStep("arrangements");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const goNextFromArrangements = async () => {
    setSaving(true);
    setError(null);
    try {
      await savePrefs({
        has_extra_time: extraTime,
        extra_time_percentage: extraTime ? extraTimePct : 25,
        has_rest_breaks: restBreaks,
      });
      setStep("emails");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const goNextFromEmails = async () => {
    if (marketingEmails === null) {
      setError("Please choose whether we can email you");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await savePrefs({ marketing_emails_consent: marketingEmails });
      setStep("calibration");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-58px)] overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(rgba(169, 177, 103, 0.35) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
      </div>

      <Container size="md" className="relative py-12 sm:py-16">
        <div className="mx-auto max-w-lg">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Personalise your experience
          </p>
          <h1 className="mt-3 text-center text-3xl font-bold tracking-tight text-text">
            A few quick questions
          </h1>
          <p className="mt-2 text-center text-sm text-text-muted">
            You can change these later in Settings.
          </p>

          <div className="mt-8">
            <StepDots current={step} />
          </div>

          <div className="mt-8 rounded-organic-xl bg-surface-elevated p-6 shadow-[0_20px_60px_-28px_rgba(0,0,0,0.55)] sm:p-8">
            {step === "exam" ? (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-text">Which exam are you preparing for?</h2>
                <div className="space-y-3">
                  <ChoiceCard
                    selected={exam === "ESAT"}
                    title="ESAT"
                    description="Engineering & Science Admissions Test"
                    onClick={() => setExam("ESAT")}
                  />
                  <ChoiceCard
                    selected={exam === "TMUA"}
                    title="TMUA"
                    description="Test of Mathematics for University Admission"
                    onClick={() => {
                      setExam("TMUA");
                      setSubjects([]);
                    }}
                  />
                </div>

                {exam === "ESAT" ? (
                  <div className="space-y-3 pt-2">
                    <p className="text-sm font-medium text-text">
                      Choose your 3 ESAT subjects
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ESAT_SUBJECTS.map((subject) => {
                        const selected = subjects.includes(subject);
                        return (
                          <button
                            key={subject}
                            type="button"
                            onClick={() => toggleSubject(subject)}
                            className={cn(
                              "rounded-organic-md px-3 py-2 text-sm transition-colors",
                              esatSubjectPillClass(subject, selected),
                            )}
                          >
                            {subject}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-text-muted">
                      {subjects.length}/3 selected
                    </p>
                  </div>
                ) : null}

                <Button
                  className="w-full border-0 bg-primary font-semibold text-black hover:bg-primary-hover"
                  disabled={saving || (exam === "ESAT" && subjects.length !== 3)}
                  onClick={() => void goNextFromExam()}
                >
                  {saving ? "Saving…" : "Continue"}
                </Button>
              </div>
            ) : null}

            {step === "applicant" ? (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-text">
                  Are you applying early or later?
                </h2>
                <p className="text-sm text-text-muted">
                  Cambridge and Oxford undergraduate applications usually need an
                  early UCAS deadline (typically mid-October). Choose early if
                  you’re aiming for that cycle; choose later if you’re taking a
                  gap year or applying in a future year.
                </p>
                <div className="space-y-3">
                  <ChoiceCard
                    selected={earlyApplicant}
                    title="Early applicant"
                    description="Targeting Cambridge / Oxford this cycle (October deadline)"
                    onClick={() => setEarlyApplicant(true)}
                  />
                  <ChoiceCard
                    selected={!earlyApplicant}
                    title="Later applicant"
                    description="Gap year, deferred entry, or applying in a future cycle"
                    onClick={() => setEarlyApplicant(false)}
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    className="flex-1 border-0"
                    onClick={() => setStep("exam")}
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1 border-0 bg-primary font-semibold text-black hover:bg-primary-hover"
                    disabled={saving}
                    onClick={() => void goNextFromApplicant()}
                  >
                    {saving ? "Saving…" : "Continue"}
                  </Button>
                </div>
              </div>
            ) : null}

            {step === "arrangements" ? (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-text">
                  Exam arrangements
                </h2>
                <p className="text-sm text-text-muted">
                  We’ll use this for timed practice. You can update it in Settings anytime.
                </p>

                <label className="flex cursor-pointer items-start gap-3 rounded-organic-xl bg-surface-mid/50 px-4 py-4">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
                    checked={extraTime}
                    onChange={(e) => setExtraTime(e.target.checked)}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-text">Extra time</span>
                    <span className="mt-0.5 block text-xs text-text-muted">
                      Standard award is often +25% on top of normal test duration
                    </span>
                  </span>
                </label>

                {extraTime ? (
                  <div className="ml-7 flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={extraTimePct}
                      onChange={(e) => setExtraTimePct(parseInt(e.target.value, 10) || 25)}
                      className="w-20 rounded-organic-md bg-surface-mid px-3 py-2 text-sm text-text"
                    />
                    <span className="text-sm text-text-muted">% extra time</span>
                  </div>
                ) : null}

                <label className="flex cursor-pointer items-start gap-3 rounded-organic-xl bg-surface-mid/50 px-4 py-4">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
                    checked={restBreaks}
                    onChange={(e) => setRestBreaks(e.target.checked)}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-text">Rest breaks</span>
                    <span className="mt-0.5 block text-xs text-text-muted">
                      Pause-the-clock style breaks during timed sections
                    </span>
                  </span>
                </label>

                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    className="flex-1 border-0"
                    onClick={() => setStep("applicant")}
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1 border-0 bg-primary font-semibold text-black hover:bg-primary-hover"
                    disabled={saving}
                    onClick={() => void goNextFromArrangements()}
                  >
                    {saving ? "Saving…" : "Continue"}
                  </Button>
                </div>
              </div>
            ) : null}

            {step === "emails" ? (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-text">
                  Can we send you emails?
                </h2>
                <p className="text-sm text-text-muted">
                  Occasional study tips, exam reminders, and product updates. No
                  spam — and you can change this anytime in Settings.
                </p>
                <div className="space-y-3">
                  <ChoiceCard
                    selected={marketingEmails === true}
                    title="Yes, keep me updated"
                    description="Study tips, exam reminders, and product news"
                    onClick={() => {
                      setMarketingEmails(true);
                      setError(null);
                    }}
                  />
                  <ChoiceCard
                    selected={marketingEmails === false}
                    title="No thanks"
                    description="Only essential account emails (e.g. password reset)"
                    onClick={() => {
                      setMarketingEmails(false);
                      setError(null);
                    }}
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    className="flex-1 border-0"
                    onClick={() => setStep("arrangements")}
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1 border-0 bg-primary font-semibold text-black hover:bg-primary-hover"
                    disabled={saving || marketingEmails === null}
                    onClick={() => void goNextFromEmails()}
                  >
                    {saving ? "Saving…" : "Continue"}
                  </Button>
                </div>
              </div>
            ) : null}

            {step === "calibration" ? (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-text">
                  Take a calibration test?
                </h2>
                <p className="text-sm text-text-muted">
                  A short diagnostic helps us recommend what to practise first. You can
                  also skip and do it later from Exam Tools.
                </p>
                <div className="flex flex-col gap-3">
                  <Button
                    className="w-full border-0 bg-primary font-semibold text-black hover:bg-primary-hover"
                    disabled={saving}
                    onClick={() =>
                      void finish(
                        `${CALIBRATION_ROUTES.hub}?from=onboarding&redirectTo=${encodeURIComponent(redirectTo)}`,
                      )
                    }
                  >
                    {saving ? "Saving…" : "Yes — start calibration"}
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full border-0"
                    disabled={saving}
                    onClick={() => setStep("offer")}
                  >
                    Skip for now
                  </Button>
                  <button
                    type="button"
                    className="text-sm text-text-muted hover:text-text"
                    onClick={() => setStep("emails")}
                  >
                    Back
                  </button>
                </div>
              </div>
            ) : null}

            {step === "offer" ? (
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  One-time welcome offer
                </div>
                <h2 className="text-lg font-semibold text-text">
                  Try Monthly free for 7 days
                </h2>
                <p className="text-sm text-text-muted">
                  Unlock full mental maths, unlimited question bank, past papers, and
                  solutions. Cancel anytime during the trial — or continue on Free.
                </p>
                <ul className="space-y-2 text-sm text-text-muted">
                  {[
                    "Full roadmap & past papers",
                    "Unlimited Question Bank",
                    "Solutions & stats overview",
                  ].map((item) => (
                    <li key={item} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col gap-3">
                  <Button
                    className="w-full border-0 bg-primary font-semibold text-black hover:bg-primary-hover"
                    disabled={saving}
                    onClick={() =>
                      void finish(
                        `/pricing?from=onboarding&redirectTo=${encodeURIComponent(redirectTo)}`,
                      )
                    }
                  >
                    {saving ? "Saving…" : "View limited offer"}
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full border-0"
                    disabled={saving}
                    onClick={() => void finish(redirectTo)}
                  >
                    {saving ? "Saving…" : "Continue with Free"}
                  </Button>
                  <button
                    type="button"
                    className="text-sm text-text-muted hover:text-text"
                    onClick={() => setStep("calibration")}
                  >
                    Back
                  </button>
                </div>
              </div>
            ) : null}

            {error ? (
              <p className="mt-4 text-center text-sm text-error">{error}</p>
            ) : null}
          </div>

          <p className="mt-6 text-center text-xs text-text-subtle">
            Prefer to edit later?{" "}
            <Link href="/profile" className="text-primary hover:underline">
              Open Settings
            </Link>
          </p>
        </div>
      </Container>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-58px)] items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
