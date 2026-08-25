import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseFirstTouchBody } from "@/lib/attribution/capture";

export const dynamic = "force-dynamic";

/**
 * POST /api/attribution/first-touch
 * Public: stores immutable first-touch for an anon_id (insert-only).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const payload = parseFirstTouchBody(body);
    if (!payload) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      console.error("[attribution/first-touch] missing Supabase env");
      return NextResponse.json({ ok: false }, { status: 503 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const { error } = await supabase.from("attribution_visits").insert({
      anon_id: payload.anon_id,
      first_landing_page: payload.first_landing_page,
      referrer: payload.referrer,
      utm_source: payload.utm_source,
      utm_medium: payload.utm_medium,
      utm_campaign: payload.utm_campaign,
      gclid: payload.gclid,
      ga_client_id: payload.ga_client_id,
      first_touch_at: payload.first_touch_at,
    });

    if (error) {
      // Unique violation = already captured; treat as success (immutable).
      if (error.code === "23505") {
        return NextResponse.json({ ok: true, already_exists: true });
      }
      console.error("[attribution/first-touch] insert failed", {
        code: error.code,
        message: error.message,
      });
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[attribution/first-touch]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
