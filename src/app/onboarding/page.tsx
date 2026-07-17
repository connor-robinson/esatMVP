"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ESAT_SUBJECTS,
  esatSubjectPillClass,
} from "@/components/profile/settingsSubjectPills";
import { cn } from "@/lib/utils";
import { sanitizeRedirectTo } from "@/lib/onboarding/redirect";
import { AlertCircle, Check, CheckCircle2, Loader2 } from "lucide-react";
import type { SubjectTileKey } from "@/lib/questionBank/subjectTileTheme";

type ExamPref = "ESAT" | "TMUA";
type Step = "username" | "exam" | "applicant" | "arrangements";

const USERNAME_REGEX = /^[a-zA-Z0-9_-]{2,20}$/;

/** Account-setup accent — clear blue, independent of olive primary. */
const ACCENT = {
  bar: "bg-[#4C8BF5]",
  btn: "bg-[#4C8BF5] text-white hover:bg-[#3B7AE0]",
  selected: "bg-[#4C8BF5] text-white",
  selectedMuted: "text-white/70",
  check: "text-[#4C8BF5]",
  available: "text-[#4C8BF5]",
  dots: "rgba(76, 139, 245, 0.35)",
} as const;

function ProgressBar({ stepIndex, total }: { stepIndex: number; total: number }) {
  const pct = Math.round(((stepIndex + 1) / total) * 100);
  return (
    <div className="w-full" aria-hidden>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={cn("h-full rounded-full transition-[width] duration-500 ease-out", ACCENT.bar)}
          style={{ width: `${pct}%` }}
        />
      </div>
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
  description?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl px-5 py-4 text-left transition-colors duration-200",
        selected ? ACCENT.selected : "bg-surface-mid text-text hover:bg-surface-neutral",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold">{title}</p>
          {description ? (
            <p className={cn("mt-1 text-sm", selected ? ACCENT.selectedMuted : "text-text-muted")}>
              {description}
            </p>
          ) : null}
        </div>
        {selected ? <Check className="h-5 w-5 shrink-0" aria-hidden /> : null}
      </div>
    </button>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPreview = searchParams.get("preview") === "1";
  const redirectTo = useMemo(
    () => sanitizeRedirectTo(searchParams.get("redirectTo")),
    [searchParams],
  );

  const [steps, setSteps] = useState<Step[]>(["username", "exam", "applicant", "arrangements"]);
  const [step, setStep] = useState<Step>("username");
  const [booting, setBooting] = useState(!isPreview);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailability, setUsernameAvailability] = useState<{
    available: boolean | null;
    message: string | null;
  }>({ available: null, message: null });

  const [exam, setExam] = useState<ExamPref>("ESAT");
  const [subjects, setSubjects] = useState<SubjectTileKey[]>([]);
  const [earlyApplicant, setEarlyApplicant] = useState(true);
  const [extraTime, setExtraTime] = useState(false);
  const [extraTimePct, setExtraTimePct] = useState(25);

  const stepIndex = Math.max(0, steps.indexOf(step));

  useEffect(() => {
    if (isPreview) {
      setSteps(["username", "exam", "applicant", "arrangements"]);
      setStep("username");
      setBooting(false);
      return;
    }

    let cancelled = false;
    async function boot() {
      try {
        const res = await fetch("/api/profile/preferences");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;

        const needsUsername = !data.username;
        const nextSteps: Step[] = needsUsername
          ? ["username", "exam", "applicant", "arrangements"]
          : ["exam", "applicant", "arrangements"];
        setSteps(nextSteps);
        setStep(nextSteps[0]);

        if (data.exam_preference === "ESAT" || data.exam_preference === "TMUA") {
          setExam(data.exam_preference);
        }
        if (Array.isArray(data.esat_subjects)) {
          setSubjects(data.esat_subjects as SubjectTileKey[]);
        }
        if (typeof data.is_early_applicant === "boolean") {
          setEarlyApplicant(data.is_early_applicant);
        }
        if (typeof data.has_extra_time === "boolean") {
          setExtraTime(data.has_extra_time);
        }
        if (typeof data.extra_time_percentage === "number") {
          setExtraTimePct(data.extra_time_percentage);
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [isPreview]);

  useEffect(() => {
    if (step !== "username") return;
    if (!username || username.trim().length === 0) {
      setUsernameAvailability({ available: null, message: null });
      setError(null);
      return;
    }

    if (!USERNAME_REGEX.test(username)) {
      setUsernameAvailability({
        available: false,
        message: "2–20 characters. Letters, numbers, underscores, and hyphens only.",
      });
      return;
    }

    if (isPreview) {
      setUsernameAvailability({
        available: true,
        message: "Looks good (preview — nothing is saved)",
      });
      return;
    }

    const timeoutId = setTimeout(async () => {
      setCheckingUsername(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/profile/username/check?username=${encodeURIComponent(username)}`,
        );
        const data = await response.json();
        if (response.ok) {
          setUsernameAvailability({
            available: data.available,
            message: data.message,
          });
        } else {
          setError(data.error || "Failed to check username");
          setUsernameAvailability({ available: null, message: null });
        }
      } catch {
        setError("Failed to check username availability");
        setUsernameAvailability({ available: null, message: null });
      } finally {
        setCheckingUsername(false);
      }
    }, 450);

    return () => clearTimeout(timeoutId);
  }, [username, step, isPreview]);

  const toggleSubject = (subject: SubjectTileKey) => {
    setSubjects((prev) => {
      if (prev.includes(subject)) return prev.filter((s) => s !== subject);
      if (prev.length >= 3) return prev;
      return [...prev, subject];
    });
  };

  const savePrefs = async (payload: Record<string, unknown>) => {
    if (isPreview) return;
    const res = await fetch("/api/profile/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Could not save");
  };

  const goNext = (from: Step) => {
    const idx = steps.indexOf(from);
    if (idx >= 0 && idx < steps.length - 1) {
      setStep(steps[idx + 1]);
    }
  };

  const goBack = () => {
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
  };

  const finish = async () => {
    setSaving(true);
    setError(null);
    try {
      if (isPreview) {
        router.replace(redirectTo);
        return;
      }
      await savePrefs({
        exam_preference: exam,
        esat_subjects: exam === "ESAT" ? subjects : [],
        is_early_applicant: earlyApplicant,
        has_extra_time: extraTime,
        extra_time_percentage: extraTime ? extraTimePct : 25,
        onboarding_completed: true,
      });
      router.replace(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  };

  const submitUsername = async () => {
    if (isPreview) {
      setError(null);
      goNext("username");
      return;
    }
    if (usernameAvailability.available !== true) {
      setError("Choose an available username");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await savePrefs({ username: username.trim() });
      goNext("username");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save username");
    } finally {
      setSaving(false);
    }
  };

  const submitExam = async () => {
    if (exam === "ESAT" && subjects.length !== 3) {
      setError("Pick exactly 3 subjects");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await savePrefs({
        exam_preference: exam,
        esat_subjects: exam === "ESAT" ? subjects : [],
      });
      goNext("exam");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const submitApplicant = async () => {
    setSaving(true);
    setError(null);
    try {
      await savePrefs({ is_early_applicant: earlyApplicant });
      goNext("applicant");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  if (booting) {
    return (
      <div className="flex min-h-[calc(100vh-58px)] items-center justify-center bg-background">
        <Loader2 className={cn("h-8 w-8 animate-spin", ACCENT.check)} aria-hidden />
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-58px)] bg-background">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute inset-0 opacity-[0.3]"
          style={{
            backgroundImage: `radial-gradient(${ACCENT.dots} 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-58px)] w-full max-w-4xl flex-col px-5 py-8 sm:px-8 sm:py-10">
        {isPreview ? (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#4C8BF5]/15 px-4 py-3 text-sm text-text">
            <p>
              <span className="font-semibold">Preview</span>
              <span className="text-text-muted"> — nothing is saved</span>
            </p>
            <button
              type="button"
              className={cn("font-semibold", ACCENT.check)}
              onClick={() => router.replace("/profile?section=account")}
            >
              Exit
            </button>
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col justify-center">
          <div className="w-full rounded-[1.75rem] bg-surface-elevated px-6 pb-10 pt-6 sm:px-12 sm:pb-12 sm:pt-8">
            <ProgressBar stepIndex={stepIndex} total={steps.length} />

            <div className="mx-auto mt-10 max-w-xl">
              <h1 className="text-3xl font-bold tracking-tight text-text sm:text-4xl">
                Set up your account
              </h1>

              <div className="mt-8 space-y-6">
                {step === "username" ? (
                  <>
                    <div>
                      <h2 className="text-xl font-semibold text-text">Choose a username</h2>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text" htmlFor="setup-username">
                        Username
                      </label>
                      <div className="relative">
                        <input
                          id="setup-username"
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="Enter username"
                          autoFocus
                          disabled={saving}
                          autoComplete="username"
                          className="w-full rounded-2xl border-0 bg-surface-mid px-4 py-3.5 pr-11 text-text outline-none ring-0 placeholder:text-text-subtle"
                        />
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                          {checkingUsername ? (
                            <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
                          ) : null}
                          {!checkingUsername && usernameAvailability.available === true ? (
                            <CheckCircle2 className={cn("h-4 w-4", ACCENT.check)} />
                          ) : null}
                          {!checkingUsername && usernameAvailability.available === false ? (
                            <AlertCircle className="h-4 w-4 text-error" />
                          ) : null}
                        </div>
                      </div>
                      {usernameAvailability.message ? (
                        <p
                          className={cn(
                            "text-xs",
                            usernameAvailability.available === true
                              ? ACCENT.available
                              : "text-error",
                          )}
                        >
                          {usernameAvailability.message}
                        </p>
                      ) : (
                        <p className="text-xs text-text-muted">
                          2–20 characters. Letters, numbers, underscores, and hyphens.
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={
                        saving ||
                        checkingUsername ||
                        (!isPreview && usernameAvailability.available !== true) ||
                        (isPreview && !USERNAME_REGEX.test(username))
                      }
                      onClick={() => void submitUsername()}
                      className={cn(
                        "w-full rounded-2xl py-3.5 text-sm font-bold transition-opacity disabled:cursor-not-allowed disabled:opacity-50",
                        ACCENT.btn,
                      )}
                    >
                      {saving ? "Saving…" : "Continue"}
                    </button>
                  </>
                ) : null}

                {step === "exam" ? (
                  <>
                    <div>
                      <h2 className="text-xl font-semibold text-text">Which exam?</h2>
                    </div>

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
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-text">Your 3 subjects</p>
                        <div className="flex flex-wrap gap-2">
                          {ESAT_SUBJECTS.map((subject) => {
                            const selected = subjects.includes(subject);
                            return (
                              <button
                                key={subject}
                                type="button"
                                onClick={() => toggleSubject(subject)}
                                className={cn(
                                  "rounded-xl px-3.5 py-2 text-sm transition-colors",
                                  esatSubjectPillClass(subject, selected),
                                )}
                              >
                                {subject}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-xs text-text-muted">{subjects.length}/3 selected</p>
                      </div>
                    ) : null}

                    <div className="flex gap-3">
                      {stepIndex > 0 ? (
                        <button
                          type="button"
                          onClick={goBack}
                          className="flex-1 rounded-2xl bg-surface-mid py-3.5 text-sm font-semibold text-text transition-colors hover:bg-surface-neutral"
                        >
                          Back
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={saving || (exam === "ESAT" && subjects.length !== 3)}
                        onClick={() => void submitExam()}
                        className={cn(
                          "flex-1 rounded-2xl py-3.5 text-sm font-bold transition-opacity disabled:cursor-not-allowed disabled:opacity-50",
                          ACCENT.btn,
                        )}
                      >
                        {saving ? "Saving…" : "Continue"}
                      </button>
                    </div>
                  </>
                ) : null}

                {step === "applicant" ? (
                  <>
                    <div>
                      <h2 className="text-xl font-semibold text-text">Application timing</h2>
                    </div>

                    <div className="space-y-3">
                      <ChoiceCard
                        selected={earlyApplicant}
                        title="Early"
                        onClick={() => setEarlyApplicant(true)}
                      />
                      <ChoiceCard
                        selected={!earlyApplicant}
                        title="Later"
                        onClick={() => setEarlyApplicant(false)}
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={goBack}
                        className="flex-1 rounded-2xl bg-surface-mid py-3.5 text-sm font-semibold text-text transition-colors hover:bg-surface-neutral"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void submitApplicant()}
                        className={cn(
                          "flex-1 rounded-2xl py-3.5 text-sm font-bold transition-opacity disabled:cursor-not-allowed disabled:opacity-50",
                          ACCENT.btn,
                        )}
                      >
                        {saving ? "Saving…" : "Continue"}
                      </button>
                    </div>
                  </>
                ) : null}

                {step === "arrangements" ? (
                  <>
                    <div>
                      <h2 className="text-xl font-semibold text-text">Access arrangements</h2>
                    </div>

                    <div className="space-y-3">
                      <ChoiceCard
                        selected={!extraTime}
                        title="No extra time"
                        onClick={() => setExtraTime(false)}
                      />
                      <ChoiceCard
                        selected={extraTime}
                        title="I get extra time"
                        onClick={() => setExtraTime(true)}
                      />
                    </div>

                    {extraTime ? (
                      <div className="flex items-center gap-3 pl-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={extraTimePct}
                          onChange={(e) =>
                            setExtraTimePct(parseInt(e.target.value, 10) || 25)
                          }
                          className="w-20 rounded-xl border-0 bg-surface-mid px-3 py-2.5 text-sm text-text outline-none"
                        />
                        <span className="text-sm text-text-muted">% extra</span>
                      </div>
                    ) : null}

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={goBack}
                        className="flex-1 rounded-2xl bg-surface-mid py-3.5 text-sm font-semibold text-text transition-colors hover:bg-surface-neutral"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void finish()}
                        className={cn(
                          "flex-1 rounded-2xl py-3.5 text-sm font-bold transition-opacity disabled:cursor-not-allowed disabled:opacity-50",
                          ACCENT.btn,
                        )}
                      >
                        {saving ? "Saving…" : "Finish"}
                      </button>
                    </div>
                  </>
                ) : null}

                {error ? (
                  <p className="text-center text-sm text-error">{error}</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-58px)] items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-[#4C8BF5]" aria-hidden />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
