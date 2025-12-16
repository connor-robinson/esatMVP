/**
 * Badge component for displaying stats and labels
 */

import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "error" | "warning" | "primary";
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center px-3 py-1 text-xs font-medium rounded-organic-sm transition-all duration-fast ease-signature";
    
    const variants = {
      default: "bg-white/10 text-neutral-400 border border-white/10",
      success: "bg-primary/20 text-primary ring-1 ring-primary/30",
      error: "bg-error/20 text-error ring-1 ring-error/30",
      warning: "bg-warning/20 text-warning ring-1 ring-warning/30",
      primary: "bg-primary/20 text-primary ring-1 ring-primary/30",
    };
    
    return (
      <span
        ref={ref}
        className={cn(baseStyles, variants[variant], className)}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

