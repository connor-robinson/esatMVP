import { cn } from "@/lib/utils";
import { BrandMarkImage } from "@/components/brand/BrandMarkImage";
import { BrandWordmark } from "@/components/brand/BrandWordmark";

interface BrandNavLockupProps {
  className?: string;
}

/** Navbar lockup — teepee PNG + ESAT CAMP wordmark. */
export function BrandNavLockup({ className }: BrandNavLockupProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-text",
        className,
      )}
    >
      <BrandMarkImage className="h-5 w-auto translate-y-px" alt="" />
      <BrandWordmark size="sm" />
    </span>
  );
}
