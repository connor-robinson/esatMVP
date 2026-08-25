import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireRouteUser } from "@/lib/supabase/auth";
import {
  sanitizeAnonId,
  sanitizeGaClientId,
} from "@/lib/attribution/capture";

export const dynamic = "force-dynamic";

/**
 * POST /api/attribution/merge
 * Authed: link anon first-touch to user and copy onto profiles if empty.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await requireRouteUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const anonId = sanitizeAnonId(
      typeof body.anon_id === "string" ? body.anon_id : null,
    );
    if (!anonId) {
      return NextResponse.json({ ok: false, error: "invalid_anon_id" }, { status: 400 });
    }

    const gaClientId = sanitizeGaClientId(
      typeof body.ga_client_id === "string" ? body.ga_client_id : null,
    );

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      console.error("[attribution/merge] missing Supabase env");
      return NextResponse.json({ ok: false }, { status: 503 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const now = new Date().toISOString();

    const { data: visit, error: visitError } = await supabase
      .from("attribution_visits")
      .select(
        "anon_id, first_landing_page, referrer, utm_source, utm_medium, utm_campaign, gclid, ga_client_id, first_touch_at, user_id",
      )
      .eq("anon_id", anonId)
      .maybeSingle();

    if (visitError) {
      console.error("[attribution/merge] visit lookup failed", visitError.message);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    if (visit) {
      const visitUpdate: Record<string, unknown> = {
        user_id: user.id,
        merged_at: now,
        updated_at: now,
      };
      if (gaClientId && !visit.ga_client_id) {
        visitUpdate.ga_client_id = gaClientId;
      }
      const { error: linkError } = await supabase
        .from("attribution_visits")
        .update(visitUpdate)
        .eq("anon_id", anonId);
      if (linkError) {
        console.error("[attribution/merge] visit link failed", linkError.message);
        return NextResponse.json({ ok: false }, { status: 500 });
      }
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, first_touch_at, ga_client_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("[attribution/merge] profile lookup failed", profileError.message);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ ok: true, merged: false, reason: "no_profile" });
    }

    const profileUpdate: Record<string, unknown> = {};
    if (gaClientId) {
      profileUpdate.ga_client_id = gaClientId;
    } else if (visit?.ga_client_id && !profile.ga_client_id) {
      profileUpdate.ga_client_id = visit.ga_client_id;
    }

    // First-touch snapshot only if never set.
    if (!profile.first_touch_at && visit) {
      profileUpdate.attribution_anon_id = visit.anon_id;
      profileUpdate.first_landing_page = visit.first_landing_page;
      profileUpdate.first_referrer = visit.referrer;
      profileUpdate.first_utm_source = visit.utm_source;
      profileUpdate.first_utm_medium = visit.utm_medium;
      profileUpdate.first_utm_campaign = visit.utm_campaign;
      profileUpdate.first_gclid = visit.gclid;
      profileUpdate.first_touch_at = visit.first_touch_at;
    } else if (!profile.first_touch_at) {
      profileUpdate.attribution_anon_id = anonId;
    }

    if (Object.keys(profileUpdate).length > 0) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update(profileUpdate)
        .eq("id", user.id);
      if (updateError) {
        console.error("[attribution/merge] profile update failed", updateError.message);
        return NextResponse.json({ ok: false }, { status: 500 });
      }
    }

    return NextResponse.json({
      ok: true,
      merged: Boolean(visit),
      first_touch_copied: Boolean(!profile.first_touch_at && visit),
    });
  } catch (err) {
    console.error("[attribution/merge]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
