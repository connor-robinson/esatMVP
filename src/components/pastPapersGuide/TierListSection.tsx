"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/ga/trackEvent";
import {
  TIER_LIST,
  type TierExam,
  type TierId,
  type TierItem,
} from "@/content/pastPapersGuide";

const TIER_LABEL: Record<TierId, string> = {
  S: "#D99292",
  A: "#D9B592",
  B: "#D9D992",
  C: "#92D992",
};

const EXAM_FILL: Record<TierExam, string> = {
  NSAA: "var(--color-accent)",
  ENGAA: "var(--color-advanced)",
  TMUA: "var(--color-tmua-accent)",
  ESAT: "var(--color-maths)",
  OTHERS: "var(--color-primary)",
};

const TIP_WIDTH = 320;
const TIP_GAP = 10;

function TierTooltip({
  item,
  anchor,
}: {
  item: TierItem;
  anchor: DOMRect;
}) {
  const tipRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({
    position: "fixed",
    left: anchor.left + anchor.width / 2,
    top: anchor.bottom + TIP_GAP,
    width: TIP_WIDTH,
    transform: "translateX(-50%)",
    zIndex: 80,
  });
  const [placeAbove, setPlaceAbove] = useState(false);

  useLayoutEffect(() => {
    const tip = tipRef.current;
    if (!tip) return;

    const tipHeight = tip.offsetHeight;
    const viewportPad = 12;
    const spaceBelow = window.innerHeight - anchor.bottom;
    const spaceAbove = anchor.top;
    const above =
      spaceBelow < tipHeight + TIP_GAP + viewportPad &&
      spaceAbove > spaceBelow;

    let left = anchor.left + anchor.width / 2;
    const half = TIP_WIDTH / 2;
    left = Math.min(
      Math.max(left, half + viewportPad),
      window.innerWidth - half - viewportPad,
    );

    setPlaceAbove(above);
    setStyle({
      position: "fixed",
      left,
      top: above
        ? anchor.top - TIP_GAP - tipHeight
        : anchor.bottom + TIP_GAP,
      width: TIP_WIDTH,
      transform: "translateX(-50%)",
      zIndex: 80,
    });
  }, [anchor]);

  return createPortal(
    <div
      ref={tipRef}
      id={`${item.id}-tip`}
      role="tooltip"
      style={style}
      className="pointer-events-none relative rounded-xl bg-[#161D2F] px-4 py-3.5 text-left shadow-2xl shadow-black/50"
    >
      {item.note ? (
        <p className="text-sm font-bold uppercase tracking-wide text-white">
          {item.note}
        </p>
      ) : null}
      {item.related?.length ? (
        <ul className="mt-2 space-y-1.5">
          {item.related.map((name) => (
            <li
              key={name}
              className="font-mono text-sm font-semibold text-white"
            >
              {name}
            </li>
          ))}
        </ul>
      ) : null}
      <p
        className={cn(
          "text-[15px] leading-relaxed text-[#CBD5E1]",
          (item.note || item.related?.length) && "mt-2",
        )}
      >
        {item.description}
      </p>
      <span
        aria-hidden
        className={cn(
          "absolute left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-[#161D2F]",
          placeAbove ? "-bottom-1.5" : "-top-1.5",
        )}
      />
    </div>,
    document.body,
  );
}

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
  const isOthers = item.exam === "OTHERS";
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);

  const updateAnchor = () => {
    const el = buttonRef.current;
    if (el) setAnchor(el.getBoundingClientRect());
  };

  useLayoutEffect(() => {
    if (!active) {
      setAnchor(null);
      return;
    }
    updateAnchor();
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const onScrollOrResize = () => updateAnchor();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [active]);

  return (
    <div
      className="relative shrink-0"
      onMouseEnter={onActivate}
      onMouseLeave={onDeactivate}
      onFocus={onActivate}
      onBlur={onDeactivate}
    >
      <button
        ref={buttonRef}
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
          "flex h-[7.25rem] w-[7.25rem] flex-col items-center justify-center rounded-md px-2 text-center text-white shadow-[0_4px_12px_rgba(0,0,0,0.45)] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:h-[8rem] sm:w-[8rem] sm:px-2.5",
          active && "scale-[1.04]",
          item.muted && "opacity-85",
        )}
        style={{ backgroundColor: fill }}
      >
        <span className="text-[10px] font-medium leading-none text-white/85 sm:text-[11px]">
          {item.years}
        </span>
        <span
          className={cn(
            "mt-1.5 font-black leading-none tracking-wide",
            isOthers ? "text-base sm:text-lg" : "text-lg sm:text-xl",
          )}
        >
          {item.exam}
        </span>
        <span className="mt-1.5 w-full text-[11px] font-semibold leading-snug text-white/95 sm:text-xs">
          {item.section}
        </span>
      </button>

      {active && anchor ? <TierTooltip item={item} anchor={anchor} /> : null}
    </div>
  );
}

export function TierListSection() {
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-[#94A3B8]">
        Hover a paper for commentary.
      </p>

      <div className="space-y-2.5">
        {TIER_LIST.map((group) => (
          <div
            key={group.tier}
            className="grid h-[8rem] grid-cols-[3.75rem_minmax(0,1fr)] sm:h-[8.75rem] sm:grid-cols-[4.25rem_minmax(0,1fr)]"
          >
            <div
              className="flex h-full w-full items-center justify-center"
              style={{ backgroundColor: TIER_LABEL[group.tier] }}
              title={group.title}
            >
              <span className="font-sans text-3xl font-black leading-none text-black sm:text-4xl">
                {group.tier}
              </span>
            </div>

            <div className="flex h-full items-center gap-3 overflow-x-auto bg-[#1A1A1A] px-3.5 sm:gap-3.5 sm:px-5">
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
