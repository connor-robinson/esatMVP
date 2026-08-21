"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { useTesterProgramme } from "@/contexts/TesterProgrammeContext";
import { trackTesterEvent } from "@/hooks/useTesterStatus";
import { trackEvent } from "@/lib/ga";
import { SurveyRunner } from "@/components/tester/SurveyRunner";
import { AccessStatusCard } from "@/components/tester/AccessStatusCard";
import { formatExpiry, formatDuration } from "@/lib/tester/format";
import { cn } from "@/lib/utils";
import type { SurveyKey, TesterState } from "@/lib/tester/types";

export default function FoundingTesterPage() {
  const session = useSupabaseSession();
  const { state, isLoading, loadError, loadWarning, refresh } =
    useTesterProgramme();
  const [activeSurvey, setActiveSurvey] = useState<SurveyKey | null>(null);

  useEffect(() => {
    if (state?.isMember === false || state?.eligibleToJoin) {
      trackTesterEvent("tester_programme_viewed");
    }
  }, [state?.isMember, state?.eligibleToJoin]);

  // Resume the initial survey if the user joined but didn't finish it.
  useEffect(() => {
    if (
      state?.status === "stage_1_survey_pending" &&
      state.nextAction === "complete_initial_survey" &&
      !activeSurvey
    ) {
      setActiveSurvey("initial");
    }
  }, [state?.status, state?.nextAction, activeSurvey]);

  if (!session?.user) {
    return (
      <Container className="py-16">
        <div className="mx-auto max-w-lg rounded-organic-xl bg-surface-elevated p-8 text-center">
          <h1 className="text-xl font-bold text-text">Founding Tester Programme</h1>
          <p className="mt-3 text-sm text-text-muted">
            Please sign in to join the Founding Tester Programme.
          </p>
          <Link
            href="/login?redirectTo=/founding-tester"
            className="mt-6 inline-flex rounded-full bg-text px-6 py-2.5 text-sm font-bold text-background transition-opacity hover:opacity-90"
          >
            Sign in
          </Link>
        </div>
      </Container>
    );
  }

  if (isLoading && !state) {
    return (
      <Container className="py-16">
        <div className="mx-auto max-w-2xl">
          <div className="h-40 animate-pulse rounded-organic-xl bg-surface-subtle" />
        </div>
      </Container>
    );
  }

  if (loadError && !state) {
    return (
      <Container className="py-16">
        <div className="mx-auto max-w-lg rounded-organic-xl bg-surface-elevated p-8">
          <h1 className="text-xl font-bold text-text">
            Could not load programme
          </h1>
          <p className="mt-3 text-sm text-text-muted">{loadError}</p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-6 inline-flex rounded-full bg-text px-6 py-2.5 text-sm font-bold text-background"
          >
            Try again
          </button>
        </div>
      </Container>
    );
  }

  if (!state) {
    return null;
  }

  if (activeSurvey) {
    return (
      <Container className="py-12">
        <SurveyRunner
          surveyKey={activeSurvey}
          onCancel={() => setActiveSurvey(null)}
          onComplete={async (next) => {
            setActiveSurvey(null);
            await refresh();
            void next;
          }}
        />
      </Container>
    );
  }

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-2xl">
        {loadWarning ? (
          <p className="mb-4 rounded-organic-md bg-warning/10 px-4 py-3 text-sm text-text-muted">
            {loadWarning}
          </p>
        ) : null}
        <TesterFlow
          state={state}
          onRefresh={refresh}
          onStartSurvey={(k) => {
            const evt =
              k === "initial"
                ? "initial_survey_started"
                : k === "stage_1_feedback"
                  ? "stage_1_feedback_started"
                  : "final_survey_started";
            trackTesterEvent(evt);
            setActiveSurvey(k);
          }}
        />
      </div>
    </Container>
  );
}

