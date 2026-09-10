"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ABOUT_PATH, FOUNDERS } from "@/config/founders";
import { QUESTION_BANK_TOTAL_COUNT } from "@/config/questionBankMarketing";
import { CALIBRATION_ROUTES } from "@/lib/calibration/constants";
import { cn } from "@/lib/utils";

const BANK = QUESTION_BANK_TOTAL_COUNT.toLocaleString();
const PAPERS_PER_DAY = "2.47";

type VariantId = "pace" | "stat" | "runout" | "plain" | "trust";

type VariantDef = {
  id: VariantId;
  label: string;
  note: string;
};

const VARIANTS: VariantDef[] = [
  {
    id: "pace",
    label: "A · Pace fear",
    note: "What we are + how hard people here work. Backup when papers run out.",
  },
  {
    id: "stat",
    label: "B · Big number",
    note: "Lead with 2.47. Clarity second. Question bank as the safety net.",
  },
  {
    id: "runout",
    label: "C · Run out",
    note: "Fear first (papers run out). Then what we sell.",
  },
  {
    id: "plain",
    label: "D · Plain offer",
    note: "Simplest: what we do, then one fear line. No extra framing.",
  },
  {
    id: "trust",
    label: "E · Fear + face",
    note: "Same clarity/fear core, light founder trust under the CTA.",
  },
];

function PrimaryCta({ children }: { children: React.ReactNode }) {
  return (
    <Link
      href={CALIBRATION_ROUTES.hub}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-7 py-3.5 text-base font-bold text-[#0A0F1D] transition-colors hover:bg-slate-100 sm:text-lg"
    >
      {children}
      <span aria-hidden className="text-lg leading-none">
        →
      </span>
    </Link>
  );
}

function SecondaryCta() {
  return (
    <Link
      href="/login?mode=signup"
      className="inline-flex items-center justify-center rounded-lg border border-white/20 px-6 py-3.5 text-base font-bold text-white transition-colors hover:bg-white/5"
    >
      Sign up
    </Link>
  );
}

function CtaRow({ note }: { note: string }) {
  return (
    <div className="space-y-2.5">
      <div className="flex flex-col gap-3 sm:flex-row">
        <PrimaryCta>Start free calibration</PrimaryCta>
        <SecondaryCta />
      </div>
      <p className="text-sm text-[#94A3B8]">{note}</p>
    </div>
  );
}

function HeroShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "border-b border-white/10 bg-[#0A0F1D] px-4 py-10 sm:px-6 sm:py-12 lg:px-8",
        className,
      )}
    >
      <div className="mx-auto max-w-3xl space-y-6">{children}</div>
    </section>
  );
}

function Accent({ children }: { children: React.ReactNode }) {
  return <span className="text-white">{children}</span>;
}

/** A: Clarify product, then pace fear, then bank as backup. */
function VariantPace() {
  return (
    <HeroShell>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#3B82F6]">
        ESAT practice
      </p>
      <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-[-0.03em] text-white sm:text-5xl">
        Past papers and practice questions for the ESAT
      </h1>
      <p className="max-w-2xl text-lg leading-relaxed text-[#94A3B8] sm:text-xl">
        On average, students here sit{" "}
        <Accent>{PAPERS_PER_DAY} past papers a day</Accent>. Run out of papers?
        Keep going with our <Accent>{BANK}+ practice questions</Accent>.
      </p>
      <CtaRow note="Free calibration. No sign-up required." />
    </HeroShell>
  );
}

/** B: Fear number as the hook. */
function VariantStat() {
  return (
    <HeroShell>
      <p className="font-display text-6xl font-bold tracking-[-0.04em] text-white sm:text-7xl">
        {PAPERS_PER_DAY}
      </p>
      <h1 className="font-display text-3xl font-bold leading-snug tracking-[-0.03em] text-white sm:text-4xl">
        past papers a day
      </h1>
      <p className="max-w-2xl text-lg leading-relaxed text-[#94A3B8] sm:text-xl">
        That is the average on ESAT Camp. When official papers run out, you still
        have <Accent>{BANK}+ exam-style questions</Accent> left to practise.
      </p>
      <CtaRow note="See where you stand in a few minutes. Free." />
    </HeroShell>
  );
}

/** C: Run-out fear first, then the product. */
function VariantRunout() {
  return (
    <HeroShell>
      <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-[-0.03em] text-white sm:text-5xl">
        Official past papers run out. The ESAT does not care.
      </h1>
      <p className="max-w-2xl text-lg leading-relaxed text-[#94A3B8] sm:text-xl">
        We give you the papers, then <Accent>{BANK}+ more questions</Accent> so
        you can keep practising. Students here already average{" "}
        <Accent>{PAPERS_PER_DAY} papers a day</Accent>.
      </p>
      <CtaRow note="Start with a free calibration." />
    </HeroShell>
  );
}

