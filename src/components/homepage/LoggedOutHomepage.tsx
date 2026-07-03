"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Container } from "@/components/layout/Container";
import { PrimaryActionCard } from "@/components/homepage/PrimaryActionCard";
import { MainSectionGrid } from "@/components/homepage/MainSectionGrid";
import { UpgradePrompt } from "@/components/homepage/TesterAccessStatus";
import { LOGGED_OUT_SECTIONS } from "@/lib/homepage/sections";
import { trackHomepageEvent } from "@/lib/homepage/analytics";
import type { PrimaryAction, UpgradePromptData } from "@/lib/homepage/types";

const HOW_IT_WORKS = [
  { step: "1", title: "Complete the calibration", body: "A 15-question diagnostic across key ESAT skills." },
  { step: "2", title: "See your weaknesses", body: "Speed, accuracy, and topic-level gaps identified." },
  { step: "3", title: "Receive recommended training", body: "Focused sessions instead of random questions." },
  { step: "4", title: "Track improvement", body: "Review progress and retake when your level shifts." },
];

interface LoggedOutHomepageProps {
  primaryAction: PrimaryAction;
  premiumOverview: UpgradePromptData | null;
}

export function LoggedOutHomepage({
  primaryAction,
  premiumOverview,
}: LoggedOutHomepageProps) {
  useEffect(() => {
    void trackHomepageEvent("homepage_viewed", {
      user_state: "logged_out",
      calibration_status: "none",
    });
  }, []);

  const analyticsProps = {
    user_state: "logged_out" as const,
    calibration_status: "none" as const,
  };

  return (
    <Container className="py-10 sm:py-14">
      <div className="mx-auto max-w-5xl space-y-10">
        <section className="text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            ESAT no-calculator preparation
          </p>
          <h1 className="mt-3 text-3xl font-bold text-text sm:text-4xl lg:text-5xl">
            Know what to practise — and get faster at it
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-text-muted sm:mx-0">
            Personalised ESAT preparation that identifies weak skills, speed problems,
            and accuracy gaps — then recommends structured practice instead of random questions.
          </p>
        </section>

        <PrimaryActionCard action={primaryAction} analyticsProps={analyticsProps} />

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-organic-xl bg-surface-elevated p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
              Example result preview
            </h2>
            <p className="mt-4 text-lg font-medium text-text">
              Strong in algebraic reasoning, but slower than target on fractions and
              ratio calculations.
            </p>
            <p className="mt-2 text-sm text-text-muted">
              Your calibration produces a summary like this — based on your actual
              responses, not generic advice.
            </p>
          </div>

          <div className="rounded-organic-xl bg-surface-subtle p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
              How it works
            </h2>
            <ol className="mt-4 space-y-4">
              {HOW_IT_WORKS.map((item) => (
                <li key={item.step} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                    {item.step}
                  </span>
                  <div>
                    <p className="font-semibold text-text">{item.title}</p>
                    <p className="text-sm text-text-muted">{item.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
            Try without signing up
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/mental-maths/fermiguessr"
              onClick={() =>
                void trackHomepageEvent("fermi_game_clicked", analyticsProps)
              }
              className="rounded-full bg-surface-elevated px-5 py-2.5 text-sm font-semibold text-text transition-colors hover:bg-surface"
            >
              Try FermiGuessr
            </Link>
            <Link
              href="/tools/score-converter"
              onClick={() =>
                void trackHomepageEvent("score_converter_clicked", analyticsProps)
              }
              className="rounded-full bg-surface-elevated px-5 py-2.5 text-sm font-semibold text-text transition-colors hover:bg-surface"
            >
              ESAT score converter
            </Link>
            <Link
              href="/mental-maths/drill"
              className="rounded-full bg-surface-elevated px-5 py-2.5 text-sm font-semibold text-text transition-colors hover:bg-surface"
            >
              Explore practice modes
            </Link>
          </div>
        </section>

        <MainSectionGrid
          sections={LOGGED_OUT_SECTIONS}
          analyticsProps={analyticsProps}
        />

        {premiumOverview ? (
          <UpgradePrompt prompt={premiumOverview} analyticsProps={analyticsProps} />
        ) : null}

        <p className="text-center text-sm text-text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </Container>
  );
}
