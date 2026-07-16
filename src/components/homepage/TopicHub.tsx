"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
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
    chevron: string;
  }
> = {
  primary: {
    panel: "bg-primary/12",
    title: "text-primary",
    link: "text-text/80",
    linkHover: "hover:bg-primary/20 hover:text-text",
    chevron: "text-primary/70",
  },
  accent: {
    panel: "bg-accent/12",
    title: "text-accent",
    link: "text-text/80",
    linkHover: "hover:bg-accent/20 hover:text-text",
    chevron: "text-accent/70",
  },
  secondary: {
    panel: "bg-secondary/12",
    title: "text-secondary",
    link: "text-text/80",
    linkHover: "hover:bg-secondary/20 hover:text-text",
    chevron: "text-secondary/70",
  },
  warning: {
    panel: "bg-warning/12",
    title: "text-warning",
    link: "text-text/80",
    linkHover: "hover:bg-warning/20 hover:text-text",
    chevron: "text-warning/70",
  },
};

interface TopicHubProps {
  topics: DashboardTopic[];
  analyticsProps: HomepageAnalyticsProperties;
  className?: string;
}

export function TopicHub({ topics, analyticsProps, className }: TopicHubProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(topics.map((topic) => [topic.id, true])),
  );

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5",
        className,
      )}
    >
      {topics.map((topic) => {
        const styles = ACCENT_STYLES[topic.accent];
        const isOpen = expanded[topic.id] ?? true;
        const panelId = `topic-hub-${topic.id}`;

        return (
          <section
            key={topic.id}
            className={cn(
              "flex flex-col rounded-organic-xl p-5 sm:p-6",
              styles.panel,
            )}
          >
            <button
              type="button"
              onClick={() => toggle(topic.id)}
              aria-expanded={isOpen}
              aria-controls={panelId}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <h2
                className={cn(
                  "text-xl font-bold tracking-tight sm:text-2xl",
                  styles.title,
                )}
              >
                {topic.title}
              </h2>
              <ChevronDown
                aria-hidden
                className={cn(
                  "h-5 w-5 shrink-0 transition-transform duration-fast ease-signature",
                  styles.chevron,
                  isOpen ? "rotate-0" : "-rotate-90",
                )}
              />
            </button>

            <div
              id={panelId}
              hidden={!isOpen}
              className={cn(isOpen ? "mt-4" : undefined)}
            >
              <nav className="flex flex-col gap-1.5" aria-label={topic.title}>
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
            </div>
          </section>
        );
      })}
    </div>
  );
}
