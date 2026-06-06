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
  /** 1em beside `text-sm` nav links — same cap height as link text. */
  nav: 'h-[1em] w-[1em]',
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
 * Transparent PNG logos (white glyph). Inverted in light mode for dark-on-light UI.
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
        'block shrink-0 select-none object-contain',
        'invert dark:invert-0',
        variant === 'full' ? FULL_SIZE_CLASS[size] : MARK_SIZE_CLASS[size],
        className,
      )}
    />
  );
}
