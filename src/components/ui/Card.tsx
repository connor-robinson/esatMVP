/**
 * Card component - rounded container
 */

import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "flat";
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    const variants = {
      default: "bg-surface rounded-organic-lg backdrop-blur-sm transition-all duration-fast ease-signature border border-border-subtle",
      elevated: "bg-surface border border-border rounded-organic-lg backdrop-blur-sm shadow-lg hover:shadow-glow",
      flat: "bg-surface-subtle rounded-organic-lg backdrop-blur-sm",
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


