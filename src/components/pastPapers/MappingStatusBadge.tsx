import { cn } from "@/lib/utils";
import type { MappingStatus } from "@/content/pastPapers";

const LABELS: Record<MappingStatus, string> = {
  verified: "Checked against the PDF",
  likely: "Probable match",
  unverified: "Not mapped yet",
};

const TONES: Record<MappingStatus, string> = {
  verified: "bg-[#22C55E]/15 text-[#86EFAC]",
  likely: "bg-[#EAB308]/15 text-[#FDE68A]",
  unverified: "bg-white/[0.08] text-[#CBD5E1]",
};

/**
 * How far our own checking has gone. Kept deliberately visible so nothing on the
 * page reads as more authoritative than it is.
 */
export function MappingStatusBadge({
  status,
  className,
}: {
  status: MappingStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold",
        TONES[status],
        className,
      )}
    >
      {LABELS[status]}
    </span>
  );
}
