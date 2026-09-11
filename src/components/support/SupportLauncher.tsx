"use client";

import { MessageCircleQuestion, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { trackEvent } from "@/lib/ga/trackEvent";
import { shouldShowSupportLauncher } from "@/lib/support/visibility";
import { cn } from "@/lib/utils";
import { useOptionalSupport } from "./SupportProvider";

/**
 * Fixed Help button for authenticated app pages.
 * Stays visible while the compact popup is open so it can toggle closed.
 */
export function SupportLauncher() {
  const support = useOptionalSupport();
  const session = useSupabaseSession();
  const pathname = usePathname();

  if (!support || !session?.user) return null;
  if (!shouldShowSupportLauncher(pathname)) return null;

  const isOpen = support.open;

  return (
    <div
      className={cn(
        "pointer-events-none fixed z-[101] flex justify-end",
        "bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))] sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))]",
      )}
    >
      <button
        type="button"
        className={cn(
          "pointer-events-auto inline-flex items-center gap-2 rounded-organic-lg",
          "bg-primary px-3.5 py-2.5 text-sm font-semibold text-background",
          "shadow-bar-floating transition-opacity hover:opacity-90",
          "focus-visible:outline-none focus-visible:shadow-glow-focus",
          "min-h-[44px] min-w-[44px]",
        )}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls="support-panel"
        onClick={() => {
          if (isOpen) {
            support.closeSupport();
            return;
          }
          trackEvent("support_opened", { placement: "floating_launcher" });
          support.openSupport();
        }}
      >
        {isOpen ? (
          <X className="h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <MessageCircleQuestion className="h-4 w-4 shrink-0" aria-hidden />
        )}
        <span>{isOpen ? "Close" : "Help"}</span>
      </button>
    </div>
  );
}
