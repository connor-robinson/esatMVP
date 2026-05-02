/**
 * Input component with number support
 */

import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, type = "text", ...props }, ref) => {
    const baseStyles =
      "w-full px-4 py-3 bg-surface text-text rounded-organic-md transition-all duration-fast ease-signature outline-none backdrop-blur-sm border border-border-subtle placeholder:text-text-subtle";
    const stateStyles = error
      ? "border-error/70 focus-visible:border-error focus-visible:ring-1 focus-visible:ring-error/60"
      : "focus-visible:border-primary/70 focus-visible:ring-1 focus-visible:ring-primary/40";
    
    return (
      <input
        ref={ref}
        type={type}
        className={cn(baseStyles, stateStyles, className)}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";


