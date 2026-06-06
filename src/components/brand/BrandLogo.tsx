import { APP_NAME, BRAND_CONFIG } from '@/config/brand';
import { cn } from '@/lib/utils';

export type BrandLogoVariant = 'full' | 'mark';

const LOGO_SRC: Record<BrandLogoVariant, string> = {
  full: BRAND_CONFIG.logoFullSrc,
  mark: BRAND_CONFIG.logoMarkSrc,
};

export type BrandLogoSize = 'nav' | 'md' | 'lg';

const SIZE_CLASS: Record<BrandLogoSize, string> = {
  /** Matches navbar `text-sm` link cap height (14px). */
  nav: 'h-[0.875rem] w-auto',
  md: 'h-8 w-auto',
  lg: 'h-12 w-auto sm:h-14',
};

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  size?: BrandLogoSize;
  className?: string;
  /** Accessible label; defaults to app name. */
  alt?: string;
}

/**
 * White-on-black PNG logos. In light mode we invert so the mark reads dark on the page.
 */
export function BrandLogo({
  variant = 'full',
  size = 'md',
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
        'select-none',
        // Light: invert white-on-black art to dark-on-light. Dark: native colors + screen hides black matte.
        'invert dark:invert-0 dark:mix-blend-screen',
        variant === 'full' ? SIZE_CLASS[size] : 'h-9 w-9 object-contain',
        className,
      )}
    />
  );
}
