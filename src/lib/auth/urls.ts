export const RESET_PASSWORD_PATH = "/auth/reset-password";

export function getOrigin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export function getAuthCallbackUrl(
  params: Record<string, string | undefined>,
): string {
  const origin = getOrigin();
  if (!origin) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `${origin}/auth/callback?${qs}` : `${origin}/auth/callback`;
}

export function getPasswordResetCallbackUrl(): string {
  return getAuthCallbackUrl({ next: RESET_PASSWORD_PATH });
}

export function getEmailConfirmCallbackUrl(redirectTo: string): string {
  return getAuthCallbackUrl({ redirectTo });
}
