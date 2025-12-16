/**
 * Base Icon component with signature 2-shade + 1-accent color system
 */

import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface IconProps extends HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "accent" | "muted";
}

const sizeMap = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-10 h-10",
} as const;

export const Icon = forwardRef<HTMLDivElement, IconProps>(
  ({ className, size = "md", variant = "default", children, ...props }, ref) => {
    const variantClass =
      {
        default:
          "[&_path.base]:fill-icon-base [&_path.shadow]:fill-icon-shadow [&_path.accent]:fill-icon-accent",
        accent:
          "[&_path.base]:fill-primary [&_path.shadow]:fill-primary/40 [&_path.accent]:fill-primary-light",
        muted:
          "[&_path.base]:fill-neutral-400 [&_path.shadow]:fill-neutral-600 [&_path.accent]:fill-neutral-300",
      }[variant] || "";

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center transition-all duration-fast ease-signature",
          sizeMap[size],
          variantClass,
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Icon.displayName = "Icon";



