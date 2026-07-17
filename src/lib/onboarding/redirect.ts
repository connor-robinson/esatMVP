/**
 * Resolve where to send a user right after auth.
 * Order: username → onboarding → original destination.
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
  if (!profile?.username) {
    // UsernameGate / middleware will collect a username, then send them to onboarding.
    return `/profile?redirectTo=${encodeURIComponent(buildOnboardingUrl(safe))}`;
  }
  if (profile.onboarding_completed !== true) {
    return buildOnboardingUrl(safe);
  }
  return safe;
}
