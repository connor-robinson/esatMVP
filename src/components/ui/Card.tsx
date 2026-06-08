/**
 * Card component - rounded container
 */

import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "subtle" | "bordered" | "flat";
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    const variants = {
      default: "bg-surface rounded-organic-lg backdrop-blur-sm transition-all duration-fast ease-signature border border-border-subtle",
      elevated: "bg-surface-elevated border border-border rounded-organic-lg backdrop-blur-sm shadow-lg",
      subtle: "bg-surface-subtle rounded-organic-lg backdrop-blur-sm border border-border-subtle",
      bordered: "bg-transparent rounded-organic-lg border border-border",
      /** Session / library panels that bring their own background */
      flat: "rounded-organic-lg border-0 bg-transparent",
    };
    
    return (
      <div
        ref={ref}
        className={cn(variants[variant], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";


