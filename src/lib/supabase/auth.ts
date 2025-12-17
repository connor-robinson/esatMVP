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
      console.error("[auth] Failed to create Supabase client");
      return { session: null, supabase: null as any, user: null as null, error: "unauthorized" as const };
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("[auth] Session error:", sessionError);
      return { session: null, supabase, user: null as null, error: "unauthorized" as const };
    }

    if (!session?.user) {
      return { session: null, supabase, user: null as null, error: "unauthorized" as const };
    }

    return { session, supabase, user: session.user };
  } catch (error: any) {
    console.error("[auth] requireRouteUser error:", error);
    return { session: null, supabase: null as any, user: null as null, error: "unauthorized" as const };
  }
}

