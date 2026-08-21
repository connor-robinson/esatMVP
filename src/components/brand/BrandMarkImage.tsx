import { BRAND_CONFIG } from "@/config/brand";
import { cn } from "@/lib/utils";

/** Raster mark intrinsic size (preserve aspect ratio - do not force square). */
export const BRAND_MARK_WIDTH = 687;
export const BRAND_MARK_HEIGHT = 583;

interface BrandMarkImageProps {
  className?: string;
  alt?: string;
}

/** White teepee on transparent PNG; inverted in light mode. */
export function BrandMarkImage({ className, alt = "" }: BrandMarkImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- brand raster asset
    <img
      src={BRAND_CONFIG.logoMarkSrc}
      alt={alt}
      width={BRAND_MARK_WIDTH}
      height={BRAND_MARK_HEIGHT}
      draggable={false}
      loading="eager"
      fetchPriority="high"
      decoding="sync"
      className={cn(
        "block shrink-0 w-auto max-w-none object-contain object-left",
        // Default white mark - app defaults to dark theme (incl. SSR before theme script runs).
        "brightness-100 invert-0",
        // Light theme - dark mark on light backgrounds.
        "[.light_&]:brightness-0 [.light_&]:invert",
        className,
      )}
    />
  );
}
