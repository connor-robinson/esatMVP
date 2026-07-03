"use client";

import Link from "next/link";
import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Calculator,
  Clock,
  Layers,
  Library,
  Target,
  TrendingDown,
  Zap,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { FermiGuessrIcon } from "@/components/icons/FermiGuessrIcon";
import { cn } from "@/lib/utils";
import type { MainSectionGroup } from "@/lib/homepage/types";
import {
  mapSectionEvent,
  trackHomepageEvent,
} from "@/lib/homepage/analytics";
import type { HomepageAnalyticsProperties } from "@/lib/homepage/analytics";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap,
  Layers,
  Calculator,
  Target,
  BookOpen,
  Library,
  BarChart3,
  TrendingDown,
  Clock,
  FermiGuessr: FermiGuessrIcon,
  ArrowLeftRight,
};

interface MainSectionGridProps {
  sections: MainSectionGroup[];
  analyticsProps: HomepageAnalyticsProperties;
  className?: string;
}

export function MainSectionGrid({
  sections,
  analyticsProps,
  className,
}: MainSectionGridProps) {
  return (
    <div className={cn("space-y-8", className)}>
      {sections.map((group) => (
        <section key={group.title}>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
            {group.title}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((item) => {
              const Icon = ICON_MAP[item.icon] ?? Zap;
              return (
                <Link
                  key={`${group.title}-${item.label}`}
                  href={item.href}
                  onClick={() =>
                    void trackHomepageEvent(
                      mapSectionEvent(item.analyticsDestination),
                      {
                        ...analyticsProps,
                        destination: item.href,
                        section: item.analyticsDestination,
                      },
                    )
                  }
                  className="group block"
                >
                  <Card
                    variant="subtle"
                    className="flex h-full items-start gap-3 p-4 transition-colors group-hover:bg-surface"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-organic-md bg-surface-elevated text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-text">{item.label}</p>
                      <p className="mt-0.5 text-xs text-text-muted">
                        {item.description}
                      </p>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
