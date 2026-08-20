"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/ga/trackEvent";
import { TIER_LIST, type TierItem } from "@/content/pastPapersGuide";
import { routeToPlainText, buildPaperRoute } from "@/lib/pastPapersGuide/recommendations";

const EXAM_COLORS = {
  NSAA: "#8FA88A",
  ENGAA: "#C9A227",
  TMUA: "#9B8AA8",
  ESAT: "#8B2942",
} as const;

function TierCard({
  item,
  open,
  onToggle,
}: {
  item: TierItem;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "min-h-11 w-full rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]",
        open ? "border-white/20 bg-white/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
      )}
      style={{ borderLeftColor: EXAM_COLORS[item.exam], borderLeftWidth: 4 }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-semibold text-white">{item.title}</p>
        {item.badge ? (
          <span className="rounded-full bg-[#3B82F6]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#93C5FD]">
            {item.badge}
          </span>
        ) : null}
      </div>
      {open ? (
        <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">
          {item.description}
        </p>
      ) : null}
    </button>
  );
}

export function TierListSection() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const personalisedText = useMemo(() => {
    const route = buildPaperRoute({
      modules: ["maths1", "maths2", "physics"],
      progress: "nothing",
    });
    const tiers = TIER_LIST.map(
      (group) => `${group.title}\n${group.items.map((item) => `- ${item.title}`).join("\n")}`,
    ).join("\n\n");
    return `ESAT CAMP personalised tier list\n\n${tiers}\n\nSuggested route:\n${routeToPlainText(route)}`;
  }, []);

  const onCopyTierList = async () => {
    try {
      await navigator.clipboard.writeText(personalisedText);
      setCopyStatus("Tier list copied");
    } catch {
      setCopyStatus("Could not copy");
    }
    window.setTimeout(() => setCopyStatus(null), 2500);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-[#94A3B8]">
        Tier = reusable practice value, not what to open first.
      </p>

      <div className="space-y-8">
        {TIER_LIST.map((group) => (
          <div key={group.tier}>
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 font-display text-2xl font-bold text-white">
                {group.tier}
              </span>
              <h3 className="font-display text-xl font-bold text-white">
                {group.title}
              </h3>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {group.items.map((item) => (
                <TierCard
                  key={item.id}
                  item={item}
                  open={openId === item.id}
                  onToggle={() => {
                    setOpenId((current) => (current === item.id ? null : item.id));
                    trackEvent("tier_item_opened", {
                      item: item.id,
                      surface: "past_papers_guide",
                    });
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onCopyTierList}
          className="min-h-11 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-[#0A0F1D] hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
        >
          Copy my tier list
        </button>
        <p role="status" className="text-sm text-[#94A3B8]">
          {copyStatus}
        </p>
      </div>
    </div>
  );
}
