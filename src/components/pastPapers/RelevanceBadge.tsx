import { cn } from "@/lib/utils";
import type { RelevanceLevel } from "@/content/pastPapers";
import type { QuestionRelevanceStatus } from "@/content/pastPaperQuestionMap";

type Relevance = RelevanceLevel | QuestionRelevanceStatus;

const LABELS: Record<Relevance, string> = {
  high: "Closest to ESAT",
  medium: "Partly relevant",
  low: "Supplementary",
  use: "Use this one",
  skip: "Skip",
  duplicate: "Duplicate",
  supplementary: "Supplementary",
  unverified: "Not checked",
};

const TONES: Record<Relevance, string> = {
  high: "bg-[#22C55E]/15 text-[#86EFAC]",
  medium: "bg-[#3B82F6]/15 text-[#93C5FD]",
  low: "bg-white/[0.08] text-[#CBD5E1]",
  use: "bg-[#22C55E]/15 text-[#86EFAC]",
  skip: "bg-[#EF4444]/15 text-[#FCA5A5]",
  duplicate: "bg-[#EAB308]/15 text-[#FDE68A]",
  supplementary: "bg-[#3B82F6]/15 text-[#93C5FD]",
  unverified: "bg-white/[0.08] text-[#CBD5E1]",
};

/** How useful a paper or question is for ESAT preparation. */
export function RelevanceBadge({
  relevance,
  className,
}: {
  relevance: Relevance;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold",
        TONES[relevance],
        className,
      )}
    >
      {LABELS[relevance]}
    </span>
  );
}