function TesterFlow({
  state,
  onRefresh,
  onStartSurvey,
}: {
  state: TesterState | null;
  onRefresh: () => Promise<void>;
  onStartSurvey: (k: SurveyKey) => void;
}) {
  if (!state) return null;

  // Not a member yet.
  if (!state.isMember) {
    if (!state.eligibleToJoin) {
      return (
        <div className="rounded-organic-xl bg-surface-elevated p-8 text-center">
          <h1 className="text-xl font-bold text-text">
            You already have full access
          </h1>
          <p className="mt-3 text-sm text-text-muted">
            The Founding Tester Programme is for users without a paid plan.
          </p>
        </div>
      );
    }
    return <Explainer state={state} onJoined={onRefresh} onStartSurvey={onStartSurvey} />;
  }

  switch (state.status) {
    case "stage_1_survey_pending":
      return (
        <ActionCard
          title="One quick survey to begin"
          body={`Complete a one-minute survey to activate ${formatDuration(state.config.stage_1_hours)} of full premium access.`}
          cta="Start the survey"
          onClick={() => onStartSurvey("initial")}
        />
      );

    case "stage_1_active":
      return (
        <div className="flex flex-col gap-4">
          <Heading title="First Look is active" />
          <AccessStatusCard state={state} />
          <InfoNote>
            When this period ends, complete a short feedback survey to unlock{" "}
            {state.config.stage_2_days} more days.
          </InfoNote>
        </div>
      );

    case "stage_1_expired":
      return (
        <Checkpoint
          title="Your First Look access has ended"
          points={[
            "You can unlock 7 additional days of premium access.",
            "Complete a short feedback survey (2–3 minutes).",
            "Your answers are used to improve the product.",
            "Free features remain available in the meantime.",
          ]}
          state={state}
          onStartSurvey={onStartSurvey}
          surveyKey="stage_1_feedback"
          requiredSessions={state.sessionsRequiredForNext ?? 1}
        />
      );

    case "stage_2_active":
      return (
        <div className="flex flex-col gap-4">
          <Heading title="Active Tester" />
          <AccessStatusCard state={state} />
          <InfoNote>
            Complete {state.sessionsRequiredForNext} qualifying sessions in total
            and the final survey to unlock {state.config.stage_3_days} more days
            plus your founding-member discount.
          </InfoNote>
        </div>
      );

    case "stage_2_expired":
    case "final_survey_pending":
      return (
        <Checkpoint
          title="Your Active Tester access has ended"
          points={[
            `You completed ${state.meaningfulSessionsCompleted} qualifying session${state.meaningfulSessionsCompleted === 1 ? "" : "s"}.`,
            `Complete the final survey to unlock ${state.config.stage_3_days} more days.`,
            "You will also unlock your founding-member discount.",
            "Free features remain available in the meantime.",
          ]}
          state={state}
          onStartSurvey={onStartSurvey}
          surveyKey="final"
          requiredSessions={state.sessionsRequiredForNext ?? 3}
        />
      );

    case "awaiting_manual_approval":
      return (
        <ActionCard
          title="Final survey received. Thank you"
          body="Your Founding Tester access is pending a quick manual review. You’ll be notified by email once it’s approved."
        />
      );

    case "stage_3_active":
      return (
        <div className="flex flex-col gap-4">
          <Heading title="You’re a Founding Tester" />
          <AccessStatusCard state={state} />
          <div className="rounded-organic-xl bg-surface-elevated p-6">
            <p className="text-sm text-text">
              You’ve unlocked {state.config.stage_3_days} days of premium access.
            </p>
            <p className="mt-2 text-sm text-text-muted">
              You qualify for the founding-member discount
              {state.foundingDiscountPercent
                ? ` (${state.foundingDiscountPercent}% off)`
                : ""}
              , which stays associated with your account. Access does not renew
              automatically. When these {state.config.stage_3_days} days end
              you’ll see your founding-member offer.
            </p>
          </div>
        </div>
      );

    case "programme_completed":
      return <Completion state={state} />;

    case "revoked":
      return (
        <ActionCard
          title="Programme access ended"
          body="Your tester access has been ended. Please contact support if you think this is a mistake."
        />
      );

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Explainer + join
// ---------------------------------------------------------------------------

function Explainer({
  state,
  onJoined,
  onStartSurvey,
}: {
  state: TesterState;
  onJoined: () => Promise<void>;
  onStartSurvey: (k: SurveyKey) => void;
}) {
  const c = state.config;
  const stages = [
    {
      n: 1,
      name: "First Look",
      reward: `${formatDuration(c.stage_1_hours)} of full premium access`,
      requirement: "Complete a one-minute initial survey.",
    },
    {
      n: 2,
      name: "Active Tester",
      reward: `${c.stage_2_days} more days of premium`,
      requirement:
        "After First Look ends, complete one meaningful practice session and the first feedback survey.",
    },
    {
      n: 3,
      name: "Founding Tester",
      reward: `${c.stage_3_days} more days + a permanent founding-member discount`,
      requirement:
        "After the 7-day period ends, complete three sessions in total and the detailed final survey.",
    },
  ];

  const totalDays = Math.round(c.stage_1_hours / 24) + c.stage_2_days + c.stage_3_days;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-text sm:text-3xl">
          Founding Tester Programme
        </h1>
        <p className="mt-3 text-sm text-text-muted">
          Get premium access for free in exchange for genuinely useful feedback.
          Access is earned in stages by completing short feedback surveys. The
          more you help, the more free access you unlock (up to roughly{" "}
          {totalDays} days in total).
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {stages.map((s) => (
          <div key={s.n} className="rounded-organic-xl bg-surface-elevated p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-text">
                {s.n}
              </span>
              <span className="font-semibold text-text">{s.name}</span>
            </div>
            <p className="mt-3 text-sm text-text">
              <span className="text-text-muted">You receive: </span>
              {s.reward}
            </p>
            <p className="mt-1 text-sm text-text">
              <span className="text-text-muted">To unlock: </span>
              {s.requirement}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-organic-xl bg-surface-elevated p-5">
        <p className="text-sm font-semibold text-text">Good to know</p>
        <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm text-text-muted">
          <li>Access is temporary and expires on the date shown for each stage.</li>
          <li>Extensions are earned only by completing feedback.</li>
          <li>You do not have to reply to every email.</li>
          <li>Your feedback may be analysed anonymously.</li>
          <li>
            We will ask separately for permission before showing your name or
            testimonial publicly.
          </li>
        </ul>
      </div>

      <JoinForm state={state} onJoined={onJoined} onStartSurvey={onStartSurvey} />
    </div>
  );
}

function JoinForm({
  state,
  onJoined,
  onStartSurvey,
}: {
  state: TesterState;
  onJoined: () => Promise<void>;
  onStartSurvey: (k: SurveyKey) => void;
}) {
  const [understandTemporary, setUnderstandTemporary] = useState(false);
  const [agreeFeedback, setAgreeFeedback] = useState(false);
  const [essentialEmails, setEssentialEmails] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canJoin = understandTemporary && agreeFeedback && essentialEmails;

  const join = async () => {
    if (!canJoin) return;
    setSubmitting(true);
    setError(null);
    try {
      trackTesterEvent("tester_programme_join_started");
      const res = await fetch("/api/tester/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          understandTemporary,
          agreeFeedback,
          essentialEmails,
          marketing,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Could not join. Please try again.");
        return;
      }
      if (!data.state?.isMember) {
        setError("Join did not complete. Please try again.");
        return;
      }
      // Open survey immediately - don't wait for refresh (avoids loading flash).
      onStartSurvey("initial");
      setSubmitting(false);
      void onJoined();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-organic-xl bg-surface-elevated p-6">
      <p className="text-sm font-semibold text-text">Before you join</p>
      <div className="mt-4 flex flex-col gap-3">
        <ConsentRow
          checked={understandTemporary}
          onChange={setUnderstandTemporary}
          label="I understand that access is temporary and will expire on the date shown."
        />
        <ConsentRow
          checked={agreeFeedback}
          onChange={setAgreeFeedback}
          label="I agree to complete the required feedback surveys to unlock extensions."
        />
        <ConsentRow
          checked={essentialEmails}
          onChange={setEssentialEmails}
          label="I agree to receive essential emails about this testing programme."
        />
        <div className="mt-1 border-t border-border-subtle pt-3">
          <ConsentRow
            checked={marketing}
            onChange={setMarketing}
            label="Optional: also send me occasional marketing emails (not required)."
          />
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-organic-md bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={join}
        disabled={!canJoin || submitting}
        className="mt-5 inline-flex rounded-full bg-text px-6 py-2.5 text-sm font-bold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Joining…" : "Join and start the survey"}
      </button>
      {!canJoin ? (
        <p className="mt-2 text-xs text-text-muted">
          Tick all three required agreements above to continue.
        </p>
      ) : (
        <p className="mt-2 text-xs text-text-muted">
          You’ll complete a one-minute survey next, which activates your{" "}
          {formatDuration(state.config.stage_1_hours)} of premium access.
        </p>
      )}
    </div>
  );
}

function ConsentRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-start gap-3 text-left"
    >
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-organic-sm text-background transition-colors",
          checked ? "bg-primary" : "bg-surface-subtle",
        )}
      >
        {checked ? "✓" : ""}
      </span>
      <span className="text-sm text-text">{label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

function Heading({ title }: { title: string }) {
  return <h1 className="text-2xl font-bold text-text">{title}</h1>;
}

function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-organic-xl bg-surface-elevated p-5 text-sm text-text-muted">
      {children}
    </div>
  );
}

function ActionCard({
  title,
  body,
  cta,
  onClick,
}: {
  title: string;
  body: string;
  cta?: string;
  onClick?: () => void;
}) {
  return (
    <div className="rounded-organic-xl bg-surface-elevated p-8">
      <h1 className="text-xl font-bold text-text">{title}</h1>
      <p className="mt-3 text-sm text-text-muted">{body}</p>
      {cta && onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="mt-6 inline-flex rounded-full bg-text px-6 py-2.5 text-sm font-bold text-background transition-opacity hover:opacity-90"
        >
          {cta}
        </button>
      ) : null}
    </div>
  );
}

