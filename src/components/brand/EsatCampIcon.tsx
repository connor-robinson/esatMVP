import { cn } from "@/lib/utils";

interface EsatCampIconProps {
  className?: string;
  /** Stroke width in viewBox units (default tuned for mark sizes). */
  strokeWidth?: number;
}

/**
 * Teepee mark — stroke icon, uses currentColor (white on dark UI by default).
 */
export function EsatCampIcon({
  className,
  strokeWidth = 5.5,
}: EsatCampIconProps) {
  return (
    <svg
      viewBox="0 0 100 112"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("block shrink-0", className)}
      aria-hidden
    >
      <path
        d="M8 96H92"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="square"
      />
      <path
        d="M8 96L50 14L92 96"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <path
        d="M50 14L38 2"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="square"
      />
      <path
        d="M50 14L62 2"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="square"
      />
      <path
        d="M38 96L50 72L62 96"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}
