import { NextRequest, NextResponse } from "next/server";
import { requireTesterAdmin } from "@/lib/tester/admin";

export const dynamic = "force-dynamic";

function parseLegacyDescription(description: string): {
  subject: string;
  reply_email: string | null;
  message: string;
} {
  const lines = description.split(/\r?\n/);
  let subject = "Legacy help report";
  let reply_email: string | null = null;
  const bodyLines: string[] = [];

  for (const line of lines) {
    const subjectMatch = /^Subject:\s*(.*)$/i.exec(line.trim());
    if (subjectMatch) {
      subject = subjectMatch[1].trim() || subject;
      continue;
    }
    const contactMatch = /^Contact:\s*(.*)$/i.exec(line.trim());
    if (contactMatch) {
      const email = contactMatch[1].trim();
      reply_email = email || null;
      continue;
    }
    bodyLines.push(line);
  }

  return {
    subject,
    reply_email,
    message: bodyLines.join("\n").trim() || description,
  };
}

/**
 * GET /api/admin/support
 * List recent support_requests plus legacy app_bug_reports for admins.
 */
export async function GET(request: NextRequest) {
  const admin = await requireTesterAdmin(request);
  if (!admin.ok || !admin.service) {
    return NextResponse.json(
      { error: admin.error ?? "Unauthorized" },
      { status: admin.status ?? 401 },
    );
  }

  const status = request.nextUrl.searchParams.get("status") ?? "open";
  const limitRaw = Number(request.nextUrl.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.floor(limitRaw), 1), 100)
    : 50;

  let query = admin.service
    .from("support_requests")
    .select(
      "id, user_id, reply_email, category, subject, message, page_url, status, email_delivery_status, created_at, context",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const [supportRes, legacyRes] = await Promise.all([
    query,
    admin.service
      .from("app_bug_reports")
      .select("id, user_id, description, page_url, user_agent, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  if (supportRes.error) {
    return NextResponse.json({ error: "Failed to load requests" }, { status: 500 });
  }
  if (legacyRes.error) {
    return NextResponse.json(
      { error: "Failed to load legacy bug reports" },
      { status: 500 },
    );
  }

  const rows = (supportRes.data ?? []).map((row) => ({
    ...row,
    source: "support" as const,
  }));

  const legacyRows = (legacyRes.data ?? []).map((row) => {
    const parsed = parseLegacyDescription(String(row.description ?? ""));
    return {
      id: row.id,
      user_id: row.user_id,
      reply_email: parsed.reply_email ?? "",
      category: "legacy_help",
      subject: parsed.subject,
      message: parsed.message,
      page_url: row.page_url,
      status: "open",
      email_delivery_status: "n/a",
      created_at: row.created_at,
      context: row.user_agent ? { user_agent: row.user_agent } : null,
      source: "legacy_bug" as const,
      raw_description: row.description,
    };
  });

  return NextResponse.json({ rows, legacyRows });
}
