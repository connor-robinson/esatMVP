/** Public name shown on leaderboards and social surfaces. */
export function getPublicDisplayName(
  profile:
    | { username?: string | null; display_name?: string | null }
    | null
    | undefined,
  fallback = "Anonymous User",
): string {
  const username = profile?.username?.trim();
  if (username) return username;

  const displayName = profile?.display_name?.trim();
  if (displayName) return displayName;

  return fallback;
}