function Checkpoint({
  title,
  points,
  state,
  onStartSurvey,
  surveyKey,
  requiredSessions,
}: {
  title: string;
  points: string[];
  state: TesterState;
  onStartSurvey: (k: SurveyKey) => void;
  surveyKey: SurveyKey;
  requiredSessions: number;
}) {
  const hasEnoughSessions = state.meaningfulSessionsCompleted >= requiredSessions;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-organic-xl bg-surface-elevated p-8">
        <h1 className="text-xl font-bold text-text">{title}</h1>
        <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-sm text-text-muted">
          {points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>

        {hasEnoughSessions ? (
          <button
            type="button"
            onClick={() => onStartSurvey(surveyKey)}
            className="mt-6 inline-flex rounded-full bg-text px-6 py-2.5 text-sm font-bold text-background transition-opacity hover:opacity-90"
          >
            {surveyKey === "final" ? "Start the final survey" : "Start the feedback survey"}
          </button>
        ) : (
          <div className="mt-6">
            <p className="text-sm text-text">
              You’ve completed {state.meaningfulSessionsCompleted} of{" "}
              {requiredSessions} qualifying session
              {requiredSessions === 1 ? "" : "s"} required to unlock this reward.
            </p>
            <p className="mt-1 text-sm text-text-muted">
              Complete a qualifying practice session, then return here to take the
              survey. You won’t need to restart the programme.
            </p>
            <Link
              href="/mental-maths/drill"
              className="mt-4 inline-flex rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90"
            >
              Start a practice session
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function Completion({ state }: { state: TesterState }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-organic-xl bg-surface-elevated p-8">
        <h1 className="text-xl font-bold text-text">Your tester journey is complete</h1>
        <p className="mt-3 text-sm text-text-muted">
          Thank you for helping shape the product. Here’s where things stand.
        </p>
        <p className="mt-4 text-sm text-text">
          Qualifying sessions completed:{" "}
          <span className="font-semibold">{state.meaningfulSessionsCompleted}</span>
        </p>
        {state.foundingDiscountEligible ? (
          <p className="mt-2 text-sm text-text">
            You’ve earned the founding-member discount
            {state.foundingDiscountPercent
              ? ` (${state.foundingDiscountPercent}% off)`
              : ""}
            . It stays associated with your account.
          </p>
        ) : null}
        {state.accessExpiresAt ? (
          <p className="mt-2 text-sm text-text-muted">
            Premium access ended on {formatExpiry(state.accessExpiresAt)}.
          </p>
        ) : null}
      </div>
      <Link
        href="/pricing"
        onClick={() => {
          trackTesterEvent("checkout_started");
          trackEvent("checkout_started", {
            plan_type: "founding_tester",
            surface: "founding_tester",
          });
        }}
        className="inline-flex justify-center rounded-full bg-text px-6 py-3 text-sm font-bold text-background transition-opacity hover:opacity-90"
      >
        See your founding-member offer
      </Link>
    </div>
  );
}
