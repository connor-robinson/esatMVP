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
        "inline-flex items-center gap-1 rounded-lg bg-white/[0.06] px-2 py-0.5 text-xs font-semibold text-white transition-colors hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1D]",
        className,
      )}
    >
      {label}
      <Download aria-hidden className="h-3 w-3 opacity-80" />
    </a>
  );
}
