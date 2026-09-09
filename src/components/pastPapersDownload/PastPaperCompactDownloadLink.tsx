import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  href: string;
  label: string;
  ariaLabel: string;
  className?: string;
};

export function PastPaperCompactDownloadLink({
  href,
  label,
  ariaLabel,
  className,
}: Props) {
  return (
    <a
      href={href}
      download
      aria-label={ariaLabel}
      className={cn(
        "inline-flex h-10 min-h-10 items-center gap-2 whitespace-nowrap rounded-lg bg-[#334155] px-4 text-base font-semibold leading-none text-[#F8FAFC] transition-colors hover:bg-[#475569] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1D]",
        className,
      )}
    >
      {label}
      <Download aria-hidden className="h-[18px] w-[18px] opacity-80" />
    </a>
  );
}
