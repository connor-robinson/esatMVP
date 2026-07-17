import type { SupabaseClient } from "@supabase/supabase-js";

/** OAuth callback URL preserving post-login redirect. */
export function getGoogleOAuthRedirectUrl(redirectTo: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`;
}

/**
 * Google sign-in requesting email only — no profile/name/picture scopes.
 * Users pick their own username; we never use Google display name or avatar.
 *
 * Also remove `…/auth/userinfo.profile` from the Google Cloud OAuth consent
 * screen (Data Access) so the consent UI does not ask for name/photo.
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
      // Email only — never request profile / name / picture
      scopes: "openid email",
      queryParams: {
        redirectTo,
        include_granted_scopes: "false",
      },
    },
  });
}
