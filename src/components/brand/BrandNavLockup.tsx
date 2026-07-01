import { cn } from "@/lib/utils";
import { BrandWordmark } from "@/components/brand/BrandWordmark";
import { EsatCampIcon } from "@/components/brand/EsatCampIcon";

interface BrandNavLockupProps {
  className?: string;
}

/** Navbar lockup — teepee icon + ESAT CAMP wordmark. */
export function BrandNavLockup({ className }: BrandNavLockupProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 text-text",
        className,
      )}
    >
      <EsatCampIcon className="h-7 w-7 shrink-0" />
      <BrandWordmark size="sm" />
    </span>
  );
}
