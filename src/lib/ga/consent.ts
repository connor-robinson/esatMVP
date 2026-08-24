/**
 * UK PECR / UK GDPR analytics consent + Google Consent Mode v2 helpers.
 * Analytics / Ads tags stay off until the visitor explicitly accepts.
 */

export const ANALYTICS_CONSENT_STORAGE_KEY = "esatcamp_analytics_consent";

/** Window flag set once Consent Mode defaults are pushed (inline or JS). */
export const GCM_DEFAULT_FLAG = "__esatcamp_gcm_default";

export type AnalyticsConsentStatus = "pending" | "accepted" | "rejected";

export const ANALYTICS_CONSENT_CHANGE_EVENT = "esatcamp:analytics-consent";
export const OPEN_COOKIE_PREFERENCES_EVENT = "esatcamp:open-cookie-preferences";

/** Consent Mode v2 signals before any opt-in. */
export const CONSENT_MODE_DENIED = {
  analytics_storage: "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
} as const;

/**
 * After optional-cookie acceptance.
 * ad_personalization stays denied: no remarketing / personalised ads.
 */
export const CONSENT_MODE_ACCEPTED = {
  analytics_storage: "granted",
  ad_storage: "granted",
  ad_user_data: "granted",
  ad_personalization: "denied",
} as const;

export type ConsentModeSignals = {
  analytics_storage: "granted" | "denied";
  ad_storage: "granted" | "denied";
  ad_user_data: "granted" | "denied";
  ad_personalization: "granted" | "denied";
};

type GaWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  [GCM_DEFAULT_FLAG]?: boolean;
};

function getGaWindow(): GaWindow | null {
  if (typeof window === "undefined") return null;
  return window as GaWindow;
}

/** Ensure local dataLayer + gtag stub exist without loading any Google script. */
export function ensureGtagStub(): void {
  const w = getGaWindow();
  if (!w) return;
  w.dataLayer = w.dataLayer || [];
  if (typeof w.gtag === "function") return;
  w.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments);
  };
}

/**
 * Push Consent Mode v2 defaults (all denied). Local only: no network request.
 * Idempotent across the inline head script and React provider.
 */
export function initGoogleConsentDefaults(): void {
  const w = getGaWindow();
  if (!w) return;
  if (w[GCM_DEFAULT_FLAG]) return;

  ensureGtagStub();
  w.gtag!("consent", "default", {
    ...CONSENT_MODE_DENIED,
    wait_for_update: 500,
  });
  w[GCM_DEFAULT_FLAG] = true;
}

/** Apply Consent Mode v2 update after the visitor accepts or rejects. */
export function updateGoogleConsentMode(
  status: "accepted" | "rejected",
): void {
  const w = getGaWindow();
  if (!w) return;
  ensureGtagStub();
  const signals: ConsentModeSignals =
    status === "accepted" ? { ...CONSENT_MODE_ACCEPTED } : { ...CONSENT_MODE_DENIED };
  w.gtag!("consent", "update", signals);
}

export function readAnalyticsConsent(): AnalyticsConsentStatus {
  if (typeof window === "undefined") return "pending";
  try {
    const raw = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    if (raw === "accepted" || raw === "rejected") return raw;
  } catch {
    /* storage may be blocked */
  }
  return "pending";
}

export function hasAnalyticsConsent(): boolean {
  return readAnalyticsConsent() === "accepted";
}

export function writeAnalyticsConsent(status: "accepted" | "rejected"): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, status);
  } catch {
    /* storage may be blocked */
  }
  window.dispatchEvent(
    new CustomEvent(ANALYTICS_CONSENT_CHANGE_EVENT, { detail: status }),
  );
}

function isClearableGoogleCookie(name: string): boolean {
  return (
    name === "_ga" ||
    name === "_gid" ||
    name === "_gat" ||
    name.startsWith("_ga_") ||
    name.startsWith("_gcl") ||
    name.startsWith("_gac")
  );
}

/**
 * Clear GA / Ads first-party cookies set by gtag (PECR withdrawal).
 * Keeps the consent preference in localStorage.
 */
export function clearGaCookies(): void {
  if (typeof document === "undefined") return;

  const names = document.cookie
    .split(";")
    .map((part) => part.trim().split("=")[0])
    .filter((name) => Boolean(name) && isClearableGoogleCookie(name));

  if (names.length === 0) return;

  const hostname = window.location.hostname;
  const domains = new Set<string>(["", hostname]);
  const parts = hostname.split(".").filter(Boolean);
  if (parts.length >= 2) {
    domains.add(`.${parts.slice(-2).join(".")}`);
  }
  if (parts.length >= 3) {
    domains.add(`.${parts.slice(-3).join(".")}`);
  }

  for (const name of names) {
    for (const domain of domains) {
      const domainAttr = domain ? `; domain=${domain}` : "";
      document.cookie = `${name}=; Max-Age=0; path=/${domainAttr}`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domainAttr}`;
    }
  }
}

export function openCookiePreferences(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_COOKIE_PREFERENCES_EVENT));
}

export function disableGaMeasurement(measurementId: string): void {
  if (typeof window === "undefined" || !measurementId) return;
  (window as unknown as Record<string, boolean>)[`ga-disable-${measurementId}`] =
    true;
}

export function enableGaMeasurement(measurementId: string): void {
  if (typeof window === "undefined" || !measurementId) return;
  (window as unknown as Record<string, boolean>)[`ga-disable-${measurementId}`] =
    false;
}

/** Test-only: allow re-running default consent init. */
export function __resetConsentModeForTests(): void {
  const w = getGaWindow();
  if (w) delete w[GCM_DEFAULT_FLAG];
}
