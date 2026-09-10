"use client";

import { MessageCircleQuestion } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { useAnalyticsConsent } from "@/components/ga/AnalyticsConsentProvider";
import { trackEvent } from "@/lib/ga/trackEvent";
import { shouldShowSupportLauncher } from "@/lib/support/visibility";
import { cn } from "@/lib/utils";
import { useOptionalSupport } from "./SupportProvider";

/**
 * Fixed Help button for authenticated app pages (dashboard, settings/profile, etc.).
 */
export function SupportLauncher() {
  const support = useOptionalSupport();
  const session = useSupabaseSession();
  const pathname = usePathname();
  const { preferencesOpen } = useAnalyticsConsent();

  if (!support || !session?.user) return null;
  if (!shouldShowSupportLauncher(pathname)) return null;
  if (support.open) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed z-[55] flex justify-end",
        // Keep clear of home-indicator / browser chrome and cookie banner.
        preferencesOpen
          ? "bottom-[calc(11rem+env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))] sm:bottom-[calc(10rem+env(safe-area-inset-bottom,0px))]"
          : "bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))] sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))]",
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
        aria-expanded={false}
        aria-controls="support-panel"
        onClick={() => {
          trackEvent("support_opened", { placement: "floating_launcher" });
          support.openSupport();
        }}
      >
        <MessageCircleQuestion className="h-4 w-4 shrink-0" aria-hidden />
        <span>Help</span>
      </button>
    </div>
  );
}
