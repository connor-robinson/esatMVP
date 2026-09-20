import { NextRequest, NextResponse } from "next/server";
import { requireTesterAdmin } from "@/lib/tester/admin";
import {
  getCampaignAbStats,
  getCampaignEngagementByIds,
  getCampaignLinkClickStats,
  getProductEmailEngagementStats,
  ratePercent,
} from "@/lib/email/tracking";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await requireTesterAdmin(request);
  if (!admin.ok || !admin.service) {
    return NextResponse.json(
      { error: admin.error },
      { status: admin.status ?? 403 },
    );
  }

  const campaignId = request.nextUrl.searchParams.get("campaignId")?.trim();

  try {
    if (campaignId) {
      const [{ data: campaign }, engagementMap, links, ab] = await Promise.all([
        admin.service
          .from("product_email_campaigns")
          .select(
            "id, subject, subject_b, body, recipient_count, sent_count, failed_count, status, created_at",
          )
          .eq("id", campaignId)
          .maybeSingle(),
        getCampaignEngagementByIds(admin.service, [campaignId]),
        getCampaignLinkClickStats(admin.service, campaignId),
        getCampaignAbStats(admin.service, campaignId),
      ]);

      if (!campaign) {
        return NextResponse.json(
          { error: "Campaign not found" },
          { status: 404 },
        );
      }

      const e = engagementMap[campaignId];
      const sent = Number(campaign.sent_count ?? 0);

      return NextResponse.json({
        campaign: {
          ...campaign,
          open_count: e?.openCount ?? 0,
          unique_openers: e?.uniqueOpeners ?? 0,
          click_count: e?.clickCount ?? 0,
          unique_clickers: e?.uniqueClickers ?? 0,
          unsubscribe_count: e?.unsubscribeCount ?? 0,
          open_rate: ratePercent(e?.uniqueOpeners ?? 0, sent),
          click_rate: ratePercent(e?.uniqueClickers ?? 0, sent),
          click_to_open_rate: ratePercent(
            e?.uniqueClickers ?? 0,
            e?.uniqueOpeners ?? 0,
          ),
        },
        links,
        ab,
      });
    }

    const [engagement, campaignsRes] = await Promise.all([
      getProductEmailEngagementStats(admin.service),
      admin.service
        .from("product_email_campaigns")
        .select(
          "id, subject, subject_b, recipient_count, sent_count, failed_count, status, created_at",
        )
        .neq("status", "dry_run")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const campaigns = campaignsRes.data ?? [];
    const byCampaign = await getCampaignEngagementByIds(
      admin.service,
      campaigns.map((c) => String(c.id)),
    );

    const abByCampaign = await Promise.all(
      campaigns.map(async (c) => {
        const id = String(c.id);
        if (!c.subject_b) return [id, null] as const;
        return [id, await getCampaignAbStats(admin.service!, id)] as const;
      }),
    );
    const abMap = Object.fromEntries(abByCampaign);

    const campaignsWithRates = campaigns.map((c) => {
      const id = String(c.id);
      const e = byCampaign[id];
      const sent = Number(c.sent_count ?? 0);
      return {
        ...c,
        open_count: e?.openCount ?? 0,
        unique_openers: e?.uniqueOpeners ?? 0,
        click_count: e?.clickCount ?? 0,
        unique_clickers: e?.uniqueClickers ?? 0,
        unsubscribe_count: e?.unsubscribeCount ?? 0,
        open_rate: ratePercent(e?.uniqueOpeners ?? 0, sent),
        click_rate: ratePercent(e?.uniqueClickers ?? 0, sent),
        click_to_open_rate: ratePercent(
          e?.uniqueClickers ?? 0,
          e?.uniqueOpeners ?? 0,
        ),
        ab: abMap[id] ?? null,
      };
    });

    return NextResponse.json({
      engagement: {
        ...engagement,
        open_rate: ratePercent(
          engagement.uniqueOpeners,
          engagement.emailsSent,
        ),
        click_rate: ratePercent(
          engagement.uniqueClickers,
          engagement.emailsSent,
        ),
      },
      campaigns: campaignsWithRates,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
