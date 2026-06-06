import { BrandLogo } from '@/components/brand/BrandLogo';
import { SHORT_TITLE } from '@/config/brand';
import { cn } from '@/lib/utils';

interface BrandNavLockupProps {
  className?: string;
}

/** Book mark + uppercase wordmark — same type as main nav section links. */
export function BrandNavLockup({ className }: BrandNavLockupProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider leading-none text-text-muted transition-colors duration-fast ease-signature group-hover:text-text',
        className,
      )}
    >
      <BrandLogo variant='mark' size='nav' alt='' />
      <span>{SHORT_TITLE}</span>
    </span>
  );
}
