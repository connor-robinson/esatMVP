/**
 * Button component with variants
 */

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded-organic-md font-medium transition-all duration-fast ease-signature focus:shadow-glow-focus disabled:opacity-50 disabled:cursor-not-allowed interaction-scale";

    const variants = {
      primary: "bg-primary text-white hover:bg-primary-hover hover:shadow-glow font-semibold dark:text-neutral-900",
      secondary: "bg-surface-subtle border border-border text-text hover:bg-surface hover:border-border-subtle",
      ghost: "text-text-muted hover:bg-surface-subtle hover:text-text",
      danger: "bg-error/90 text-white hover:bg-error hover:shadow-[0_0_12px_0_rgba(239,68,68,0.4)]",
    } as const;

    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-base",
      lg: "px-6 py-3 text-lg",
    } as const;

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";



