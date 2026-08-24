/**
 * UK PECR / UK GDPR analytics consent helpers.
 * Analytics is off until the visitor explicitly accepts.
 */

export const ANALYTICS_CONSENT_STORAGE_KEY = "esatcamp_analytics_consent";

export type AnalyticsConsentStatus = "pending" | "accepted" | "rejected";

export const ANALYTICS_CONSENT_CHANGE_EVENT = "esatcamp:analytics-consent";
export const OPEN_COOKIE_PREFERENCES_EVENT = "esatcamp:open-cookie-preferences";

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

/** Clear GA first-party cookies set by gtag (PECR withdrawal). */
export function clearGaCookies(): void {
  if (typeof document === "undefined") return;

  const names = document.cookie
    .split(";")
    .map((part) => part.trim().split("=")[0])
    .filter((name) => name === "_ga" || name.startsWith("_ga_"));

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
