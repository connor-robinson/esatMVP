import { cn } from "@/lib/utils";
import { Download } from "lucide-react";

type Props = {
  href: string;
  label: string;
  ariaLabel: string;
  variant?: "primary" | "secondary";
  className?: string;
};

export function PastPaperDownloadButton({
  href,
  label,
  ariaLabel,
  variant = "secondary",
  className,
}: Props) {
  return (
    <a
      href={href}
      download
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1D]",
        variant === "primary"
          ? "bg-[#3B82F6] text-white hover:bg-[#2563EB]"
          : "bg-white/[0.06] text-white hover:bg-white/[0.1]",
        className,
      )}
    >
      {label}
      <Download aria-hidden className="h-3.5 w-3.5 opacity-80" />
    </a>
  );
}
