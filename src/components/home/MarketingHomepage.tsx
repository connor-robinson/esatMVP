"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { BRAND_CONFIG } from "@/config/brand";
import { ABOUT_PATH, FOUNDERS } from "@/config/founders";
import { HOMEPAGE_SOCIAL_PROOF } from "@/config/homepageSocialProof";
import { NAVBAR_HEIGHT_PX } from "@/config/layout";
import { QUESTION_BANK_TOTAL_COUNT } from "@/config/questionBankMarketing";
import { MENTAL_MATHS_MODULE_COUNT_MARKETING } from "@/config/mentalMathsMarketing";
import { CALIBRATION_ROUTES } from "@/lib/calibration/constants";
import { SEO_LINKS, type SeoLinkKey } from "@/lib/seo/links";
import { MARKETING_HOMEPAGE_FAQ } from "@/lib/homepage/marketingFaq";
import { trackHomepageEvent } from "@/lib/homepage/analytics";
import { openCookiePreferences } from "@/lib/ga";
import { getSeasonPassPrice, SEASON_PASS_ACCESS_UNTIL_LABEL } from "@/lib/stripe/best-value";
import { cn } from "@/lib/utils";
import { ExampleQuestionDemo } from "@/components/home/ExampleQuestionDemo";

const SlotMachineCount = dynamic(
  () =>
    import("@/components/home/SlotMachineCount").then((m) => m.SlotMachineCount),
  { ssr: false },
);

const QuestionBankDistributionChart = dynamic(
  () =>
    import("@/components/home/QuestionBankDistributionChart").then(
      (m) => m.QuestionBankDistributionChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[22rem] rounded-2xl bg-[#0A0F1D]/40" aria-hidden />
    ),
  },
);

const MeetFounders = dynamic(
  () => import("@/components/home/MeetFounders").then((m) => m.MeetFounders),
  {
    ssr: false,
    loading: () => <div className="min-h-[28rem]" aria-hidden />,
  },
);

const ScoreConverterPreview = dynamic(
  () =>
    import("@/components/home/ScoreConverterPreview").then(
      (m) => m.ScoreConverterPreview,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[20rem] rounded-2xl bg-[#0A0F1D]/40" aria-hidden />
    ),
  },
);

const HeroTrainerDemo = dynamic(
  () =>
    import("@/components/home/HeroTrainerDemo").then((m) => m.HeroTrainerDemo),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[28rem] rounded-3xl bg-white/[0.08]" aria-hidden />
    ),
  },
);

const HOMEPAGE_SECTIONS = [
  { id: "practice", label: "Practice" },
  { id: "features", label: "Features" },
  { id: "about", label: "About" },
  { id: "pricing", label: "Pricing" },
  { id: "faqs", label: "FAQs" },
] as const;

