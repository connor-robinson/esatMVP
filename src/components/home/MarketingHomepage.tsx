"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { BRAND_CONFIG } from "@/config/brand";
import { QUESTION_BANK_TOTAL_COUNT } from "@/config/questionBankMarketing";
import { CALIBRATION_ROUTES } from "@/lib/calibration/constants";
import { trackHomepageEvent } from "@/lib/homepage/analytics";
import { getSeasonPassPrice } from "@/lib/stripe/best-value";
import { SlotMachineCount } from "@/components/home/SlotMachineCount";
import { HeroTrainerDemo } from "@/components/home/HeroTrainerDemo";
import { ExampleQuestionDemo } from "@/components/home/ExampleQuestionDemo";
import { ScoreConverterPreview } from "@/components/home/ScoreConverterPreview";

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
  "Question bank: 10 free questions",
  "Free calibration & score converter",
];

const FAQ_ITEMS = [
  {
    question: "When is the best time to start preparing for the ESAT?",
    answer: [
      "We recommend starting around four to six months before your test. This gives you enough time to identify weak topics, improve your speed and complete several rounds of timed practice.",
      "That said, we have also seen students make significant progress in one to two months. The difference is usually how consistently they work. A shorter preparation period can still be effective, but there is far less room for missed sessions, unfinished topics or repeated mistakes.",
    ],
  },
  {
    question: "Are the practice questions reflective of the current ESAT syllabus?",
    answer: [
      "Yes. Every question is designed around the content and skills assessed by the current ESAT specification.",
      "We also study official ESAT materials and relevant past ENGAA, NSAA and admissions-test questions to reproduce the expected style, difficulty and time pressure. Questions are reviewed for syllabus relevance, clarity and accuracy before being added to the platform.",
    ],
  },
  {
    question: "How much preparation do I actually need?",
    answer: [
      "This depends on your current level, target universities and weakest modules. However, completing a few practice papers is rarely enough.",
      "Meaningful improvement normally requires targeted topic practice, reviewing mistakes and gradually introducing strict time limits. Students often underestimate how long it takes to turn understanding into reliable speed.",
    ],
  },
  {
    question: "What makes ESAT Camp different from a normal question bank?",
    answer: [
      "ESAT Camp is built as a complete preparation system rather than a folder of questions.",
      "The platform helps you practise individual skills, identify weak areas, complete exam-style questions and develop the speed needed for the real test. Each feature has been designed around a specific problem students face when preparing for the ESAT.",
    ],
  },
  {
    question: "How do you ensure the questions and answers are accurate?",
    answer: [
      "Questions are checked for mathematical correctness, syllabus relevance, clarity and answer consistency before publication. We also continue reviewing questions after they are released and investigate any issue reported by a student.",
      "Admissions-test questions require careful construction. We would rather publish fewer strong questions than fill the platform with large amounts of unreliable content.",
    ],
  },
  {
    question: "Can I prepare using past papers alone?",
    answer: [
      "Past papers are essential, but they are limited in number and should be used carefully.",
      "Using them too early can waste your most valuable timed resources. Topic practice and original exam-style questions allow you to build the necessary skills first, so official papers can later be used as accurate tests of your progress.",
    ],
  },
  {
    question: "What happens if I find an error or bug?",
    answer: [
      "We try our best, but with a platform this size the odd mistake or bug can still slip through. You can report it directly through the platform. Every report is reviewed, and genuine issues are corrected as quickly as possible.",
      "We take accuracy seriously. A trustworthy preparation resource should be willing to investigate mistakes rather than pretend they never happen.",
    ],
  },
  {
    question: "When should I begin completing timed papers?",
    answer: [
      "You should first build enough topic knowledge to make the paper useful, but you should not leave timed practice until the final week.",
      "Start with individual timed questions and shorter sets. Then move towards complete papers as your preparation develops. The first time you experience full ESAT time pressure should not be on test day.",
    ],
  },
] as const;

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
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 lg:pt-32 lg:pb-32 overflow-hidden bg-[#0A0F1D]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
        >
          {/* Light blue dot field */}
          <div
            className="absolute inset-0 opacity-[0.45]"
            style={{
              backgroundImage:
                "radial-gradient(rgba(147, 197, 253, 0.35) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />
          {/* Soft professional rays */}
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage: [
                "linear-gradient(118deg, transparent 42%, rgba(147, 197, 253, 0.07) 50%, transparent 58%)",
                "linear-gradient(98deg, transparent 36%, rgba(96, 165, 250, 0.06) 47%, transparent 57%)",
                "linear-gradient(138deg, transparent 28%, rgba(59, 130, 246, 0.08) 52%, transparent 68%)",
              ].join(", "),
            }}
          />
          {/* Gentle top-right wash — no blur/glow */}
          <div
            className="absolute -right-24 -top-32 h-[28rem] w-[28rem] opacity-40"
            style={{
              background:
                "radial-gradient(circle at center, rgba(147, 197, 253, 0.14) 0%, transparent 68%)",
            }}
          />
        </div>

        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-5 lg:px-6 space-y-12 lg:space-y-16">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-10 xl:gap-12">
            <div className="max-w-2xl space-y-8">
              <h1 className="text-5xl font-display font-bold leading-[1.08] tracking-tight sm:text-6xl lg:text-[4.25rem] xl:text-7xl">
                <span className="text-underline-accent">ESAT</span> Trainer
                with Practice Questions.
                <br />
                Secure your{" "}
                <span className="whitespace-nowrap">Oxbridge offer.</span>
              </h1>
              <p className="text-xl text-[#94A3B8] max-w-2xl leading-relaxed">
                The ESAT is the admissions test for many university courses at
                Cambridge, Oxford, Imperial and UCL. Practise with our
                tutor-written practice questions, and mental math drills.
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

            <HeroTrainerDemo />
          </div>

          <div className="rounded-3xl bg-white/[0.08] p-6 backdrop-blur-xl sm:p-8">
            <div className="flex w-full flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex shrink-0 -space-x-3">
                  {[
                    { src: "/home/tutors/tutor-1.png", alt: "Ajeet, ESAT tutor" },
                    { src: "/home/tutors/tutor-2.png", alt: "Annie, ESAT tutor" },
                    { src: "/home/tutors/tutor-3.png", alt: "Song, ESAT tutor" },
                  ].map((tutor) => (
                    <Image
                      key={tutor.src}
                      alt={tutor.alt}
                      src={tutor.src}
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-full object-cover ring-2 ring-[#0A0F1D]"
                    />
                  ))}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-bold text-lg sm:text-xl leading-snug">
                    Made by experienced Oxbridge tutors
                  </p>
                  <p className="mt-1 text-white/75 text-sm leading-relaxed">
                    Join 5,000+ applicants this cycle
                  </p>
                </div>
              </div>

              <div className="shrink-0 text-left sm:text-right">
                <p className="text-3xl sm:text-4xl font-display font-bold tabular-nums text-white">
                  {QUESTION_BANK_TOTAL_COUNT.toLocaleString()}+
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">
                  Practice questions
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Calibration preview */}
      <section className="py-16 bg-[#161D2F] border-y border-white/5">
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
                  A short diagnostic shows your weak spots — then practise from our
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

            <ExampleQuestionDemo />
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-24 bg-[#161D2F]">
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

      {/* Free tools — score converter */}
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
                  Enter a past-paper raw mark from NSAA, ENGAA or TMUA — see the
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
                    Get a predicted score and percentile — no account needed.
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
      <section className="py-24 bg-[#161D2F]/50">
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

            {/* Weekly — overlaps Free on xl */}
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

            {/* Monthly — sits beside Weekly without covering it */}
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
                One-time · access until 1 Oct 2026 · beats weekly rate
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
      <section className="py-24 bg-[#0A0F1D]">
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
            {FAQ_ITEMS.map((item, index) => {
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
                    <span
                      className={`material-symbols-outlined shrink-0 text-[#94A3B8] transition-transform duration-300 ease-out ${
                        open ? "rotate-180 text-[#3B82F6]" : ""
                      }`}
                      aria-hidden
                    >
                      expand_more
                    </span>
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
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-2 space-y-6">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-xl tracking-tight uppercase">
                  {BRAND_CONFIG.displayName}
                </span>
              </div>
              <p className="text-[#94A3B8] max-w-md leading-relaxed">
                Practice for the ESAT and TMUA with past papers, a curated
                question bank, and timed mental maths drills — so you can prepare
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
                Support
              </h4>
              <ul className="space-y-4 text-sm text-[#94A3B8]">
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
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-[#94A3B8] text-xs">
              {BRAND_CONFIG.copyright}
            </p>
            <div className="flex gap-6">
              <a
                href="#"
                className="text-[#94A3B8] hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-lg">public</span>
              </a>
              <a
                href="#"
                className="text-[#94A3B8] hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-lg">
                  alternate_email
                </span>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
