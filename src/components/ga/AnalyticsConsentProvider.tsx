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
  const [status, setStatus] = useState<AnalyticsConsentStatus>("pending");
  const [hydrated, setHydrated] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    // Local Consent Mode defaults only (no Google network request).
    initGoogleConsentDefaults();

    const stored = readAnalyticsConsent();
    setStatus(stored);
    setPreferencesOpen(stored === "pending");
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
      setPreferencesOpen(next === "pending");
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
    // Only allow dismiss without a choice on first visit? UK wants an explicit
    // choice — keep banner until Accept or Reject. If reopening after a choice,
    // closing without changing keeps the prior decision.
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