function HomepageSectionNav() {
  const [active, setActive] = useState<string>(HOMEPAGE_SECTIONS[0].id);

  useEffect(() => {
    const ids = HOMEPAGE_SECTIONS.map((section) => section.id);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActive(visible[0].target.id);
        }
      },
      { rootMargin: "-40% 0px -45% 0px", threshold: [0, 0.25, 0.5] },
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Page sections"
      className="sticky z-30 bg-[#0A0F1D]/90 backdrop-blur-md"
      style={{ top: NAVBAR_HEIGHT_PX }}
    >
      <div className="mx-auto flex max-w-[1400px] justify-center gap-2 overflow-x-auto px-4 py-3 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-3 sm:px-5 sm:py-4 lg:gap-4 lg:px-6 [&::-webkit-scrollbar]:hidden">
        {HOMEPAGE_SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className={cn(
              "shrink-0 rounded-xl px-4 py-2.5 text-base font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] sm:px-5 sm:py-3 sm:text-lg",
              active === section.id
                ? "bg-white/10 text-white"
                : "text-[#94A3B8] hover:text-white",
            )}
            aria-current={active === section.id ? "true" : undefined}
          >
            {section.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

const PAID_FEATURES = [
  "Full mental maths access",
  "Full roadmap & past papers",
  `Unlimited question bank (${QUESTION_BANK_TOTAL_COUNT.toLocaleString()}+)`,
  "Solutions & stats overview",
  "Drills & flashcard mode",
];

const FREE_FEATURES = [
  "Mental maths: Addition module only",
  "Past papers: first 3 roadmap items",
  "Question bank: 10 free questions per subject",
  "Free calibration & score converter",
];

/** Highest-intent guide pages, surfaced in the footer for crawlability. */
const FOOTER_GUIDE_KEYS: SeoLinkKey[] = [
  "preparation",
  "testDates",
  "pastPapers",
  "universityRequirements",
  "goodScore",
  "calculatorRules",
];

export function MarketingHomepage() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const seasonPrice = getSeasonPassPrice();

  useEffect(() => {
    void trackHomepageEvent("homepage_viewed", {
      user_state: "logged_out",
      calibration_status: "none",
    });
  }, []);

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <div className="scroll-smooth">
      <HomepageSectionNav />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-24 lg:pb-32 bg-[#0A0F1D]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.45]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(147, 197, 253, 0.35) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="relative mx-auto max-w-[1400px] space-y-10 px-4 sm:px-5 lg:space-y-14 lg:px-6">
          <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] items-center gap-4 sm:gap-8 lg:gap-10 xl:gap-12">
            <div className="min-w-0 space-y-5 sm:space-y-7 lg:space-y-8">
              <h1 className="font-display text-[clamp(1.875rem,0.75rem+5vw,6rem)] font-bold leading-[0.95] tracking-[-0.04em]">
                The leading{" "}
                <span
                  className="group relative inline-block cursor-help"
                  tabIndex={0}
                  aria-describedby="esat-definition"
                >
                  <span className="text-underline-accent">ESAT</span>
                  <span
                    id="esat-definition"
                    role="tooltip"
                    className="pointer-events-none absolute left-0 top-full z-20 mt-3 w-[min(22rem,calc(100vw-2rem))] rounded-xl bg-[#161D2F] px-4 py-3 text-left text-sm font-normal leading-relaxed tracking-normal text-[#94A3B8] opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100 group-focus:opacity-100 sm:w-[24rem]"
                  >
                    The ESAT is the Engineering and Science Admissions Test for
                    undergraduate STEM applicants. It is a mandatory entrance
                    exam for engineering, science, and medical courses at
                    Cambridge, Oxford, Imperial College London, and UCL.
                  </span>
                </span>{" "}
                question bank
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-[#94A3B8] sm:text-lg lg:text-xl">
                Secure your Oxbridge offers with our{" "}
                <span className="text-underline-accent text-white">
                  {QUESTION_BANK_TOTAL_COUNT.toLocaleString()}+ practice
                  questions
                </span>{" "}
                and{" "}
                <span className="text-underline-accent text-white">
                  {MENTAL_MATHS_MODULE_COUNT_MARKETING}+ mental maths courses
                </span>
                .
              </p>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/login?mode=signup"
                    className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 text-base font-bold text-[#0A0F1D] transition-all hover:bg-slate-200"
                  >
                    Sign up free
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-xl border border-white/20 px-6 py-3.5 text-base font-bold text-white transition-all hover:bg-white/5"
                  >
                    Sign in
                  </Link>
                </div>
                <p className="text-sm text-[#94A3B8]">
                  Sign up to start using for free, upgrade later.
                </p>
              </div>
            </div>

            <div className="min-w-0">
              <ExampleQuestionDemo variant="hero" />
            </div>
          </div>

          <div className="rounded-3xl bg-white/[0.08] p-6 backdrop-blur-xl sm:p-8">
            <div className="flex w-full flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
              <div className="flex min-w-0 items-start gap-4 sm:items-center sm:gap-5">
                <Link
                  href={`${ABOUT_PATH}#${FOUNDERS.ewan.id}`}
                  className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[#161D2F] sm:h-20 sm:w-20"
                >
                  <Image
                    src={FOUNDERS.ewan.imageSrc}
                    alt={FOUNDERS.ewan.imageAlt}
                    fill
                    sizes="80px"
                    className="object-cover"
                    style={{ objectPosition: FOUNDERS.ewan.imagePosition }}
                    priority
                  />
                </Link>
                <div className="min-w-0 space-y-1.5">
                  <p className="text-base font-bold leading-snug text-white sm:text-lg lg:text-xl">
                    Hi, I&apos;m{" "}
                    <Link
                      href={`${ABOUT_PATH}#${FOUNDERS.ewan.id}`}
                      className="text-underline-accent transition-colors hover:text-[#93C5FD]"
                    >
                      {FOUNDERS.ewan.name}
                    </Link>
                    , co-founder of ESAT Camp.
                  </p>
                  <p className="text-sm leading-relaxed text-[#94A3B8] sm:text-base">
                    We built the platform we wished we&apos;d had for the ESAT.
                  </p>
                  <p className="text-xs font-medium text-[#64748B] sm:text-sm">
                    {FOUNDERS.ewan.credential}
                  </p>
                </div>
              </div>

              <dl
                className={cn(
                  "grid shrink-0 gap-x-6 gap-y-5 sm:gap-x-8 lg:gap-x-10",
                  HOMEPAGE_SOCIAL_PROOF.uniqueVisitors != null
                    ? "grid-cols-2 sm:grid-cols-4"
                    : "grid-cols-3",
                )}
              >
                {(
                  [
                    {
                      value: HOMEPAGE_SOCIAL_PROOF.practiceQuestions,
                      label: "Practice questions",
                    },
                    ...(HOMEPAGE_SOCIAL_PROOF.uniqueVisitors != null
                      ? [
                          {
                            value: HOMEPAGE_SOCIAL_PROOF.uniqueVisitors,
                            label: "Unique visitors",
                          },
                        ]
                      : []),
                    {
                      value: HOMEPAGE_SOCIAL_PROOF.users,
                      label: "Users",
                    },
                    {
                      value: HOMEPAGE_SOCIAL_PROOF.questionsAnswered,
                      label: "Questions done",
                    },
                  ] as { value: number; label: string }[]
                ).map((stat) => (
                  <div key={stat.label} className="min-w-0">
                    <dt className="sr-only">{stat.label}</dt>
                    <dd className="font-display text-2xl font-bold tabular-nums text-white sm:text-3xl">
                      {stat.value.toLocaleString()}+
                    </dd>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#94A3B8] sm:text-xs">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* Calibration preview */}
      <section
        id="practice"
        className="scroll-mt-28 border-y border-white/5 bg-[#161D2F] py-16"
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-5 lg:px-6">
          <div className="grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-10 lg:gap-14 items-center">
            <div className="space-y-8">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-[#3B82F6] mb-4">
                  Free calibration
                </h2>
                <h3 className="text-3xl font-display font-bold mb-4">
                  Know what to practise first
                </h3>
                <p className="text-[#94A3B8] leading-relaxed max-w-lg">
                  A short diagnostic shows your weak spots, then you practise from our
                  question bank.
                </p>
              </div>

              <div>
                <SlotMachineCount value={QUESTION_BANK_TOTAL_COUNT} />
                <p className="mt-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">
                  Practice questions in the bank
                </p>
              </div>

              <Link
                href={CALIBRATION_ROUTES.hub}
                onClick={() =>
                  void trackHomepageEvent("calibration_cta_clicked", {
                    user_state: "logged_out",
                    destination: CALIBRATION_ROUTES.hub,
                  })
                }
                className="inline-flex rounded-xl bg-[#3B82F6] px-6 py-3 font-bold text-white transition-all hover:bg-[#2563EB]"
              >
                Start free calibration
              </Link>
            </div>

            <QuestionBankDistributionChart />
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section id="features" className="scroll-mt-28 bg-[#161D2F] py-24">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-5 lg:px-6">
          <div className="text-center max-w-3xl mx-auto mb-10 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-[#3B82F6]">
              Why choose us
            </h2>
            <h3 className="text-4xl font-display font-bold">
              What do we offer?
            </h3>
            <p className="text-lg text-[#94A3B8] sm:text-xl">
              Try without signing up
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 md:gap-8">
            {/* Mental Maths Trainer Card */}
            <div className="group flex flex-col rounded-2xl bg-[#0A0F1D]/55 p-8 transition-all duration-300 ease-out hover:scale-[1.02] hover:bg-[#0A0F1D]/90">
              <h4 className="text-2xl font-display font-bold text-white">
                Mental Maths Trainer
              </h4>
              <p className="mt-3 text-[#94A3B8] leading-relaxed">
                The ESAT & TMUA are non-calculator exams with heavy arithmetic.
                Get faster & better with our specialized trainer.
              </p>
              <div className="mt-auto mb-6 rounded-xl bg-[#161D2F] p-4 font-mono text-sm">
                <p className="text-[#34D399]">
                  Problem:{" "}
                  <span className="text-white">√(144 × 25) / 5</span>
                </p>
                <p className="mt-2 text-[#94A3B8]">&gt; Input your answer…</p>
              </div>
              <Link
                href="/mental-maths/drill"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#3B82F6] py-3.5 font-bold text-white transition-colors hover:bg-[#2563EB]"
              >
                Try trainer
                <span aria-hidden className="text-lg leading-none">
                  →
                </span>
              </Link>
            </div>

            {/* Past Papers Card */}
            <div className="group flex flex-col rounded-2xl bg-[#0A0F1D]/55 p-8 transition-all duration-300 ease-out hover:scale-[1.02] hover:bg-[#0A0F1D]/90">
              <h4 className="text-2xl font-display font-bold text-white">
                Past Papers
              </h4>
              <p className="mt-3 text-[#94A3B8] leading-relaxed">
                All official past papers plus our own targeted practice, planned
                into a roadmap that fits your revision schedule.
              </p>
              <div className="mt-auto mb-6 space-y-3">
                <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-4 py-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-[85%] rounded-full bg-[#3B82F6]" />
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-white/70">
                    85%
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-4 py-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-[20%] rounded-full bg-white/20" />
                  </div>
                  <span className="text-xs font-semibold text-white/50">
                    Scheduled
                  </span>
                </div>
              </div>
              <Link
                href="/past-papers/roadmap"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#3B82F6] py-3.5 font-bold text-white transition-colors hover:bg-[#2563EB]"
              >
                View roadmap
                <span aria-hidden className="text-lg leading-none">
                  →
                </span>
              </Link>
            </div>

            {/* Question Bank Card */}
            <div className="group flex flex-col rounded-2xl bg-[#0A0F1D]/55 p-8 transition-all duration-300 ease-out hover:scale-[1.02] hover:bg-[#0A0F1D]/90">
              <h4 className="text-2xl font-display font-bold text-white">
                {QUESTION_BANK_TOTAL_COUNT.toLocaleString()}+ Practice Questions
              </h4>
              <p className="mt-3 text-[#94A3B8] leading-relaxed">
                Practise by subject, difficulty, and topic with instant feedback
                and analytics.
              </p>
              <div className="mt-auto mb-6 rounded-xl bg-white/[0.04] px-5 py-5">
                <p className="text-4xl font-display font-bold tabular-nums tracking-tight text-white">
                  {QUESTION_BANK_TOTAL_COUNT.toLocaleString()}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#94A3B8]">
                  Questions in the bank
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["Math 1", "Math 2", "Physics", "Chem", "Bio"].map(
                    (subject) => (
                      <span
                        key={subject}
                        className="rounded-lg bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-white/65"
                      >
                        {subject}
                      </span>
                    ),
                  )}
                </div>
              </div>
              <Link
                href="/questions"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#3B82F6] py-3.5 font-bold text-white transition-colors hover:bg-[#2563EB]"
              >
                Try question bank
                <span aria-hidden className="text-lg leading-none">
                  →
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Mental maths trainer showcase */}
      <section className="bg-[#0A0F1D] py-24">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-5 lg:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16 xl:gap-20">
            <div className="space-y-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#3B82F6]">
                  Mental maths trainer
                </p>
                <h2 className="mt-4 font-display text-4xl font-bold tracking-tight lg:text-5xl">
                  Time is of the essence in the ESAT
                </h2>
                <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#94A3B8]">
                  Each module gives about 90 seconds per question, with no
                  calculator. Arithmetic that feels easy in school becomes the
                  bottleneck under exam pressure. Our trainer is built for that
                  pace.
                </p>
              </div>

              <div className="flex flex-wrap gap-8 sm:gap-10">
                <div>
                  <p className="font-display text-4xl font-bold tabular-nums text-white sm:text-5xl">
                    ≈90s
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#94A3B8]">
                    Per question
                  </p>
                </div>
                <div>
                  <p className="font-display text-4xl font-bold tabular-nums text-white sm:text-5xl">
                    {MENTAL_MATHS_MODULE_COUNT_MARKETING}+
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#94A3B8]">
                    Practice modules
                  </p>
                </div>
              </div>

              <ul className="space-y-4">
                {[
                  "Short timed drills that train speed and accuracy together",
                  "Topics that show up inside Maths 1, Maths 2, and science questions",
                  "Instant feedback so you fix slow steps before they cost marks",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#3B82F6]"
                    />
                    <p className="text-base leading-relaxed text-[#94A3B8] sm:text-lg">
                      {item}
                    </p>
                  </li>
                ))}
              </ul>

              <Link
                href="/mental-maths/drill"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3B82F6] px-7 py-3.5 font-bold text-white transition-colors hover:bg-[#2563EB]"
              >
                Try the mental maths trainer
                <span aria-hidden className="text-lg leading-none">
                  →
                </span>
              </Link>
            </div>

            <div className="flex justify-center lg:justify-end">
              <HeroTrainerDemo className="w-full max-w-[28rem] justify-self-center" />
            </div>
          </div>
        </div>
      </section>

      <MeetFounders />

      {/* Free tools - score converter */}
      <section className="py-24 bg-[#0A0F1D]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-5 lg:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <ScoreConverterPreview />

            <div className="space-y-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#3B82F6]">
                  Free tools
                </p>
                <h2 className="mt-4 text-4xl font-display font-bold lg:text-5xl">
                  Try our free tools
                </h2>
                <p className="mt-5 text-lg leading-relaxed text-[#94A3B8]">
                  Enter a past-paper raw mark from NSAA, ENGAA or TMUA. See the
                  predicted ESAT or TMUA score and where that sits on the
                  official distribution.
                </p>
              </div>

              <ul className="space-y-5">
                <li className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#3B82F6]"
                  />
                  <p className="text-lg text-[#94A3B8]">
                    Pick an exam and year, then convert section scores in one
                    place.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#3B82F6]"
                  />
                  <p className="text-lg text-[#94A3B8]">
                    Get a predicted score and percentile. No account needed.
                  </p>
                </li>
              </ul>

              <Link
                href="/tools/score-converter"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3B82F6] px-7 py-3.5 font-bold text-white transition-colors hover:bg-[#2563EB]"
              >
                Open score converter
                <span aria-hidden className="text-lg leading-none">
                  →
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="scroll-mt-28 bg-[#161D2F]/50 py-24">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-5 lg:px-6">
          <div className="mx-auto mb-16 max-w-2xl text-center sm:mb-20">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-[#3B82F6]">
              Pricing
            </h2>
            <h3 className="text-4xl font-display font-bold">
              Invest in your future
            </h3>
            <p className="mt-4 text-[#94A3B8]">
              Same full access on every paid plan. Pick the billing that fits
              your prep timeline.
            </p>
          </div>

          <div className="mx-auto grid max-w-6xl items-stretch gap-5 sm:grid-cols-2 xl:flex xl:max-w-7xl xl:items-stretch xl:justify-center xl:gap-0">
            {/* Free */}
            <div className="relative z-[1] flex flex-col rounded-3xl bg-[#0A0F1D]/70 p-7 sm:col-start-1 xl:my-8 xl:w-[min(19rem,28%)] xl:shrink-0 xl:p-8">
              <h4 className="text-lg font-bold text-white">Free</h4>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-display font-bold text-white">
                  £0
                </span>
              </div>
              <p className="mt-2 text-sm text-[#94A3B8]">Try the basics</p>
              <ul className="mt-8 flex-1 space-y-3 text-sm text-[#94A3B8]">
                {FREE_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span
                      aria-hidden
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#3B82F6]"
                    />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/login?mode=signup"
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-3.5 font-bold text-white transition-colors hover:bg-white/15"
              >
                Get started
                <span aria-hidden>→</span>
              </Link>
            </div>

            {/* Weekly - overlaps Free on xl */}
            <div className="relative z-10 flex flex-col rounded-3xl bg-[#0A0F1D]/70 p-7 sm:col-start-2 xl:my-8 xl:-ml-[14%] xl:w-[min(19rem,28%)] xl:shrink-0 xl:p-8">
              <h4 className="text-lg font-bold text-white">Weekly</h4>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-display font-bold text-white">
                  £8
                </span>
                <span className="text-sm text-[#94A3B8]">/week</span>
              </div>
              <p className="mt-2 text-sm text-[#94A3B8]">Flexible short-term access</p>
              <ul className="mt-8 flex-1 space-y-3 text-sm text-[#94A3B8]">
                {PAID_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span
                      aria-hidden
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#3B82F6]"
                    />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/pricing"
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-3.5 font-bold text-white transition-colors hover:bg-white/15"
              >
                Choose weekly
                <span aria-hidden>→</span>
              </Link>
            </div>

            {/* Monthly - sits beside Weekly without covering it */}
            <div className="relative z-20 flex flex-col rounded-3xl bg-[#3B82F6] p-8 sm:col-span-2 sm:max-w-md sm:justify-self-center sm:p-9 xl:col-auto xl:max-w-none xl:w-[min(22rem,32%)] xl:shrink-0 xl:p-10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-3.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#3B82F6]">
                Most popular
              </div>
              <h4 className="text-xl font-bold text-white">Monthly</h4>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-5xl font-display font-bold text-white">
                  £25
                </span>
                <span className="text-sm text-white/75">/month</span>
              </div>
              <p className="mt-2 text-sm font-medium text-white/80">
                £6.25/week · 7-day free trial
              </p>
              <ul className="mt-8 flex-1 space-y-3 text-sm text-white">
                {PAID_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span
                      aria-hidden
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white"
                    />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/pricing"
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white py-4 text-base font-bold text-[#3B82F6] transition-colors hover:bg-slate-100"
              >
                Choose monthly
                <span aria-hidden>→</span>
              </Link>
            </div>

            {/* Exam Season Pass */}
            <div className="relative z-[1] flex flex-col rounded-3xl bg-[#0A0F1D]/70 p-7 xl:my-8 xl:-ml-5 xl:w-[min(19rem,28%)] xl:shrink-0 xl:p-8">
              <h4 className="text-lg font-bold text-white">Exam Season Pass</h4>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-display font-bold text-white">
                  £{seasonPrice}
                </span>
                <span className="text-sm text-[#94A3B8]">once</span>
              </div>
              <p className="mt-2 text-sm text-[#94A3B8]">
                One-time · access until {SEASON_PASS_ACCESS_UNTIL_LABEL} · beats weekly rate
              </p>
              <ul className="mt-8 flex-1 space-y-3 text-sm text-[#94A3B8]">
                {PAID_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span
                      aria-hidden
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#3B82F6]"
                    />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/pricing"
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-3.5 font-bold text-white transition-colors hover:bg-white/15"
              >
                Choose season pass
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faqs" className="scroll-mt-28 bg-[#0A0F1D] py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-5 lg:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-display font-bold sm:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[#94A3B8] sm:text-base">
              Clear answers about ESAT preparation, question quality and how to
              use the platform well.
            </p>
          </div>
          <div className="space-y-3">
            {MARKETING_HOMEPAGE_FAQ.map((item, index) => {
              const open = expandedFaq === index;
              return (
                <div
                  key={item.question}
                  className="overflow-hidden rounded-2xl bg-white/[0.035] transition-colors hover:bg-white/[0.055]"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition-colors focus-visible:outline-none sm:px-6"
                    aria-expanded={open}
                  >
                    <span className="text-base font-bold leading-snug text-white sm:text-lg">
                      {item.question}
                    </span>
                    <svg
                      viewBox="0 0 24 24"
                      className={`h-6 w-6 shrink-0 text-[#94A3B8] transition-transform duration-300 ease-out ${
                        open ? "rotate-180 text-[#3B82F6]" : ""
                      }`}
                      aria-hidden
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  <div
                    className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                      open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div
                        className={`space-y-4 px-5 pb-6 text-sm leading-relaxed text-[#94A3B8] transition-opacity duration-300 ease-out sm:px-6 sm:text-[15px] ${
                          open ? "opacity-100" : "opacity-0"
                        }`}
                      >
                        {item.answer.map((paragraph) => (
                          <p key={paragraph}>{paragraph}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-24 pb-12 border-t border-white/5 bg-[#0A0F1D]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-5 lg:px-6">
          <div className="grid md:grid-cols-5 gap-12 mb-16">
            <div className="md:col-span-2 space-y-6">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-xl tracking-tight uppercase">
                  {BRAND_CONFIG.displayName}
                </span>
              </div>
              <p className="text-[#94A3B8] max-w-md leading-relaxed">
                Practice for the ESAT and TMUA with past papers, a curated
                question bank, and timed mental maths drills, so you can prepare
                with the speed and precision the exams demand.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-6 uppercase text-[10px] tracking-widest">
                Platform
              </h4>
              <ul className="space-y-4 text-sm text-[#94A3B8]">
                <li>
                  <Link
                    href="/mental-maths/drill"
                    className="hover:text-[#3B82F6] transition-colors"
                  >
                    Mental Maths
                  </Link>
                </li>
                <li>
                  <Link
                    href="/questions/questionbank"
                    className="hover:text-[#3B82F6] transition-colors"
                  >
                    Question Bank
                  </Link>
                </li>
                <li>
                  <Link
                    href="/past-papers/library"
                    className="hover:text-[#3B82F6] transition-colors"
                  >
                    Past Papers
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-6 uppercase text-[10px] tracking-widest">
                ESAT guides
              </h4>
              <ul className="space-y-4 text-sm text-[#94A3B8]">
                {FOOTER_GUIDE_KEYS.map((key) => (
                  <li key={key}>
                    <Link
                      href={SEO_LINKS[key].href}
                      className="hover:text-[#3B82F6] transition-colors"
                    >
                      {SEO_LINKS[key].label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-6 uppercase text-[10px] tracking-widest">
                Support
              </h4>
              <ul className="space-y-4 text-sm text-[#94A3B8]">
                <li>
                  <Link
                    href="/about"
                    className="hover:text-[#3B82F6] transition-colors"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    href="/help"
                    className="hover:text-[#3B82F6] transition-colors"
                  >
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link
                    href="/help"
                    className="hover:text-[#3B82F6] transition-colors"
                  >
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link
                    href="/cookie-policy"
                    className="hover:text-[#3B82F6] transition-colors"
                  >
                    Cookie Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-[#94A3B8] text-xs">
              {BRAND_CONFIG.copyright}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6">
              <Link
                href="/cookie-policy"
                className="text-xs text-[#94A3B8] transition-colors hover:text-white"
              >
                Cookie Policy
              </Link>
              <button
                type="button"
                onClick={() => openCookiePreferences()}
                className="text-xs text-[#94A3B8] transition-colors hover:text-white"
              >
                Cookie preferences
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
