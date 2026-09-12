import { NextRequest, NextResponse } from "next/server";
import { requireTesterAdmin } from "@/lib/tester/admin";
import type { InboxUserSearchHit } from "@/lib/inbox";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/inbox/users?q=
 * Search profiles by username or email for personal message targeting.
 */
export async function GET(request: NextRequest) {
  const admin = await requireTesterAdmin(request);
  if (!admin.ok || !admin.service) {
    return NextResponse.json(
      { error: admin.error ?? "Unauthorized" },
      { status: admin.status ?? 401 },
    );
  }

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ users: [] as InboxUserSearchHit[] });
  }

  const pattern = `%${q}%`;

  const [byUsername, byEmail] = await Promise.all([
    admin.service
      .from("profiles")
      .select("id, username, email")
      .ilike("username", pattern)
      .limit(15),
    admin.service
      .from("profiles")
      .select("id, username, email")
      .ilike("email", pattern)
      .limit(15),
  ]);

  if (byUsername.error && byEmail.error) {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }

  const byId = new Map<string, InboxUserSearchHit>();
  for (const p of [...(byUsername.data ?? []), ...(byEmail.data ?? [])]) {
    byId.set(p.id, {
      id: p.id,
      username: p.username ?? null,
      email: p.email ?? null,
    });
  }

  return NextResponse.json({
    users: Array.from(byId.values()).slice(0, 20),
  });
}
