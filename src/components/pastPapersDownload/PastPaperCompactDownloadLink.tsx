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
        "inline-flex items-center gap-1.5 rounded-lg bg-[#CBD5E1] px-2.5 py-1 text-sm font-semibold text-[#0F172A] transition-colors hover:bg-[#E2E8F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1D]",
        className,
      )}
    >
      {label}
      <Download aria-hidden className="h-3.5 w-3.5 opacity-80" />
    </a>
  );
}
