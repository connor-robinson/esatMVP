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
    
    // Record checkout attempt
    const { error } = await supabase
      .from('checkout_attempts')
      .insert({
        user_id: userId,
        anon_id: anonId,
        variant,
        plan_type: body.plan_type,
        utm_source: body.utm_source,
        utm_medium: body.utm_medium,
        utm_campaign: body.utm_campaign,
        referrer: body.referrer,
      });
    
    if (error) {
      console.error('[track-attempt] insert failed', error);
      return NextResponse.json({ error: "Failed to track attempt" }, { status: 500 });
    }
    
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[track-attempt]', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
