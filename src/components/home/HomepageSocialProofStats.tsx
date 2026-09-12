import { CircleUser, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HomepageSocialProofStats } from "@/lib/homepage/socialProofTypes";
import { applyHomepageSocialProofDisplayOffsets } from "@/config/homepageSocialProofDisplay";

type StatItem = {
  value: number;
  label: string;
  icon: typeof CircleUser;
};

export function HomepageSocialProofStatsDisplay({
  stats,
  className,
}: {
  stats: HomepageSocialProofStats;
  className?: string;
}) {
  const display = applyHomepageSocialProofDisplayOffsets(stats);
  const items: StatItem[] = [
    {
      value: display.users,
      label: "Users",
      icon: CircleUser,
    },
    {
      value: display.questionsAnswered,
      label: "Questions done",
      icon: ListChecks,
    },
  ];

  return (
    <dl
      className={cn(
        "inline-grid grid-cols-2 gap-x-8 gap-y-4 sm:gap-x-12",
        className,
      )}
    >
      {items.map((stat) => {
        const StatIcon = stat.icon;
        return (
          <div key={stat.label} className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <StatIcon
              aria-hidden
              className="h-6 w-6 shrink-0 text-white sm:h-7 sm:w-7"
              strokeWidth={1.75}
              fill="none"
            />
            <div className="min-w-0 text-left">
              <dt className="sr-only">{stat.label}</dt>
              <dd className="font-display text-xl font-bold tabular-nums text-white sm:text-2xl">
                {stat.value.toLocaleString()}
              </dd>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#94A3B8] sm:text-xs">
                {stat.label}
              </p>
            </div>
          </div>
        );
      })}
    </dl>
  );
}
