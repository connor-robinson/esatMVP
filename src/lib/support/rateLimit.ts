import "server-only";
import { createHash } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPPORT_LIMITS } from "./constants";

export function createSupportServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error("[support] Missing Supabase service role configuration");
    return null;
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function hashSupportClientIp(ip: string | null | undefined): string {
  const raw = (ip || "unknown").trim() || "unknown";
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

export function getRequestClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp || null;
}

export async function checkSupportRateLimit(
  service: SupabaseClient,
  opts: { userId: string | null; ipHash: string },
): Promise<{ allowed: boolean; reason?: "user" | "ip" }> {
  const since = new Date(Date.now() - SUPPORT_LIMITS.windowMs).toISOString();

  if (opts.userId) {
    const { count: userCount } = await service
      .from("support_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", opts.userId)
      .neq("status", "spam")
      .gte("created_at", since);

    if ((userCount ?? 0) >= SUPPORT_LIMITS.maxPerUser) {
      return { allowed: false, reason: "user" };
    }
  }

  const { count: ipCount } = await service
    .from("support_requests")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", opts.ipHash)
    .neq("status", "spam")
    .gte("created_at", since);

  if ((ipCount ?? 0) >= SUPPORT_LIMITS.maxPerIp) {
    return { allowed: false, reason: "ip" };
  }

  return { allowed: true };
}