/** D: Absolute simplest stacking. */
function VariantPlain() {
  return (
    <HeroShell>
      <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-[-0.03em] text-white sm:text-5xl">
        ESAT past papers and {BANK}+ practice questions
      </h1>
      <p className="max-w-2xl text-lg leading-relaxed text-[#94A3B8] sm:text-xl">
        Students here do <Accent>{PAPERS_PER_DAY} past papers a day</Accent> on
        average. If you practise less, you fall behind.
      </p>
      <CtaRow note="Calibration is free. No account needed to start." />
    </HeroShell>
  );
}

/** E: Same core + light founder trust. */
function VariantTrust() {
  return (
    <HeroShell>
      <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-[-0.03em] text-white sm:text-5xl">
        Keep pace with serious ESAT prep
      </h1>
      <p className="max-w-2xl text-lg leading-relaxed text-[#94A3B8] sm:text-xl">
        Average student here: <Accent>{PAPERS_PER_DAY} past papers a day</Accent>.
        Run out? Use our <Accent>{BANK}+ practice questions</Accent>. We built
        the platform we wish we had.
      </p>
      <CtaRow note="Free calibration first. Sign up when you want more." />
      <div className="flex items-center gap-3 border-t border-white/10 pt-5">
        <Link
          href={`${ABOUT_PATH}#${FOUNDERS.ewan.id}`}
          className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#161D2F]"
        >
          <Image
            src={FOUNDERS.ewan.imageSrc}
            alt={FOUNDERS.ewan.imageAlt}
            fill
            sizes="48px"
            className="object-cover"
            style={{
              objectPosition: FOUNDERS.ewan.imagePosition,
              transform: `scale(${FOUNDERS.ewan.imageScale})`,
            }}
          />
        </Link>
        <p className="text-sm leading-snug text-[#94A3B8]">
          <Link
            href={`${ABOUT_PATH}#${FOUNDERS.ewan.id}`}
            className="font-semibold text-white hover:text-[#93C5FD]"
          >
            {FOUNDERS.ewan.name}
          </Link>
          , co-founder · {FOUNDERS.ewan.homepageCredential}
        </p>
      </div>
    </HeroShell>
  );
}

function renderVariant(id: VariantId) {
  switch (id) {
    case "pace":
      return <VariantPace />;
    case "stat":
      return <VariantStat />;
    case "runout":
      return <VariantRunout />;
    case "plain":
      return <VariantPlain />;
    case "trust":
      return <VariantTrust />;
  }
}

function isVariantId(value: string | null): value is VariantId {
  return VARIANTS.some((variant) => variant.id === value);
}

export function HomepageHeroVariantsLab() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = searchParams.get("v");
  const activeId = isVariantId(selected) ? selected : null;

  const visible = useMemo(() => {
    if (activeId) {
      return VARIANTS.filter((variant) => variant.id === activeId);
    }
    return VARIANTS;
  }, [activeId]);

  const setVariant = (id: VariantId | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set("v", id);
    } else {
      params.delete("v");
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <div className="min-h-screen bg-[#0A0F1D] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0A0F1D]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3B82F6]">
                Dev lab
              </p>
              <h1 className="text-sm font-bold text-white sm:text-base">
                Homepage hero variants
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setVariant(null)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                activeId
                  ? "bg-white/10 text-white hover:bg-white/15"
                  : "bg-white text-[#0A0F1D]",
              )}
            >
              Show all
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {VARIANTS.map((variant) => (
              <button
                key={variant.id}
                type="button"
                onClick={() => setVariant(variant.id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                  activeId === variant.id
                    ? "bg-white text-[#0A0F1D]"
                    : "bg-white/10 text-[#94A3B8] hover:bg-white/15 hover:text-white",
                )}
              >
                {variant.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
        <p className="max-w-2xl text-sm leading-relaxed text-[#94A3B8]">
          Goal: say what we do in one beat, add fear around practice volume, keep
          layout plain. Trust (face / reviews) is optional and only light in E.
          Open a single variant with{" "}
          <code className="text-[#93C5FD]">?v=pace</code>,{" "}
          <code className="text-[#93C5FD]">?v=stat</code>,{" "}
          <code className="text-[#93C5FD]">?v=runout</code>,{" "}
          <code className="text-[#93C5FD]">?v=plain</code>, or{" "}
          <code className="text-[#93C5FD]">?v=trust</code>.
        </p>
      </div>

      <div className="space-y-8 pb-16">
        {visible.map((variant) => (
          <div key={variant.id} id={variant.id}>
            <div className="mx-auto flex max-w-5xl flex-wrap items-baseline justify-between gap-2 px-4 pb-2 sm:px-6">
              <h2 className="text-sm font-bold text-white">{variant.label}</h2>
              <p className="text-sm text-[#94A3B8]">{variant.note}</p>
            </div>
            {renderVariant(variant.id)}
          </div>
        ))}
      </div>
    </div>
  );
}
