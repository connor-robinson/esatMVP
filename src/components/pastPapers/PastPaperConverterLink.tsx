import Link from "next/link";
import { Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PastPaperResource } from "@/content/pastPapers";
import type { ConverterExam } from "@/lib/scoreConverter/esatModules";
import {
  buildConverterHref,
  converterCtaCopy,
  resolvePastPaperConverterCta,
  subjectToPartName,
  type ConverterLinkWording,
  type PastPaperConverterCta,
} from "@/lib/scoreConverter/pastPaperConverterLinks";

type PropsFromPaper = {
  paper: Pick<PastPaperResource, "exam" | "year" | "sectionName" | "paperName">;
  exam?: never;
  year?: never;
  section?: never;
  subject?: never;
};

type PropsFromParts = {
  paper?: never;
  exam: ConverterExam;
  year: number;
  /** Display section, e.g. "Section 1" or "Paper 1". */
  section: string;
  /** Optional subject label used to deep-link a scoring unit. */
  subject?: string;
  wording?: ConverterLinkWording;
};

export type PastPaperConverterLinkProps = (PropsFromPaper | PropsFromParts) & {
  className?: string;
  compact?: boolean;
};

function ctaFromParts(props: PropsFromParts): PastPaperConverterCta | null {
  const resolved = resolvePastPaperConverterCta({
    exam: props.exam,
    year: props.year,
    sectionName: props.section,
    paperName: `${props.exam} ${props.year}`,
  });
  if (!resolved) return null;

  const wording = props.wording ?? resolved.wording;
  const partName =
    props.subject != null
      ? subjectToPartName(props.exam, props.subject, props.section) ?? undefined
      : undefined;

  return {
    ...resolved,
    wording,
    href: buildConverterHref({
      exam: props.exam,
      year: props.year,
      paperName: props.section,
      partName,
    }),
    ariaLabel:
      wording === "published"
        ? `Convert your ${props.exam} ${props.year} ${props.section} raw mark to its published scaled score`
        : `Estimate your scaled score for ${props.exam} ${props.year} ${props.section}`,
  };
}

/**
 * Secondary CTA placed beside or under mark-scheme / answer-key actions.
 * Renders nothing when the paper cannot be converted reliably.
 */
export function PastPaperConverterLink(props: PastPaperConverterLinkProps) {
  const cta = props.paper
    ? resolvePastPaperConverterCta(props.paper)
    : ctaFromParts(props);

  if (!cta) return null;

  const copy = converterCtaCopy(cta.wording);

  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-xl bg-[#3B82F6]/[0.08] px-3 py-2 text-sm leading-snug text-[#94A3B8]",
        "transition-colors hover:bg-[#3B82F6]/[0.12]",
        props.compact && "px-2.5 py-1.5 text-xs",
        props.className,
      )}
    >
      <Calculator
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0 text-[#60A5FA]",
          props.compact && "h-3.5 w-3.5",
        )}
        aria-hidden
      />
      <span>
        {copy.prefix}
        <Link
          href={cta.href}
          aria-label={cta.ariaLabel}
          className="font-semibold text-[#93C5FD] underline decoration-[#93C5FD]/40 underline-offset-4 transition-colors hover:text-white hover:decoration-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220]"
        >
          {copy.linkText}
        </Link>
        {copy.suffix}
      </span>
    </p>
  );
}
