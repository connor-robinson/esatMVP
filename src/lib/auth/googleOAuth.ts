import type { SupabaseClient } from "@supabase/supabase-js";

/** OAuth callback URL preserving post-login redirect. */
export function getGoogleOAuthRedirectUrl(redirectTo: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`;
}

/**
 * Google sign-in requesting email only (no profile/name scope).
 * Users choose their own username during onboarding.
 */
export async function signInWithGoogle(
  supabase: SupabaseClient,
  redirectTo: string,
) {
  const redirectUrl = getGoogleOAuthRedirectUrl(redirectTo);
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUrl,
      scopes: "openid email",
      queryParams: {
        redirectTo,
      },
    },
  });
}
