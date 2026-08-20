"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "roadmap", label: "Your Roadmap" },
  { id: "nsaa", label: "NSAA Guide" },
  { id: "engaa", label: "ENGAA Guide" },
  { id: "overlaps", label: "Overlaps" },
  { id: "tmua", label: "TMUA Guide" },
  { id: "tier-list", label: "Tier list" },
  { id: "timing", label: "Timing" },
] as const;

export function StickySectionNav() {
  const [active, setActive] = useState<string>("roadmap");

  useEffect(() => {
    const ids = SECTIONS.map((section) => section.id);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActive(visible[0].target.id);
        }
      },
      { rootMargin: "-40% 0px -45% 0px", threshold: [0, 0.25, 0.5] },
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Page sections"
      className="sticky top-[var(--navbar-height,64px)] z-20 -mx-4 bg-[#0A0F1D]/95 px-4 py-2.5 backdrop-blur-sm sm:-mx-5 sm:px-5 lg:-mx-6 lg:px-6"
    >
      <div className="relative">
        <div className="Content flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]",
                active === section.id
                  ? "bg-white/10 text-white"
                  : "text-[#94A3B8] hover:text-white",
              )}
              aria-current={active === section.id ? "true" : undefined}
            >
              {section.label}
            </a>
          ))}
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#0A0F1D] to-transparent"
        />
      </div>
    </nav>
  );
}
