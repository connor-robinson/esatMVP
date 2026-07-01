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
  /** Crown / “Best value” badge on card */
  featured?: boolean;
  /** Primary green CTA — recommended plan */
  highlighted?: boolean;
}

interface PricingTableProps {
  tiers: PricingTier[];
  onSelect: (id: string) => void;
  className?: string;
  footer?: ReactNode;
}

const CARD_SHELL =
  "relative flex h-full flex-col rounded-organic-xl bg-surface-elevated p-6 shadow-[0_12px_40px_-24px_rgba(0,0,0,0.55)] sm:p-7";

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
                tier.featured && "overflow-hidden",
                tier.highlighted &&
                  "ring-1 ring-primary/30 shadow-[0_16px_48px_-20px_rgba(0,0,0,0.65)]",
              )}
            >
              {tier.featured ? (
                <>
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent"
                    aria-hidden
                  />
                  <div className="absolute right-5 top-5">
                    <span className="inline-flex items-center gap-1.5 rounded-organic-md bg-surface-mid px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-text">
                      <Crown
                        className="h-3 w-3 shrink-0 text-primary"
                        strokeWidth={2.5}
                        aria-hidden
                      />
                      Best value
                    </span>
                  </div>
                </>
              ) : null}

              <div className={cn("mb-5 space-y-2", tier.featured && "pr-24")}>
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
                variant={
                  showPrimaryCta && tier.highlighted ? "wide" : "secondary"
                }
                size="md"
                disabled={isCurrentPlan || isLoading}
                className={cn(
                  "w-full rounded-organic-lg font-semibold",
                  showPrimaryCta &&
                    !tier.highlighted &&
                    "border-0 bg-surface-mid text-text shadow-sm hover:bg-surface-neutral hover:text-text",
                  !showPrimaryCta &&
                    "border-0 bg-surface-mid text-text-muted hover:bg-surface-neutral hover:text-text",
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
