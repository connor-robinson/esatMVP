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
    const baseStyles = "w-full px-4 py-3 bg-white/5 text-text rounded-xl transition-all duration-fast ease-signature outline-none backdrop-blur-sm placeholder:text-text-subtle";
    const stateStyles = error
      ? "ring-1 ring-error focus:ring-2 focus:ring-error"
      : "ring-0 focus:ring-1 focus:ring-primary/50";
    
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


