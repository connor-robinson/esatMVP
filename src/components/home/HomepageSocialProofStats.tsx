import { CircleUser, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HomepageSocialProofStats } from "@/lib/homepage/socialProofTypes";

type StatItem = {
  value: number;
  label: string;
  icon: typeof CircleUser | null;
};

export function HomepageSocialProofStatsDisplay({
  stats,
}: {
  stats: HomepageSocialProofStats;
}) {
  const items: StatItem[] = [
    ...(stats.uniqueVisitors != null
      ? [
          {
            value: stats.uniqueVisitors,
            label: "Unique visitors",
            icon: null,
          },
        ]
      : []),
    {
      value: stats.users,
      label: "Users",
      icon: CircleUser,
    },
    {
      value: stats.questionsAnswered,
      label: "Questions done",
      icon: ListChecks,
    },
  ];

  return (
    <dl
      className={cn(
        "grid shrink-0 gap-x-5 gap-y-4 sm:gap-x-7 lg:gap-x-8",
        stats.uniqueVisitors != null ? "grid-cols-3" : "grid-cols-2",
      )}
    >
      {items.map((stat) => {
        const StatIcon = stat.icon;
        return (
          <div
            key={stat.label}
            className={cn(
              "min-w-0",
              StatIcon && "flex items-center gap-2.5 sm:gap-3",
            )}
          >
            {StatIcon ? (
              <StatIcon
                aria-hidden
                className="h-7 w-7 shrink-0 text-white sm:h-8 sm:w-8"
                strokeWidth={1.75}
                fill="none"
              />
            ) : null}
            <div className="min-w-0">
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
