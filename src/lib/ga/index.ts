export {
  ANALYTICS_CONSENT_CHANGE_EVENT,
  ANALYTICS_CONSENT_STORAGE_KEY,
  CONSENT_MODE_ACCEPTED,
  CONSENT_MODE_DENIED,
  GCM_DEFAULT_FLAG,
  OPEN_COOKIE_PREFERENCES_EVENT,
  clearGaCookies,
  disableGaMeasurement,
  enableGaMeasurement,
  ensureGtagStub,
  hasAnalyticsConsent,
  initGoogleConsentDefaults,
  openCookiePreferences,
  readAnalyticsConsent,
  updateGoogleConsentMode,
  writeAnalyticsConsent,
  type AnalyticsConsentStatus,
  type ConsentModeSignals,
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

export {
  GA_SCRIPT_ATTR,
  isGaScriptLoaded,
  isGaStubReady,
  loadGoogleAnalytics,
} from "./loadGa";

export {
  GA_CONVERTER_RESULT_KEY,
  GA_LAST_CONVERTER_EXAM_KEY,
  GA_SOURCE_PAGE_KEY,
  currentGaPath,
  hasSeenConverterResult,
  markConverterResultSeen,
  readGaSourcePage,
  readLastConverterExam,
  rememberGaSourcePage,
  trackEventOnce,
} from "./funnel";

export {
  clearGaUserId,
  isSupabaseUserUuid,
  setGaUserId,
} from "./setUserId";

export {
  claimCommerceEvent,
  fallbackGaClientId,
  isCommerceEventSent,
  sendGaCommerceEvent,
  type GaCommerceEventName,
  type GaCommerceSource,
} from "./measurementProtocol";
