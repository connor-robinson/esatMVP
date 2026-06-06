import { APP_NAME, BRAND_CONFIG } from '@/config/brand';
import { cn } from '@/lib/utils';

export type BrandLogoVariant = 'full' | 'mark';

const LOGO_SRC: Record<BrandLogoVariant, string> = {
  full: BRAND_CONFIG.logoFullSrc,
  mark: BRAND_CONFIG.logoMarkSrc,
};

export type BrandLogoSize = 'nav' | 'md' | 'lg';

const FULL_SIZE_CLASS: Record<BrandLogoSize, string> = {
  nav: 'h-[0.875rem] w-auto',
  md: 'h-8 w-auto',
  lg: 'h-12 w-auto sm:h-14',
};

const MARK_SIZE_CLASS: Record<BrandLogoSize, string> = {
  /** Sits beside `text-sm` nav links. */
  nav: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12 sm:h-14 sm:w-14',
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
        variant === 'full'
          ? FULL_SIZE_CLASS[size]
          : cn(MARK_SIZE_CLASS[size], 'object-contain'),
        className,
      )}
    />
  );
}
