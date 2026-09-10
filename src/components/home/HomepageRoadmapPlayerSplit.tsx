import Link from "next/link";
import { cn } from "@/lib/utils";
import { PastPaperPlayerPreview } from "@/components/home/PastPaperPlayerPreview";

const ROADMAP_ITEMS = [
  { label: "Math 1 Mock 1", meta: "27 questions · 40 min", state: "done" as const },
  { label: "NSAA 2023 Section 1", meta: "Official paper", state: "current" as const },
  { label: "Full Mock 1 Math 1", meta: "Next up", state: "next" as const },
  { label: "ENGAA 2022 Section 1", meta: "Official paper", state: "locked" as const },
];

/**
 * Marketing still: roadmap list beside the UAT-UK-style player.
 */
export function HomepageRoadmapPlayerSplit({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid w-full gap-4 sm:gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-stretch",
        className,
      )}
    >
      <div className="flex flex-col rounded-xl bg-[#0A0F1D] p-4 sm:p-5">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <p className="text-base font-semibold text-white sm:text-lg">
            Your roadmap
          </p>
          <Link
            href="/past-papers/roadmap"
            className="text-sm font-medium text-[#94A3B8] transition-colors hover:text-white"
          >
            View all
          </Link>
        </div>
        <ul className="flex flex-1 flex-col gap-2.5">
          {ROADMAP_ITEMS.map((item) => (
            <li
              key={item.label}
              className={cn(
                "flex items-start gap-3 rounded-lg px-3 py-2.5",
                item.state === "current" ? "bg-[#161D2F]" : "bg-transparent",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                  item.state === "done" && "bg-[#34D399]",
                  item.state === "current" && "bg-[#3B82F6]",
                  item.state === "next" && "bg-[#64748B]",
                  item.state === "locked" && "bg-[#334155]",
                )}
              />
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-sm font-semibold leading-snug sm:text-[15px]",
                    item.state === "locked" ? "text-[#64748B]" : "text-white",
                  )}
                >
                  {item.label}
                </p>
                <p className="mt-0.5 text-xs text-[#64748B] sm:text-sm">
                  {item.meta}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex min-h-0 items-center justify-center overflow-hidden rounded-xl bg-[#0A0F1D]">
        <PastPaperPlayerPreview embedded className="w-full" />
      </div>
    </div>
  );
}
