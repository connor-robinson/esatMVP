/**
 * Resolve where to send a user right after auth.
 * Incomplete accounts (no username and/or unfinished questionnaire) go to
 * /onboarding, which collects everything in one flow.
 */
export function buildOnboardingUrl(redirectTo: string): string {
  const safe =
    redirectTo.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : "/past-papers/library";
  return `/onboarding?redirectTo=${encodeURIComponent(safe)}`;
}

export function sanitizeRedirectTo(redirectTo: string | null | undefined): string {
  if (!redirectTo) return "/past-papers/library";
  if (!redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    return "/past-papers/library";
  }
  if (redirectTo.startsWith("/login") || redirectTo.startsWith("/signup") || redirectTo.startsWith("/onboarding")) {
    return "/past-papers/library";
  }
  return redirectTo;
}

export type PostAuthProfile = {
  username: string | null;
  onboarding_completed: boolean | null;
};

export function resolvePostAuthPath(
  profile: PostAuthProfile | null,
  redirectTo: string,
): string {
  const safe = sanitizeRedirectTo(redirectTo);
  const needsSetup =
    !profile?.username || profile.onboarding_completed !== true;
  if (needsSetup) {
    return buildOnboardingUrl(safe);
  }
  return safe;
}
