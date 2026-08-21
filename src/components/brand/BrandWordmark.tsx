import { cn } from "@/lib/utils";

export type BrandWordmarkSize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASS: Record<BrandWordmarkSize, string> = {
  sm: "text-sm tracking-[0.12em]",
  md: "text-base tracking-[0.1em]",
  lg: "text-xl sm:text-2xl tracking-[0.08em]",
  xl: "text-2xl sm:text-3xl tracking-[0.06em]",
};

interface BrandWordmarkProps {
  className?: string;
  size?: BrandWordmarkSize;
}

/** ESAT CAMP - Space Grotesk wordmark (regular A). */
export function BrandWordmark({ className, size = "md" }: BrandWordmarkProps) {
  return (
    <span
      className={cn(
        "font-semibold uppercase leading-none text-current whitespace-nowrap",
        SIZE_CLASS[size],
        className,
      )}
    >
      ESAT CAMP
    </span>
  );
}
