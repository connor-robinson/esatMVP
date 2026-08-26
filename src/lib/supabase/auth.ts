import type { Session, User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { createServerClient, createRouteClient } from "./server";

interface RequireUserOptions {
  redirectTo?: string;
}

interface RequireUserResult {
  user: User;
  session: Session;
  supabase: SupabaseClient<Database>;
}

export async function requireUser(
  options: RequireUserOptions = {},
): Promise<RequireUserResult> {
  const supabase = createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect(options.redirectTo ?? "/login");
  }

  return {
    user: session.user,
    session,
    supabase: supabase as any as SupabaseClient<Database>,
  };
}

export async function requireRouteUser(request: Request) {
  // During build time, return a mock response to prevent errors
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return { session: null, supabase: null as any, user: null as null, error: "unauthorized" as const };
  }
  
  try {
    const supabase = createRouteClient();
    if (!supabase) {
      return { session: null, supabase: null as any, user: null as null, error: "unauthorized" as const };
    }

    // Verify identity with the Auth server. Do not trust getSession() user data
    // for security-sensitive authorization (cookie storage can be spoofed).
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { session: null, supabase, user: null as null, error: "unauthorized" as const };
    }

    // Session is optional convenience for callers that need tokens; identity
    // always comes from the verified user above.
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const trustedSession =
      session?.user?.id === user.id ? { ...session, user } : null;

    return { session: trustedSession, supabase, user };
  } catch (error: any) {
    return { session: null, supabase: null as any, user: null as null, error: "unauthorized" as const };
  }
}

/**
 * Check if user is authenticated without redirecting
 * Useful for optional auth scenarios
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const supabase = createServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return !!session?.user;
  } catch (error) {
    return false;
  }
}

/**
 * Get current session without requiring authentication
 * Returns null if not authenticated
 */
export async function getOptionalSession(): Promise<Session | null> {
  try {
    const supabase = createServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session;
  } catch (error) {
    return null;
  }
}

