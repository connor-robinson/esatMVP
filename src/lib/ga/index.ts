export {
  ANALYTICS_CONSENT_CHANGE_EVENT,
  ANALYTICS_CONSENT_STORAGE_KEY,
  OPEN_COOKIE_PREFERENCES_EVENT,
  clearGaCookies,
  disableGaMeasurement,
  enableGaMeasurement,
  hasAnalyticsConsent,
  openCookiePreferences,
  readAnalyticsConsent,
  writeAnalyticsConsent,
  type AnalyticsConsentStatus,
} from "./consent";

export {
  DEFAULT_GA_MEASUREMENT_ID,
  GA_ENABLED,
  GA_MEASUREMENT_ID,
  flushGaQueue,
  sanitizeGaParams,
  trackEvent,
  trackPageView,
  type GaEventName,
  type GaEventParams,
} from "./trackEvent";
