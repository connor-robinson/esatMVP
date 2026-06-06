import { BrandLogo } from '@/components/brand/BrandLogo';
import { SHORT_TITLE } from '@/config/brand';
import { cn } from '@/lib/utils';

interface BrandNavLockupProps {
  className?: string;
}

/** Book mark + uppercase wordmark — matches original navbar styling. */
export function BrandNavLockup({ className }: BrandNavLockupProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <BrandLogo variant='mark' size='nav' alt='' />
      <span className='text-sm font-bold uppercase tracking-[0.14em] text-text transition-colors duration-fast ease-signature group-hover:text-text-muted'>
        {SHORT_TITLE}
      </span>
    </span>
  );
}
