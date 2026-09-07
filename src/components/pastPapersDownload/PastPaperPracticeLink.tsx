import Link from "next/link";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  href: string;
  label?: string;
  ariaLabel: string;
  size?: "compact" | "page";
  className?: string;
};

export function PastPaperPracticeLink({
  href,
  label = "Do in ESAT Camp",
  ariaLabel,
  size = "compact",
  className,
}: Props) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1D]",
        size === "page"
          ? "rounded-xl bg-[#3B82F6] px-4 py-2 text-sm hover:bg-[#2563EB]"
          : "whitespace-nowrap rounded-lg bg-[#3B82F6] px-3 py-1.5 text-sm hover:bg-[#2563EB]",
        className,
      )}
    >
      {label}
      <Play aria-hidden className="h-3.5 w-3.5 fill-current opacity-90" />
    </Link>
  );
}
