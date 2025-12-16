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
  const supabase = createRouteClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return { session: null, supabase, user: null as null, error: "unauthorized" as const };
  }

  return { session, supabase, user: session.user };
}

