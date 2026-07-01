import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { BrandWordmark } from "@/components/brand/BrandWordmark";

interface BrandNavLockupProps {
  className?: string;
}

/** Navbar lockup — teepee PNG + ESAT CAMP wordmark. */
export function BrandNavLockup({ className }: BrandNavLockupProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 text-text",
        className,
      )}
    >
      <BrandLogo variant="mark" size="nav" alt="" />
      <BrandWordmark size="sm" />
    </span>
  );
}
