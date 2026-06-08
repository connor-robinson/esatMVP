import { cn } from '@/lib/utils';

interface BrandNavLockupProps {
  className?: string;
}

/** Matches section nav link typography (text-sm, semibold, tracking). */
const navWordClass =
  'text-sm font-semibold uppercase tracking-[0.12em] leading-none';

/** Navbar wordmark — TheEsatGuide (no logo). */
export function BrandNavLockup({ className }: BrandNavLockupProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center text-text',
        navWordClass,
        'whitespace-nowrap normal-case',
        className,
      )}
    >
      <span className='font-semibold'>The</span>
      <span className='font-semibold'>Esat</span>
      <span className='font-semibold'>Guide</span>
    </span>
  );
}
