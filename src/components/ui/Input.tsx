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
    const baseStyles = "w-full px-4 py-3 bg-white/5 text-neutral-100 rounded-organic-md border border-white/10 transition-all duration-fast ease-signature outline-none backdrop-blur-sm placeholder:text-neutral-500";
    const stateStyles = error
      ? "border-error focus:shadow-[0_0_0_3px_rgba(239,68,68,0.3)]"
      : "focus:border-primary focus:shadow-glow-focus";
    
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


