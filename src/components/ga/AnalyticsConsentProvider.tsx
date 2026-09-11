"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  ANALYTICS_CONSENT_CHANGE_EVENT,
  ANALYTICS_CONSENT_STORAGE_KEY,
  GA_MEASUREMENT_ID,
  OPEN_COOKIE_PREFERENCES_EVENT,
  clearGaCookies,
  disableGaMeasurement,
  enableGaMeasurement,
  initGoogleConsentDefaults,
  readAnalyticsConsent,
  updateGoogleConsentMode,
  writeAnalyticsConsent,
  type AnalyticsConsentStatus,
} from "@/lib/ga";
import { clearGaUserId, setGaUserId } from "@/lib/ga/setUserId";
import { shouldHideSiteChromeForPaper } from "@/lib/papers/activePaperSessionClient";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";

type AnalyticsConsentContextValue = {
  status: AnalyticsConsentStatus;
  /** True while the banner/preferences UI should be visible. */
  preferencesOpen: boolean;
  accept: () => void;
  reject: () => void;
  openPreferences: () => void;
  closePreferences: () => void;
};

const AnalyticsConsentContext =
  createContext<AnalyticsConsentContextValue | null>(null);

export function AnalyticsConsentProvider({
  children,
}: {
  children: ReactNode;
}) {
  const session = useSupabaseSession();
  const pathname = usePathname();
  const immersive = shouldHideSiteChromeForPaper(pathname);
  const [status, setStatus] = useState<AnalyticsConsentStatus>("pending");
  const [hydrated, setHydrated] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    // Local Consent Mode defaults only (no Google network request).
    initGoogleConsentDefaults();

    const stored = readAnalyticsConsent();
    setStatus(stored);
    // Never open the banner on first paint. Pending visitors get a delayed reveal.
    setPreferencesOpen(false);
    setHydrated(true);

    if (stored === "accepted") {
      updateGoogleConsentMode("accepted");
      enableGaMeasurement(GA_MEASUREMENT_ID);
      if (session?.user?.id) {
        setGaUserId(session.user.id);
      }
    } else {
      disableGaMeasurement(GA_MEASUREMENT_ID);
      if (stored === "rejected") {
        updateGoogleConsentMode("rejected");
      }
    }
    // Only run on mount for stored consent; session binding handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount hydrate
  }, []);

  /**
   * First-visit reveal: never immediate, and never during immersive exams
   * (calibration test / Pearson papers). Scroll after a quiet period, or a
   * longer idle fallback. Manual "Cookie preferences" still opens immediately.
   */
  useEffect(() => {
    if (!hydrated || status !== "pending" || preferencesOpen || immersive) {
      return;
    }

    let cancelled = false;
    let revealed = false;
    const startedAt = Date.now();
    const MIN_MS = 6_000;
    const FALLBACK_MS = 14_000;

    const reveal = () => {
      if (cancelled || revealed) return;
      // Re-check route at fire time so we never cover an exam mid-timer.
      if (shouldHideSiteChromeForPaper(window.location.pathname)) return;
      revealed = true;
      setPreferencesOpen(true);
    };

    const tryRevealFromScroll = () => {
      if (Date.now() - startedAt < MIN_MS) return;
      if (window.scrollY < 160) return;
      reveal();
    };

    const fallbackTimer = window.setTimeout(reveal, FALLBACK_MS);
    const minTimer = window.setTimeout(tryRevealFromScroll, MIN_MS);

    window.addEventListener("scroll", tryRevealFromScroll, { passive: true });

    return () => {
      cancelled = true;
      window.clearTimeout(fallbackTimer);
      window.clearTimeout(minTimer);
      window.removeEventListener("scroll", tryRevealFromScroll);
    };
  }, [hydrated, status, preferencesOpen, immersive]);

  useEffect(() => {
    if (status === "accepted" && session?.user?.id) {
      setGaUserId(session.user.id);
    }
  }, [status, session?.user?.id]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== ANALYTICS_CONSENT_STORAGE_KEY) return;
      const next = readAnalyticsConsent();
      setStatus(next);
      // Pending again (cleared in another tab): close and let the delayed reveal re-arm.
      setPreferencesOpen(false);
    };
    const onConsentChange = () => {
      const next = readAnalyticsConsent();
      setStatus(next);
    };
    const onOpenPreferences = () => {
      setPreferencesOpen(true);
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(ANALYTICS_CONSENT_CHANGE_EVENT, onConsentChange);
    window.addEventListener(OPEN_COOKIE_PREFERENCES_EVENT, onOpenPreferences);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(
        ANALYTICS_CONSENT_CHANGE_EVENT,
        onConsentChange,
      );
      window.removeEventListener(
        OPEN_COOKIE_PREFERENCES_EVENT,
        onOpenPreferences,
      );
    };
  }, []);

  const accept = useCallback(() => {
    updateGoogleConsentMode("accepted");
    enableGaMeasurement(GA_MEASUREMENT_ID);
    writeAnalyticsConsent("accepted");
    setStatus("accepted");
    setPreferencesOpen(false);
    if (session?.user?.id) {
      setGaUserId(session.user.id);
    }
  }, [session?.user?.id]);

  const reject = useCallback(() => {
    updateGoogleConsentMode("rejected");
    disableGaMeasurement(GA_MEASUREMENT_ID);
    clearGaUserId();
    clearGaCookies();
    writeAnalyticsConsent("rejected");
    setStatus("rejected");
    setPreferencesOpen(false);
  }, []);

  const openPreferences = useCallback(() => {
    setPreferencesOpen(true);
  }, []);

  const closePreferences = useCallback(() => {
    // Keep banner until Accept or Reject on first visit. If reopening after a
    // choice, closing without changing keeps the prior decision.
    if (status !== "pending") {
      setPreferencesOpen(false);
    }
  }, [status]);

  const value = useMemo(
    () => ({
      status: hydrated ? status : "pending",
      preferencesOpen: hydrated ? preferencesOpen : false,
      accept,
      reject,
      openPreferences,
      closePreferences,
    }),
    [
      hydrated,
      status,
      preferencesOpen,
      accept,
      reject,
      openPreferences,
      closePreferences,
    ],
  );

  return (
    <AnalyticsConsentContext.Provider value={value}>
      {children}
    </AnalyticsConsentContext.Provider>
  );
}

export function useAnalyticsConsent(): AnalyticsConsentContextValue {
  const ctx = useContext(AnalyticsConsentContext);
  if (!ctx) {
    throw new Error(
      "useAnalyticsConsent must be used within AnalyticsConsentProvider",
    );
  }
  return ctx;
}
