import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireRouteUser } from "@/lib/supabase/auth";
import { createTesterServiceClient } from "./service";

export interface AdminContext {
  ok: boolean;
  userId?: string;
  service?: SupabaseClient;
  status?: number;
  error?: string;
}

/**
 * Authorise an admin request. Admins are users with profiles.role = 'admin'
 * (see current_user_is_admin() in the DB). Returns a service-role client for
 * privileged reads/writes when authorised.
 *
 * Identity comes from requireRouteUser → supabase.auth.getUser() (Auth server
 * verification), not from trusted getSession() cookie data alone.
 */
export async function requireTesterAdmin(
  request: NextRequest,
): Promise<AdminContext> {
  const { user, error } = await requireRouteUser(request);
  if (error || !user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const service = createTesterServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, userId: user.id, service };
}
