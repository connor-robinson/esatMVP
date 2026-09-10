"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState, type ReactNode } from "react";
import { BRAND_CONFIG } from "@/config/brand";
import { ABOUT_PATH, FOUNDERS } from "@/config/founders";
import { NAVBAR_HEIGHT_PX } from "@/config/layout";
import { QUESTION_BANK_TOTAL_COUNT } from "@/config/questionBankMarketing";
import { MENTAL_MATHS_MODULE_COUNT_MARKETING, MENTAL_MATHS_TOPIC_COUNT_MARKETING } from "@/config/mentalMathsMarketing";
import { CALIBRATION_ROUTES } from "@/lib/calibration/constants";
import { SEO_LINKS, type SeoLinkKey } from "@/lib/seo/links";
import { MARKETING_HOMEPAGE_FAQ } from "@/lib/homepage/marketingFaq";
import { trackHomepageEvent } from "@/lib/homepage/analytics";
import { openCookiePreferences } from "@/lib/ga";
import {
  formatGbpPrice,
  getMonthlyDiscountPercent,
  getMonthlyPricePerWeek,
  getSeasonPassPrice,
  MONTHLY_LIST_PRICE_GBP,
  MONTHLY_PRICE_GBP,
  SEASON_PASS_ACCESS_UNTIL_LABEL,
} from "@/lib/stripe/best-value";
import { cn } from "@/lib/utils";
import { useHomepageAutoHideNav } from "@/hooks/useHomepageAutoHideNav";
import { ExampleGraphQuestion } from "@/components/home/ExampleGraphQuestion";
import { HeroDeviceShowcase } from "@/components/home/HeroDeviceShowcase";
import { HomepageReviews } from "@/components/home/HomepageReviews";

const SlotMachineCount = dynamic(
  () =>
    import("@/components/home/SlotMachineCount").then((m) => m.SlotMachineCount),
  { ssr: false },
);

const PastPaperPlayerPreview = dynamic(
  () =>
    import("@/components/home/PastPaperPlayerPreview").then(
      (m) => m.PastPaperPlayerPreview,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[16rem] rounded-2xl bg-white/[0.06]" aria-hidden />
    ),
  },
);

const HomepageRoadmapPreview = dynamic(
  () =>
    import("@/components/home/HomepageRoadmapPreview").then(
      (m) => m.HomepageRoadmapPreview,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[16rem] rounded-2xl bg-white/[0.06]" aria-hidden />
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
      <div className="min-h-[28rem] rounded-2xl bg-white/[0.08]" aria-hidden />
    ),
  },
);

const HOMEPAGE_SECTIONS = [
  { id: "practice", label: "Practice" },
  { id: "features", label: "Features" },
  { id: "about", label: "About" },
  { id: "reviews", label: "Reviews" },
  { id: "pricing", label: "Pricing" },
  { id: "faqs", label: "FAQs" },
] as const;

