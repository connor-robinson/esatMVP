import { BrandLogo } from '@/components/brand/BrandLogo';
import { NAV_WORDMARK } from '@/config/brand';
import { cn } from '@/lib/utils';

interface BrandNavLockupProps {
  className?: string;
}

/** Book mark + uppercase wordmark — same type as main nav section links. */
export function BrandNavLockup({ className }: BrandNavLockupProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-sm font-semibold leading-none tracking-normal text-black dark:text-white',
        className,
      )}
    >
      <BrandLogo variant='mark' size='nav' alt='' />
      <span>{NAV_WORDMARK}</span>
    </span>
  );
}
