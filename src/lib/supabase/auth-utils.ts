import type { User } from "@supabase/supabase-js";

export function getAuthProviders(user: User): string[] {
  return user.identities?.map((identity) => identity.provider) ?? [];
}

export function hasEmailPasswordIdentity(user: User): boolean {
  return getAuthProviders(user).includes("email");
}

export function getOAuthProvider(user: User): string | null {
  const oauthIdentity = user.identities?.find(
    (identity) => identity.provider !== "email",
  );
  return oauthIdentity?.provider ?? null;
}

export function formatAuthProviderLabel(provider: string): string {
  if (provider === "google") return "Google";
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}
