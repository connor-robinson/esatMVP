import { APP_NAME, BRAND_CONFIG } from '@/config/brand';
import { cn } from '@/lib/utils';

export type BrandLogoVariant = 'full' | 'mark';

const LOGO_SRC: Record<BrandLogoVariant, string> = {
  full: BRAND_CONFIG.logoFullSrc,
  mark: BRAND_CONFIG.logoMarkSrc,
};

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  className?: string;
  /** Accessible label; defaults to app name. */
  alt?: string;
}

/**
 * White-on-black PNG logos. In light mode we invert so the mark reads dark on the page.
 */
export function BrandLogo({
  variant = 'full',
  className,
  alt = APP_NAME,
}: BrandLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- theme invert on raster brand assets
    <img
      src={LOGO_SRC[variant]}
      alt={alt}
      draggable={false}
      className={cn(
        'w-auto select-none',
        // Light: invert white-on-black art to dark-on-light. Dark: native colors + screen hides black matte.
        'invert dark:invert-0 dark:mix-blend-screen',
        variant === 'full' ? 'h-8' : 'h-9 w-9 object-contain',
        className,
      )}
    />
  );
}
