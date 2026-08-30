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
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maths/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        variant === "primary"
          ? "bg-maths text-white hover:bg-maths/90"
          : "bg-surface-elevated text-text hover:bg-surface-mid",
        className,
      )}
    >
      {label}
      <Download aria-hidden className="h-3.5 w-3.5 opacity-80" />
    </a>
  );
}
