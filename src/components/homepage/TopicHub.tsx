"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { DashboardTopic, DashboardTopicAccent } from "@/lib/homepage/types";
import {
  mapSectionEvent,
  trackHomepageEvent,
} from "@/lib/homepage/analytics";
import type { HomepageAnalyticsProperties } from "@/lib/homepage/analytics";

const ACCENT_STYLES: Record<
  DashboardTopicAccent,
  {
    panel: string;
    title: string;
    link: string;
    linkHover: string;
  }
> = {
  primary: {
    panel: "bg-primary/12",
    title: "text-primary",
    link: "text-text/80",
    linkHover: "hover:bg-primary/20 hover:text-text",
  },
  accent: {
    panel: "bg-accent/12",
    title: "text-accent",
    link: "text-text/80",
    linkHover: "hover:bg-accent/20 hover:text-text",
  },
  secondary: {
    panel: "bg-secondary/12",
    title: "text-secondary",
    link: "text-text/80",
    linkHover: "hover:bg-secondary/20 hover:text-text",
  },
  warning: {
    panel: "bg-warning/12",
    title: "text-warning",
    link: "text-text/80",
    linkHover: "hover:bg-warning/20 hover:text-text",
  },
};

interface TopicHubProps {
  topics: DashboardTopic[];
  analyticsProps: HomepageAnalyticsProperties;
  className?: string;
}

export function TopicHub({ topics, analyticsProps, className }: TopicHubProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5",
        className,
      )}
    >
      {topics.map((topic) => {
        const styles = ACCENT_STYLES[topic.accent];
        return (
          <section
            key={topic.id}
            className={cn(
              "flex flex-col rounded-organic-xl p-6 sm:p-7",
              styles.panel,
            )}
          >
            <h2
              className={cn(
                "text-xl font-bold tracking-tight sm:text-2xl",
                styles.title,
              )}
            >
              {topic.title}
            </h2>

            <nav className="mt-5 flex flex-1 flex-col gap-1.5" aria-label={topic.title}>
              {topic.items.map((item) => (
                <Link
                  key={item.href}
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
                  className={cn(
                    "rounded-organic-md px-3 py-3 text-base font-medium transition-colors duration-fast ease-signature",
                    styles.link,
                    styles.linkHover,
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </section>
        );
      })}
    </div>
  );
}
