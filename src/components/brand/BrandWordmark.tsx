import { cn } from "@/lib/utils";

export type BrandWordmarkSize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASS: Record<BrandWordmarkSize, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl sm:text-2xl",
  xl: "text-2xl sm:text-3xl",
};

/** Geometric A without crossbar — matches ESAT CAMP wordmark design. */
function CrossbarlessA({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 24"
      className={cn(
        "inline-block h-[0.9em] w-[0.68em] translate-y-[0.06em]",
        className,
      )}
      aria-hidden
    >
      <path
        d="M1.5 23.5L10 1.5L18.5 23.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

interface BrandWordmarkProps {
  className?: string;
  size?: BrandWordmarkSize;
}

/** ESAT CAMP — live text with crossbarless A glyphs (not an image). */
export function BrandWordmark({ className, size = "md" }: BrandWordmarkProps) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline font-bold uppercase tracking-[0.06em] text-current",
        SIZE_CLASS[size],
        className,
      )}
      aria-label="ESAT CAMP"
    >
      <span aria-hidden className="inline-flex items-baseline">
        ES
        <CrossbarlessA />
        T
        <span className="inline-block w-[0.38em]" />
        C
        <CrossbarlessA />
        MP
      </span>
    </span>
  );
}