function HomepageSectionNav({ navVisible }: { navVisible: boolean }) {
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
      className="sticky z-30 bg-[#0A0F1D]/90 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-md transition-[top] duration-300 ease-out"
      style={{ top: navVisible ? NAVBAR_HEIGHT_PX : 0 }}
    >
      <div className="mx-auto flex max-w-[1400px] justify-center gap-2 overflow-x-auto px-4 py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-3 sm:px-5 sm:py-3 lg:gap-4 lg:px-6 [&::-webkit-scrollbar]:hidden">
        {HOMEPAGE_SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className={cn(
              "shrink-0 rounded-xl px-3.5 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] sm:px-4 sm:py-2.5 sm:text-base",
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

export function MarketingHomepage({
  socialProofSlot,
}: {
  socialProofSlot?: ReactNode;
}) {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const { navVisible } = useHomepageAutoHideNav();
  const seasonPrice = getSeasonPassPrice();
  const monthlyPriceLabel = formatGbpPrice(MONTHLY_PRICE_GBP);
  const monthlyListPriceLabel = formatGbpPrice(MONTHLY_LIST_PRICE_GBP);
  const monthlyPerWeekLabel = formatGbpPrice(getMonthlyPricePerWeek());
  const monthlyDiscountLabel = `${getMonthlyDiscountPercent()}% off`;

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
    <div
      className="scroll-smooth bg-[#0A0F1D] transition-[padding-top] duration-300 ease-out"
      style={{ paddingTop: navVisible ? NAVBAR_HEIGHT_PX : 0 }}
    >
      <HomepageSectionNav navVisible={navVisible} />

      {/* Hero: leave room for section nav + a peek of the founder strip */}
      <section className="relative flex min-h-[calc(100svh-11.5rem)] flex-col justify-center bg-[#0A0F1D] pt-8 pb-6 lg:pt-10 lg:pb-8">
        <div className="relative mx-auto grid w-full max-w-[1400px] flex-1 items-center gap-8 px-6 sm:px-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-10 lg:px-10 xl:gap-14 xl:px-12">
          <div className="flex min-w-0 flex-col gap-5 sm:gap-6">
            <h1 className="whitespace-nowrap font-display font-bold leading-[1.08] tracking-[-0.03em] text-white [font-size:clamp(2rem,min(0.9rem+3.2vw,7.5cqi),3.25rem)]">
              Revise for the ESAT
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-[#94A3B8] sm:text-lg">
              With our{" "}
              <span className="font-semibold text-white">
                {QUESTION_BANK_TOTAL_COUNT.toLocaleString()}+ questions
              </span>{" "}
              written by our Oxbridge tutors,{" "}
              <span className="font-semibold text-white">
                {MENTAL_MATHS_MODULE_COUNT_MARKETING} mental maths drills
              </span>
              , and more.
            </p>
            <div className="pt-1">
              <Link
                href={CALIBRATION_ROUTES.hub}
                onClick={() =>
                  void trackHomepageEvent("calibration_cta_clicked", {
                    user_state: "logged_out",
                    destination: CALIBRATION_ROUTES.hub,
                  })
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-7 py-3.5 text-base font-bold text-[#0A0F1D] transition-colors hover:bg-slate-100 sm:text-lg"
              >
                Start free calibration
                <span aria-hidden className="text-lg leading-none">
                  →
                </span>
              </Link>
            </div>
          </div>

          <HeroDeviceShowcase className="lg:justify-self-end" />
        </div>
      </section>

      {/* Founder strip: top edge peeks into the first viewport */}
      <section className="border-t border-white/10 bg-[#0A0F1D] py-6 sm:py-8">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-5 px-6 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10 xl:px-12">
          <div className="flex min-w-0 items-start gap-4 sm:items-center sm:gap-5">
            <Link
              href={`${ABOUT_PATH}#${FOUNDERS.ewan.id}`}
              className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-[#161D2F] sm:h-28 sm:w-28"
            >
              <Image
                src={FOUNDERS.ewan.imageSrc}
                alt={FOUNDERS.ewan.imageAlt}
                fill
                sizes="112px"
                className="object-cover"
                style={{
                  objectPosition: FOUNDERS.ewan.imagePosition,
                  transform: `scale(${FOUNDERS.ewan.imageScale})`,
                }}
                priority
              />
            </Link>
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-bold leading-snug text-white sm:text-base lg:text-lg">
                Hi, I&apos;m{" "}
                <Link
                  href={`${ABOUT_PATH}#${FOUNDERS.ewan.id}`}
                  className="text-underline-accent transition-colors hover:text-[#93C5FD]"
                >
                  {FOUNDERS.ewan.name}
                </Link>
                , co-founder of ESAT Camp.
              </p>
              <p className="text-xs leading-relaxed text-[#94A3B8] sm:text-sm">
                Our goal is to build the platform we wish we had for the ESAT.
              </p>
            </div>
          </div>
          {socialProofSlot}
        </div>
      </section>

      {/* What we offer + Question Bank */}
      <section
        id="features"
        className="scroll-mt-28 border-t border-white/5 bg-[#161D2F] pt-14 pb-16 sm:pt-16 sm:pb-20"
      >
        <div className="mx-auto max-w-[1400px] px-4 sm:px-5 lg:px-6">
          <h2 className="mb-12 text-center font-display text-3xl font-bold text-white sm:mb-14 sm:text-4xl">
            What do we offer?
          </h2>

          <div
            id="practice"
            className="scroll-mt-28 grid items-center gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14"
          >
            <div className="space-y-8">
              <div>
                <h3 className="mb-4 font-display text-3xl font-bold text-white sm:text-4xl">
                  ESAT Question Bank
                </h3>
                <p className="max-w-lg leading-relaxed text-[#94A3B8]">
                  Explore practice questions written to match the difficulty and
                  style of the ESAT.
                </p>
              </div>

              <div>
                <SlotMachineCount value={QUESTION_BANK_TOTAL_COUNT} />
                <p className="mt-3 text-sm text-[#94A3B8]">
                  Practice questions in the bank
                </p>
              </div>

              <Link
                href="/questions"
                className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-6 py-3 font-bold text-white transition-all hover:bg-[#2563EB]"
              >
                Try our questions
                <span aria-hidden className="text-lg leading-none">
                  →
                </span>
              </Link>
            </div>

            <ExampleGraphQuestion className="flex w-full max-w-none flex-col" />
          </div>
        </div>
      </section>

      {/* Past papers simulator */}
      <section className="bg-[#0A0F1D] py-20 sm:py-24">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-5 lg:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-14 xl:gap-20">
            <div className="order-2 flex flex-row flex-nowrap items-center justify-center gap-2 sm:gap-3 lg:order-1 lg:justify-start lg:gap-4">
              <div className="w-[58%] max-w-[26rem] shrink sm:w-auto sm:max-w-[28rem] lg:max-w-[30rem]">
                <PastPaperPlayerPreview embedded />
              </div>
              <div className="w-[38%] max-w-[14rem] shrink-0 sm:w-auto sm:max-w-[15rem] lg:max-w-[16rem]">
                <HomepageRoadmapPreview />
              </div>
            </div>

            <div className="order-1 space-y-8 lg:order-2">
              <div>
                <h2 className="font-display text-4xl font-bold tracking-tight text-white lg:text-5xl">
                  Past papers simulator
                </h2>
                <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#94A3B8]">
                  Sit official papers and our mocks in a UAT-UK-style simulator,
                  with our past paper roadmap.
                </p>
              </div>

              <ul className="space-y-4">
                {[
                  "Official past papers",
                  "Pacing statistics to improve your pacing",
                  "ESAT Camp Mock papers",
                  "A roadmap so you sit papers in the right order",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white"
                    />
                    <p className="text-base leading-relaxed text-[#94A3B8] sm:text-lg">
                      {item}
                    </p>
                  </li>
                ))}
              </ul>

              <Link
                href="/past-papers/roadmap"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3B82F6] px-7 py-3.5 font-bold text-white transition-colors hover:bg-[#2563EB]"
              >
                View past papers
                <span aria-hidden className="text-lg leading-none">
                  →
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Mental Maths Trainer */}
      <section className="bg-[#161D2F] py-20 sm:py-24">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-5 lg:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16 xl:gap-20">
            <div className="space-y-8">
              <div>
                <h2 className="font-display text-4xl font-bold tracking-tight text-white lg:text-5xl">
                  Mental Maths Trainer
                </h2>
                <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#94A3B8]">
                  Time is of the essence in the ESAT. You have to finish each
                  question in less than 90 seconds, with no calculator.
                </p>
                <p className="mt-6 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                  {MENTAL_MATHS_MODULE_COUNT_MARKETING}+ modules,{" "}
                  {MENTAL_MATHS_TOPIC_COUNT_MARKETING}+ topics
                </p>
              </div>

              <ul className="space-y-4">
                {[
                  "Short timed drills that train speed and accuracy",
                  "Remove your reliance on calculators",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white"
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
                <h2 className="font-display text-4xl font-bold text-white lg:text-5xl">
                  Try our free tools
                </h2>
                <p className="mt-5 text-lg leading-relaxed text-[#94A3B8]">
                  Enter a raw mark from NSAA or ENGAA past papers, see your
                  calculated ESAT score, and where you lie on the official
                  distribution.
                </p>
              </div>

              <ul className="space-y-5">
                <li className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white"
                  />
                  <p className="text-lg text-[#94A3B8]">
                    Pick an exam and year, then calculate your ESAT score.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white"
                  />
                  <p className="text-lg text-[#94A3B8]">
                    Free tool, no login required.
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

      <HomepageReviews />

      {/* Pricing Section */}
      <section id="pricing" className="scroll-mt-28 bg-[#161D2F]/50 py-24">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-5 lg:px-6">
          <div className="mx-auto mb-16 max-w-2xl text-center sm:mb-20">
            <h2 className="font-display text-4xl font-bold text-white">
              Invest in your future
            </h2>
            <p className="mt-4 text-[#94A3B8]">
              Same full access on every paid plan. Pick the billing that fits
              your prep timeline.
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl items-stretch gap-5 md:grid-cols-3">
            {/* Free */}
            <div className="relative z-[1] flex flex-col rounded-2xl bg-[#0A0F1D]/70 p-7 xl:p-8">
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
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white"
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

            {/* Monthly */}
            <div className="relative z-20 flex flex-col rounded-2xl bg-[#3B82F6] p-8 sm:p-9 xl:p-10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-3.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#3B82F6]">
                Most popular · {monthlyDiscountLabel}
              </div>
              <h4 className="text-xl font-bold text-white">Monthly</h4>
              <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-2xl font-display font-bold text-white/55 line-through">
                  {monthlyListPriceLabel}
                </span>
                <span className="text-5xl font-display font-bold text-white">
                  {monthlyPriceLabel}
                </span>
                <span className="text-sm text-white/75">/month</span>
              </div>
              <p className="mt-2 text-sm font-medium text-white/80">
                {monthlyPerWeekLabel}/week · 2-day free trial
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
            <div className="relative z-[1] flex flex-col rounded-2xl bg-[#0A0F1D]/70 p-7 xl:p-8">
              <h4 className="text-lg font-bold text-white">Exam Season Pass</h4>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-display font-bold text-white">
                  £{seasonPrice}
                </span>
                <span className="text-sm text-[#94A3B8]">once</span>
              </div>
              <p className="mt-2 text-sm text-[#94A3B8]">
                One-time · access until {SEASON_PASS_ACCESS_UNTIL_LABEL}
              </p>
              <ul className="mt-8 flex-1 space-y-3 text-sm text-[#94A3B8]">
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
