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
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#334155] px-3 py-1.5 text-sm font-semibold text-[#F8FAFC] transition-colors hover:bg-[#475569] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1D]",
        className,
      )}
    >
      {label}
      <Download aria-hidden className="h-3.5 w-3.5 opacity-80" />
    </a>
  );
}
