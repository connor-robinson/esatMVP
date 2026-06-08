import { BrandLogo } from '@/components/brand/BrandLogo';
import { cn } from '@/lib/utils';

interface BrandNavLockupProps {
  className?: string;
}

/** Logo mark + theESATGuide wordmark (the + ESAT + Guide). */
export function BrandNavLockup({ className }: BrandNavLockupProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2.5 text-sm leading-none text-text',
        className,
      )}
    >
      <BrandLogo variant='mark' size='nav' alt='' />
      <span className='inline-flex items-baseline whitespace-nowrap tracking-tight'>
        <span className='font-medium lowercase'>the</span>
        <span className='font-bold tracking-[0.02em]'>ESAT</span>
        <span className='font-semibold'>Guide</span>
      </span>
    </span>
  );
}
