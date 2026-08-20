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
      className="relative shrink-0"
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
          "flex size-[4.5rem] flex-col items-center justify-center rounded-md px-1.5 text-center text-white shadow-[0_4px_12px_rgba(0,0,0,0.45)] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:size-[5rem]",
          active && "scale-[1.04]",
          item.muted && "opacity-85",
        )}
        style={{ backgroundColor: fill }}
      >
        <span className="text-[9px] font-medium leading-none text-white/85 sm:text-[10px]">
          {item.years}
        </span>
        <span className="mt-1 text-base font-black leading-none tracking-wide sm:text-lg">
          {item.exam}
        </span>
        <span className="mt-1 max-w-full truncate text-[9px] font-semibold leading-tight text-white/90 sm:text-[10px]">
          {item.section}
        </span>
      </button>

      {active ? (
        <div
          id={`${item.id}-tip`}
          role="tooltip"
          className="absolute left-1/2 top-[calc(100%+0.5rem)] z-20 w-52 -translate-x-1/2 rounded-xl bg-[#161D2F] px-3 py-2.5 text-left shadow-xl"
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

      <div className="space-y-2">
        {TIER_LIST.map((group) => (
          <div
            key={group.tier}
            className="grid h-[5.25rem] grid-cols-[3.5rem_minmax(0,1fr)] overflow-visible sm:h-[5.75rem] sm:grid-cols-[4rem_minmax(0,1fr)]"
          >
            <div
              className="flex h-full w-full items-center justify-center"
              style={{ backgroundColor: TIER_LABEL[group.tier] }}
              title={group.title}
            >
              <span className="font-sans text-2xl font-black leading-none text-black sm:text-3xl">
                {group.tier}
              </span>
            </div>

            <div className="flex h-full items-center gap-2.5 overflow-x-auto bg-[#1A1A1A] px-3 sm:gap-3 sm:px-4">
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
