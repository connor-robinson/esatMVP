/**
 * Resolve where to send a user right after auth.
 * Incomplete accounts (no username and/or unfinished questionnaire) go to
 * /onboarding, which collects everything in one flow.
 */

import { CALIBRATION_ROUTES } from "@/lib/calibration/constants";

/** Default destination after login/signup when no safe redirectTo is provided. */
export const DEFAULT_POST_AUTH_PATH = "/dashboard";

/** First-time users finish onboarding into calibration, not an empty dashboard. */
export const FIRST_RUN_POST_ONBOARDING_PATH = CALIBRATION_ROUTES.hub;

export function buildOnboardingUrl(redirectTo: string): string {
  const safe =
    redirectTo.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : DEFAULT_POST_AUTH_PATH;
  return `/onboarding?redirectTo=${encodeURIComponent(safe)}`;
}

export function sanitizeRedirectTo(redirectTo: string | null | undefined): string {
  if (!redirectTo) return DEFAULT_POST_AUTH_PATH;
  if (!redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    return DEFAULT_POST_AUTH_PATH;
  }
  if (
    redirectTo.startsWith("/login") ||
    redirectTo.startsWith("/signup") ||
    redirectTo.startsWith("/onboarding") ||
    redirectTo.startsWith("/auth")
  ) {
    return DEFAULT_POST_AUTH_PATH;
  }
  return redirectTo;
}

/**
 * After the questionnaire, prefer calibration for generic dashboard landings
 * so first-time users get a clear next step.
 */
export function resolvePostOnboardingPath(
  redirectTo: string | null | undefined,
): string {
  const safe = sanitizeRedirectTo(redirectTo);
  if (safe === DEFAULT_POST_AUTH_PATH || safe === "/dashboard") {
    return FIRST_RUN_POST_ONBOARDING_PATH;
  }
  return safe;
}

export type PostAuthProfile = {
  username: string | null;
  onboarding_completed: boolean | null;
};

/**
 * Partner claim paths must run before onboarding. Middleware and UsernameGate
 * already allow /access while setup is incomplete; auth redirects must match.
 */
export function isPartnerAccessPath(path: string): boolean {
  return path === "/access" || path.startsWith("/access/");
}

export function resolvePostAuthPath(
  profile: PostAuthProfile | null,
  redirectTo: string,
): string {
  const safe = sanitizeRedirectTo(redirectTo);
  if (isPartnerAccessPath(safe)) {
    return safe;
  }
  const needsSetup =
    !profile?.username || profile.onboarding_completed !== true;
  if (needsSetup) {
    return buildOnboardingUrl(safe);
  }
  return safe;
}

/** Login URL that returns the user to the dashboard after auth. */
export function dashboardLoginUrl(mode?: "signin" | "signup"): string {
  const params = new URLSearchParams();
  if (mode === "signup") {
    params.set("mode", "signup");
  }
  params.set("redirectTo", DEFAULT_POST_AUTH_PATH);
  return `/login?${params.toString()}`;
}
