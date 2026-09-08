import { NextRequest, NextResponse } from "next/server";
import { requireTesterAdmin } from "@/lib/tester/admin";
import { createFeedbackReferralServiceClient } from "@/lib/feedbackReferral/service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await requireTesterAdmin(request);
  if (!admin.ok) {
    return NextResponse.json(
      { error: admin.error ?? "Forbidden" },
      { status: admin.status ?? 403 },
    );
  }

  const service = createFeedbackReferralServiceClient();
  const { data: codes, error } = await service
    .from("feedback_referral_codes")
    .select(
      "code, user_id, redeemed_at, redeemed_by_user_id, created_at, checkout_session_id",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const userIds = Array.from(
    new Set(
      (codes ?? []).flatMap((row) =>
        [row.user_id, row.redeemed_by_user_id].filter(Boolean),
      ),
    ),
  ) as string[];

  const { data: profiles } = userIds.length
    ? await service
        .from("profiles")
        .select("id, email, username")
        .in("id", userIds)
    : { data: [] as Array<{ id: string; email: string | null; username: string | null }> };

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p]),
  );

  return NextResponse.json({
    rows: (codes ?? []).map((row) => ({
      code: row.code,
      createdAt: row.created_at,
      redeemedAt: row.redeemed_at,
      ownerEmail: profileMap.get(row.user_id)?.email ?? null,
      ownerUsername: profileMap.get(row.user_id)?.username ?? null,
      redeemedByEmail: row.redeemed_by_user_id
        ? profileMap.get(row.redeemed_by_user_id)?.email ?? null
        : null,
    })),
  });
}
