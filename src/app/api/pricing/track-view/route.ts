import { NextRequest, NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";
import { createTesterServiceClient } from "@/lib/tester/service";
import { parseVariant } from "@/lib/pricing/abTest";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { user } = await requireRouteUser(request);
    
    const supabase = createTesterServiceClient();
    
    const variant = parseVariant(body.variant);
    if (!variant) {
      return NextResponse.json({ error: "Invalid variant" }, { status: 400 });
    }
    
    const userId = user?.id || body.user_id || null;
    const anonId = body.anon_id || null;
    
    if (!userId && !anonId) {
      return NextResponse.json({ error: "Missing user_id or anon_id" }, { status: 400 });
    }
    
    // Record pricing view
    const { error: viewError } = await supabase
      .from('pricing_views')
      .insert({
        user_id: userId,
        anon_id: anonId,
        variant,
        referrer: body.referrer,
        utm_source: body.utm_source,
        utm_medium: body.utm_medium,
        utm_campaign: body.utm_campaign,
        utm_content: body.utm_content,
        utm_term: body.utm_term,
        gclid: body.gclid,
        landing_page: body.landing_page,
      });
    
    if (viewError) {
      console.error('[track-view] insert failed', viewError);
      return NextResponse.json({ error: "Failed to track view" }, { status: 500 });
    }
    
    // Update or create user attribution
    if (userId || anonId) {
      const { error: attrError } = await supabase.rpc('upsert_user_attribution', {
        p_user_id: userId,
        p_anon_id: anonId,
        p_landing_page: body.landing_page,
        p_referrer: body.referrer,
        p_utm_source: body.utm_source,
        p_utm_medium: body.utm_medium,
        p_utm_campaign: body.utm_campaign,
        p_utm_content: body.utm_content,
        p_utm_term: body.utm_term,
        p_gclid: body.gclid,
      });
      
      if (attrError) {
        console.error('[track-view] attribution upsert failed', attrError);
      }
    }
    
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[track-view]', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
