import { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface PricingTier {
  id: string;
  name: string;
  price: string;
  caption?: string;
  features: string[];
  ctaLabel: string;
  highlighted?: boolean;
}

interface PricingTableProps {
  tiers: PricingTier[];
  onSelect: (id: string) => void;
  className?: string;
  footer?: ReactNode;
}

export function PricingTable({ tiers, onSelect, className, footer }: PricingTableProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tiers.map((tier) => (
          <Card
            key={tier.id}
            variant={tier.highlighted ? "elevated" : "subtle"}
            className={cn("p-6", tier.highlighted && "ring-1 ring-primary/40")}
          >
            <div className="mb-4 space-y-1">
              <h3 className="text-lg font-semibold text-text">{tier.name}</h3>
              <p className="text-2xl font-bold text-text">{tier.price}</p>
              {tier.caption ? <p className="text-sm text-text-muted">{tier.caption}</p> : null}
            </div>

            <ul className="mb-5 space-y-2 text-sm text-text-muted">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              variant={tier.highlighted ? "primary" : "secondary"}
              size="md"
              className="w-full rounded-organic-lg"
              onClick={() => onSelect(tier.id)}
            >
              {tier.ctaLabel}
            </Button>
          </Card>
        ))}
      </div>
      {footer}
    </div>
  );
}
