import { BrandLogo } from '@/components/brand/BrandLogo';
import { cn } from '@/lib/utils';

interface BrandNavLockupProps {
  className?: string;
}

/** Matches section nav link typography (text-sm, semibold, tracking). */
const navWordClass =
  'text-sm font-semibold uppercase tracking-[0.12em] leading-none';

/** Logo mark + theESATGuide wordmark (the + ESAT + Guide). */
export function BrandNavLockup({ className }: BrandNavLockupProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2.5 text-text',
        className,
      )}
    >
      <BrandLogo variant='mark' size='nav' alt='' />
      <span className={cn(navWordClass, 'inline-flex items-baseline whitespace-nowrap normal-case')}>
        <span className='font-semibold lowercase'>the</span>
        <span className='font-bold'>ESAT</span>
        <span className='font-semibold'>Guide</span>
      </span>
    </span>
  );
}
