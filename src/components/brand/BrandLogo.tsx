import { APP_NAME } from "@/config/brand";
import { cn } from "@/lib/utils";
import { BrandMarkImage } from "@/components/brand/BrandMarkImage";
import { BrandWordmark } from "@/components/brand/BrandWordmark";

export type BrandLogoVariant = "full" | "mark";

export type BrandLogoSize = "nav" | "md" | "lg";

/** Height only — width follows native 687×583 aspect ratio. */
const MARK_HEIGHT_CLASS: Record<BrandLogoSize, string> = {
  nav: "h-5",
  md: "h-8",
  lg: "h-12 sm:h-14",
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
 * ESAT CAMP mark (teepee PNG) or full lockup (icon + wordmark).
 */
export function BrandLogo({
  variant = "mark",
  size = "md",
  className,
  alt = APP_NAME,
}: BrandLogoProps) {
  const mark = (
    <BrandMarkImage
      className={cn(MARK_HEIGHT_CLASS[size], className)}
      alt={variant === "mark" ? alt : ""}
    />
  );

  if (variant === "full") {
    return (
      <span
        className="inline-flex items-center gap-3 text-text"
        role="img"
        aria-label={alt}
      >
        {mark}
        <BrandWordmark size={WORDMARK_SIZE[size]} />
      </span>
    );
  }

  return (
    <span role="img" aria-label={alt} className="inline-flex">
      {mark}
    </span>
  );
}
