import { APP_NAME } from "@/config/brand";
import { cn } from "@/lib/utils";
import { BrandWordmark } from "@/components/brand/BrandWordmark";
import { EsatCampIcon } from "@/components/brand/EsatCampIcon";

export type BrandLogoVariant = "full" | "mark";

export type BrandLogoSize = "nav" | "md" | "lg";

const MARK_SIZE_CLASS: Record<BrandLogoSize, string> = {
  nav: "h-7 w-7",
  md: "h-8 w-8",
  lg: "h-12 w-12 sm:h-14 sm:w-14",
};

const WORDMARK_SIZE: Record<BrandLogoSize, "sm" | "md" | "lg" | "xl"> = {
  nav: "sm",
  md: "md",
  lg: "lg",
};

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  size?: BrandLogoSize;
  className?: string;
  /** Accessible label; defaults to app name. */
  alt?: string;
}

/**
 * ESAT CAMP mark (teepee) or full lockup (icon + wordmark).
 * Icon uses currentColor — white on dark backgrounds, dark on light.
 */
export function BrandLogo({
  variant = "mark",
  size = "md",
  className,
  alt = APP_NAME,
}: BrandLogoProps) {
  if (variant === "full") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-3 text-text",
          className,
        )}
        role="img"
        aria-label={alt}
      >
        <EsatCampIcon className={MARK_SIZE_CLASS[size]} />
        <BrandWordmark size={WORDMARK_SIZE[size]} />
      </span>
    );
  }

  return (
    <EsatCampIcon
      className={cn(MARK_SIZE_CLASS[size], "text-text", className)}
      role="img"
      aria-label={alt}
    />
  );
}
