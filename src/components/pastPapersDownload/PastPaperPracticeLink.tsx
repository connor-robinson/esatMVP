"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Play } from "lucide-react";
import { LoadingPage } from "@/components/shared/LoadingPage";
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
  label = "Start now",
  ariaLabel,
  size = "compact",
  className,
}: Props) {
  const [starting, setStarting] = useState(false);

  return (
    <>
      <Link
        href={href}
        aria-label={ariaLabel}
        onClick={(event) => {
          if (
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey ||
            event.button !== 0
          ) {
            return;
          }
          setStarting(true);
        }}
        className={cn(
          "inline-flex items-center justify-center gap-1 font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1D]",
          size === "page"
            ? "rounded-xl bg-[#3B82F6] px-4 py-2 text-sm hover:bg-[#2563EB]"
            : "whitespace-nowrap rounded-lg bg-[#3B82F6] px-2 py-1 text-sm hover:bg-[#2563EB]",
          className,
        )}
      >
        {label}
        <Play aria-hidden className="h-3.5 w-3.5 fill-current opacity-90" />
      </Link>
      {starting && typeof document !== "undefined"
        ? createPortal(
            <LoadingPage
              variant="session"
              hint="Sit the paper under timed conditions, then mark with the answer key."
              message="Starting your paper"
            />,
            document.body,
          )
        : null}
    </>
  );
}
