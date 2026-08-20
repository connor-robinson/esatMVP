"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/ga/trackEvent";
import {
  TIER_LIST,
  type TierExam,
  type TierId,
  type TierItem,
} from "@/content/pastPapersGuide";

const TIER_LABEL: Record<TierId, string> = {
  S: "#FF7F7F",
  A: "#FFBF7F",
  B: "#FFFF7F",
  C: "#7FFF7F",
};

const EXAM_FILL: Record<TierExam, string> = {
  NSAA: "#8FA88A",
  ENGAA: "#C9A227",
  TMUA: "#9B8AA8",
  ESAT: "#8B2942",
};

function TierCard({
  item,
  active,
  onActivate,
  onDeactivate,
}: {
  item: TierItem;
  active: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
}) {
  const fill = item.muted ? "#2A2F3A" : EXAM_FILL[item.exam];

  return (
    <div
      className="relative"
      onMouseEnter={onActivate}
      onMouseLeave={onDeactivate}
      onFocus={onActivate}
      onBlur={onDeactivate}
    >
      <button
        type="button"
        aria-describedby={active ? `${item.id}-tip` : undefined}
        onClick={() => {
          if (active) onDeactivate();
          else onActivate();
          trackEvent("tier_item_opened", {
            item: item.id,
            surface: "past_papers_guide",
          });
        }}
        className={cn(
          "flex min-h-[5.5rem] w-[7.75rem] flex-col items-center justify-center rounded-md px-2 py-2.5 text-center text-white transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:min-h-[6.25rem] sm:w-[8.75rem]",
          active && "scale-[1.03]",
          item.muted && "opacity-80",
        )}
        style={{ backgroundColor: fill }}
      >
        <span className="text-[10px] font-medium leading-none text-white/85 sm:text-[11px]">
          {item.years}
        </span>
        <span className="mt-1.5 text-lg font-black leading-none tracking-wide sm:text-xl">
          {item.exam}
        </span>
        <span className="mt-1.5 text-[11px] font-semibold leading-tight text-white/90 sm:text-xs">
          {item.section}
        </span>
      </button>

      {active ? (
        <div
          id={`${item.id}-tip`}
          role="tooltip"
          className="absolute left-1/2 top-[calc(100%+0.55rem)] z-20 w-56 -translate-x-1/2 rounded-xl bg-[#161D2F] px-3 py-2.5 text-left shadow-xl"
        >
          {item.note ? (
            <p className="text-xs font-bold uppercase tracking-wide text-white">
              {item.note}
            </p>
          ) : null}
          <p
            className={cn(
              "text-xs leading-relaxed text-[#CBD5E1]",
              item.note && "mt-1",
            )}
          >
            {item.description}
          </p>
          <span
            aria-hidden
            className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-[#161D2F]"
          />
        </div>
      ) : null}
    </div>
  );
}

export function TierListSection() {
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-[#94A3B8]">
        Hover a paper for commentary. Tier = reusable practice value, not what
        to open first.
      </p>

      <div className="bg-[#121212]">
        {TIER_LIST.map((group, index) => (
          <div
            key={group.tier}
            className={cn(
              "grid grid-cols-[4.25rem_minmax(0,1fr)] sm:grid-cols-[5rem_minmax(0,1fr)]",
              index < TIER_LIST.length - 1 && "border-b border-black",
            )}
          >
            <div
              className="flex aspect-square items-center justify-center border-r border-black"
              style={{ backgroundColor: TIER_LABEL[group.tier] }}
              title={group.title}
            >
              <span className="font-sans text-3xl font-black leading-none text-black sm:text-4xl">
                {group.tier}
              </span>
            </div>

            <div className="flex min-h-[5.5rem] flex-wrap items-center gap-2.5 bg-[#1A1A1A] px-3 py-3 sm:min-h-[6.5rem] sm:gap-3 sm:px-4">
              {group.items.map((item) => (
                <TierCard
                  key={item.id}
                  item={item}
                  active={activeId === item.id}
                  onActivate={() => setActiveId(item.id)}
                  onDeactivate={() =>
                    setActiveId((current) =>
                      current === item.id ? null : current,
                    )
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
