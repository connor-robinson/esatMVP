"use client";

import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Check, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PricingTier {
  id: string;
  name: string;
  price: string;
  /** Inline next to price (e.g. “per week”, “£6.25/week”) */
  caption?: string;
  /** Muted note under price block */
  priceNote?: string;
  features: string[];
  ctaLabel: string;
  /** Crown / “Best value” badge on card */
  featured?: boolean;
  /** Primary green card — recommended plan (monthly) */
  highlighted?: boolean;
}

interface PricingTableProps {
  tiers: PricingTier[];
  onSelect: (id: string) => void;
  className?: string;
  footer?: ReactNode;
}

const CARD_SHELL =
  "relative flex h-full flex-col rounded-organic-xl p-6 shadow-[0_12px_40px_-24px_rgba(0,0,0,0.55)] sm:p-7";

export function PricingTable({
  tiers,
  onSelect,
  className,
  footer,
}: PricingTableProps) {
  const defaultActiveId =
    tiers.find((tier) => tier.highlighted)?.id ?? null;
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const activeId = hoveredId ?? defaultActiveId;

  return (
    <div className={cn("space-y-6", className)}>
      <div
        className="mx-auto grid max-w-7xl items-stretch gap-5 py-10 sm:grid-cols-2 xl:grid-cols-4 xl:gap-8"
        onMouseLeave={() => setHoveredId(null)}
      >
        {tiers.map((tier) => {
          const isFree = tier.id === "free";
          const isLoading = tier.ctaLabel.startsWith("Loading");
          const isCurrentPlan = tier.ctaLabel === "Current plan";
          const isActive = activeId === tier.id;
          const showPrimaryCta = !isFree && !isCurrentPlan && !isLoading;

          return (
            <div
              key={tier.id}
              onMouseEnter={() => setHoveredId(tier.id)}
              className={cn(
                CARD_SHELL,
                "origin-center transition-[transform,background-color,box-shadow,color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
                isActive
                  ? "z-10 scale-[1.13] bg-primary text-black shadow-[0_24px_60px_-16px_rgba(0,0,0,0.55)]"
                  : "z-0 scale-100 bg-surface-elevated",
              )}
            >
              {tier.featured ? (
                <div className="absolute right-4 top-0 z-20 -translate-y-1/2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] shadow-[0_8px_20px_-10px_rgba(0,0,0,0.55)] transition-colors duration-300",
                      isActive
                        ? "bg-black text-white"
                        : "bg-primary text-black",
                    )}
                  >
                    <Crown
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        isActive ? "text-primary" : "text-black",
                      )}
                      strokeWidth={2.25}
                      aria-hidden
                    />
                    Best value
                  </span>
                </div>
              ) : null}

              <div className="mb-5 space-y-2">
                <h3
                  className={cn(
                    "text-lg font-semibold tracking-tight transition-colors duration-300",
                    isActive ? "text-black" : "text-text",
                  )}
                >
                  {tier.name}
                </h3>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span
                    className={cn(
                      "text-2xl font-bold tracking-tight transition-colors duration-300 sm:text-3xl",
                      isActive ? "text-black" : "text-text",
                    )}
                  >
                    {tier.price}
                  </span>
                  {tier.caption ? (
                    <span
                      className={cn(
                        "text-sm transition-colors duration-300",
                        isActive ? "text-black/75" : "text-text-muted",
                      )}
                    >
                      {tier.caption}
                    </span>
                  ) : null}
                </div>
                {tier.priceNote ? (
                  <p
                    className={cn(
                      "text-xs leading-snug transition-colors duration-300",
                      isActive ? "text-black/70" : "text-text-subtle",
                    )}
                  >
                    {tier.priceNote}
                  </p>
                ) : null}
              </div>

              <ul
                className={cn(
                  "mb-6 flex-1 space-y-3 text-sm transition-colors duration-300",
                  isActive ? "text-black/85" : "text-text-muted",
                )}
              >
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <Check
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0 transition-colors duration-300",
                        isActive ? "text-black" : "text-primary",
                      )}
                      strokeWidth={2.5}
                      aria-hidden
                    />
                    <span className="leading-snug">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant="secondary"
                size="md"
                disabled={isCurrentPlan || isLoading}
                className={cn(
                  "w-full rounded-organic-lg border-0 font-semibold transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                  showPrimaryCta && "hover:scale-[1.06] active:scale-[1.02]",
                  isActive &&
                    showPrimaryCta &&
                    "!bg-black !text-white hover:!bg-black/90 hover:!text-white hover:shadow-none",
                  isActive &&
                    !showPrimaryCta &&
                    "bg-black/15 text-black hover:bg-black/20",
                  !isActive &&
                    showPrimaryCta &&
                    "bg-surface-mid text-text shadow-sm hover:bg-surface-neutral hover:text-text",
                  !isActive &&
                    !showPrimaryCta &&
                    "bg-surface-mid text-text-muted hover:bg-surface-neutral hover:text-text",
                )}
                onClick={() => onSelect(tier.id)}
              >
                {tier.ctaLabel}
              </Button>
            </div>
          );
        })}
      </div>
      {footer}
    </div>
  );
}
