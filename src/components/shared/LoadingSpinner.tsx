"use client";

import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  const borderClasses = {
    sm: "border-[3px]",
    md: "border-4",
    lg: "border-[5px]",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center",
        sizeClasses[size],
        className
      )}
    >
      {/* Simple thick round spinner */}
      <div
        className={cn(
          "rounded-full border-transparent border-t-primary animate-spin",
          borderClasses[size]
        )}
        style={{
          animation: "spin 0.8s linear infinite",
        }}
      />
    </div>
  );
}

