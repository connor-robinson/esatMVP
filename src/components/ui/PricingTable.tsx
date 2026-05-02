import { ReactNode } from "react";
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
  /** Crown / “Best value” pill above card */
  featured?: boolean;
}

interface PricingTableProps {
  tiers: PricingTier[];
  onSelect: (id: string) => void;
  className?: string;
  footer?: ReactNode;
}

const CARD_SHELL =
  "relative flex h-full flex-col rounded-organic-xl border border-border bg-surface-elevated p-6 ring-1 ring-white/[0.06] sm:p-7";

export function PricingTable({
  tiers,
  onSelect,
  className,
  footer,
}: PricingTableProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="mx-auto grid max-w-7xl gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {tiers.map((tier) => {
          const isFree = tier.id === "free";
          const isLoading = tier.ctaLabel.startsWith("Loading");
          const isCurrentPlan = tier.ctaLabel === "Current plan";
          const showPrimaryCta =
            !isFree && !isCurrentPlan && !isLoading;

          return (
            <div
              key={tier.id}
              className={cn(
                CARD_SHELL,
                tier.featured && "border-primary/20 pt-10 ring-primary/15",
              )}
            >
              {tier.featured ? (
                <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-background shadow-glow">
                    <Crown className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Best value
                  </span>
                </div>
              ) : null}

              <div className="mb-5 space-y-2">
                <h3 className="text-lg font-semibold tracking-tight text-text">
                  {tier.name}
                </h3>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
                    {tier.price}
                  </span>
                  {tier.caption ? (
                    <span className="text-sm text-text-muted">{tier.caption}</span>
                  ) : null}
                </div>
                {tier.priceNote ? (
                  <p className="text-xs leading-snug text-text-subtle">
                    {tier.priceNote}
                  </p>
                ) : null}
              </div>

              <ul className="mb-6 flex-1 space-y-3 text-sm text-text-muted">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                      strokeWidth={2.5}
                      aria-hidden
                    />
                    <span className="leading-snug">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={showPrimaryCta ? "wide" : "secondary"}
                size="md"
                disabled={isCurrentPlan || isLoading}
                className={cn(
                  "w-full rounded-organic-lg",
                  !showPrimaryCta &&
                    "border-border-subtle bg-surface-mid text-text-muted hover:bg-surface-neutral hover:text-text",
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
