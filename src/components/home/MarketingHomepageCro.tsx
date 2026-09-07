"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { ABOUT_PATH, FOUNDERS } from "@/config/founders";
import { QUESTION_BANK_TOTAL_COUNT } from "@/config/questionBankMarketing";
import { MENTAL_MATHS_MODULE_COUNT_MARKETING } from "@/config/mentalMathsMarketing";
import type { HomepageSocialProofStats } from "@/lib/homepage/socialProofTypes";
import { CALIBRATION_ROUTES } from "@/lib/calibration/constants";
import { trackHomepageEvent } from "@/lib/homepage/analytics";
import { ExampleGraphQuestion } from "@/components/home/ExampleGraphQuestion";
import {
  formatGbpPrice,
  getSeasonPassPrice,
  SEASON_PASS_ACCESS_UNTIL_LABEL,
} from "@/lib/stripe/best-value";

/**
 * Scrappy CRO homepage variant for A/B testing at /dev/homepage-cro.
 * Live `/` still uses MarketingHomepage.
 */
export function MarketingHomepageCro({
  socialProof,
}: {
  socialProof: HomepageSocialProofStats | null;
}) {
  const seasonPrice = getSeasonPassPrice();

  useEffect(() => {
    void trackHomepageEvent("homepage_viewed", {
      user_state: "logged_out",
      calibration_status: "none",
      traffic_source: "homepage_cro_v1",
    });
  }, []);

  const trackCalibration = () => {
    void trackHomepageEvent("calibration_cta_clicked", {
      user_state: "logged_out",
      destination: CALIBRATION_ROUTES.hub,
      traffic_source: "homepage_cro_v1",
    });
  };

  return (
    <div className="scroll-smooth bg-[#0B1020] pb-24 text-white">
      <div className="border-b border-yellow-400/40 bg-[#151b2e] px-4 py-2 text-center text-sm font-semibold text-yellow-200">
        Free calibration. No account needed. Takes ~10 minutes.
      </div>

      <section className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 sm:pt-10">
        <div className="flex items-start gap-3 sm:gap-4">
          <Link
            href={`${ABOUT_PATH}#${FOUNDERS.ewan.id}`}
            className="relative h-14 w-14 shrink-0 overflow-hidden bg-[#1c2438] sm:h-16 sm:w-16"
          >
            <Image
              src={FOUNDERS.ewan.imageSrc}
              alt={FOUNDERS.ewan.imageAlt}
              fill
              sizes="64px"
              className="object-cover"
              style={{
                objectPosition: FOUNDERS.ewan.imagePosition,
                transform: `scale(${FOUNDERS.ewan.imageScale})`,
              }}
              priority
            />
          </Link>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-bold leading-snug sm:text-base">
              Built by {FOUNDERS.ewan.name} ({FOUNDERS.ewan.homepageCredential})
              after sitting the ESAT.
            </p>
            <p className="text-sm text-[#A7B4C8]">
              We made the question bank we wish we had.
            </p>
          </div>
        </div>

        <h1 className="mt-8 max-w-3xl text-3xl font-bold leading-[1.15] tracking-tight sm:text-4xl lg:text-5xl">
          Get ESAT-ready with{" "}
          <span className="text-yellow-300">
            {QUESTION_BANK_TOTAL_COUNT.toLocaleString()}+ practice questions
          </span>{" "}
          and free calibration.
        </h1>

        <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#A7B4C8] sm:text-lg">
          Timed practice, past papers, and{" "}
          {MENTAL_MATHS_MODULE_COUNT_MARKETING}+ mental maths courses. Start with
          a free diagnostic so you know what to fix first.
        </p>

        {socialProof ? (
          <p className="mt-4 text-sm font-semibold text-[#D6DEEA]">
            {socialProof.users.toLocaleString()} students using ESAT Camp
            {socialProof.questionsAnswered != null
              ? ` · ${socialProof.questionsAnswered.toLocaleString()} questions answered`
              : null}
          </p>
        ) : null}

        <div className="mt-6">
          <Link
            href={CALIBRATION_ROUTES.hub}
            onClick={trackCalibration}
            className="inline-flex w-full items-center justify-center bg-yellow-300 px-6 py-4 text-base font-extrabold text-[#0B1020] transition-colors hover:bg-yellow-200 sm:w-auto sm:text-lg"
          >
            Start free calibration →
          </Link>
          <p className="mt-2 text-sm text-[#8B9BB0]">
            No sign-up required to get started.
          </p>
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-5xl px-4 sm:px-6">
        <ExampleGraphQuestion className="rounded-none bg-[#151b2e] px-4 py-4 backdrop-blur-none sm:px-5 sm:py-5" />
      </section>

      <section className="mx-auto mt-12 max-w-5xl space-y-4 px-4 sm:px-6">
        <h2 className="text-xl font-bold sm:text-2xl">What you get</h2>
        <ul className="space-y-3 text-base text-[#C5D0E0]">
          <li>
            <span className="font-bold text-white">Free calibration</span>{" "}
            - find weak spots before you grind the wrong topics.
          </li>
          <li>
            <span className="font-bold text-white">
              {QUESTION_BANK_TOTAL_COUNT.toLocaleString()}+ questions
            </span>{" "}
            - practise by subject and topic with instant feedback.
          </li>
          <li>
            <span className="font-bold text-white">Past papers + roadmap</span>{" "}
            - official papers with a plan instead of random revision.
          </li>
          <li>
            <span className="font-bold text-white">Mental maths trainer</span>{" "}
            - non-calculator speed for ESAT & TMUA.
          </li>
        </ul>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/mental-maths/drill"
            className="bg-[#1c2438] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#243049]"
          >
            Try trainer
          </Link>
          <Link
            href="/past-papers/roadmap"
            className="bg-[#1c2438] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#243049]"
          >
            View roadmap
          </Link>
          <Link
            href="/questions/questionbank"
            className="bg-[#1c2438] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#243049]"
          >
            Open question bank
          </Link>
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-5xl px-4 sm:px-6">
        <div className="bg-[#151b2e] p-5 sm:p-6">
          <p className="text-sm font-bold uppercase tracking-wide text-yellow-300">
            Pricing
          </p>
          <p className="mt-2 text-2xl font-extrabold">
            Season pass {formatGbpPrice(seasonPrice)}
          </p>
          <p className="mt-1 text-sm text-[#A7B4C8]">
            Access until {SEASON_PASS_ACCESS_UNTIL_LABEL}. Calibration stays free.
          </p>
          <Link
            href="/pricing"
            className="mt-4 inline-flex bg-white px-5 py-3 text-sm font-extrabold text-[#0B1020] hover:bg-slate-200"
          >
            See pricing
          </Link>
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-5xl px-4 pb-8 sm:px-6">
        <div className="flex items-center gap-4">
          <Link
            href={`${ABOUT_PATH}#${FOUNDERS.anson.id}`}
            className="relative h-12 w-12 shrink-0 overflow-hidden bg-[#1c2438]"
          >
            <Image
              src={FOUNDERS.anson.imageSrc}
              alt={FOUNDERS.anson.imageAlt}
              fill
              sizes="48px"
              className="object-cover"
              style={{
                objectPosition: FOUNDERS.anson.imagePosition,
                transform: `scale(${FOUNDERS.anson.imageScale})`,
              }}
            />
          </Link>
          <p className="text-sm text-[#A7B4C8]">
            Also built with {FOUNDERS.anson.name},{" "}
            {FOUNDERS.anson.homepageCredential}.{" "}
            <Link href={ABOUT_PATH} className="font-semibold text-white underline">
              About us
            </Link>
          </p>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0B1020]/95 px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <p className="hidden text-sm font-semibold text-[#C5D0E0] sm:block">
            Free calibration. No sign-up required.
          </p>
          <Link
            href={CALIBRATION_ROUTES.hub}
            onClick={trackCalibration}
            className="inline-flex w-full items-center justify-center bg-yellow-300 px-5 py-3 text-sm font-extrabold text-[#0B1020] hover:bg-yellow-200 sm:w-auto"
          >
            Start free calibration →
          </Link>
        </div>
      </div>
    </div>
  );
}
