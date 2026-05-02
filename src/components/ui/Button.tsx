/**
 * Button component with variants
 */

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "wide" | "mutedBar";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center gap-2 rounded-organic-md font-medium transition-all duration-fast ease-signature focus-visible:outline-none focus-visible:shadow-glow-focus disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
      primary: "bg-primary text-white hover:bg-primary-hover hover:shadow-glow font-semibold",
      secondary: "bg-surface-subtle border border-border text-text hover:bg-surface hover:border-border-subtle",
      ghost: "text-text-muted hover:bg-surface-subtle hover:text-text",
      danger: "bg-error/90 text-white hover:bg-error hover:shadow-[0_0_12px_0_rgba(239,68,68,0.4)]",
      /** Full-width pricing / Section 2 — aligns with Figma Bars CTA radius (16px). */
      wide:
        "w-full rounded-organic-lg bg-primary text-background hover:bg-primary-hover hover:shadow-glow font-semibold",
      /** Idle session bar CTA — surface n200, muted label (Figma `370:6425`). */
      mutedBar:
        "rounded-organic-lg bg-surface-elevated text-text/50 [&_svg]:opacity-30 hover:text-text/70",
    } as const;

    const sizes = {
      sm: "px-3 py-2 text-sm",
      md: "px-5 py-3 text-base",
      lg: "px-6 py-3.5 text-lg",
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



