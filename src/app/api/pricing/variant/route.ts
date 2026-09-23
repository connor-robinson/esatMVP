import { NextRequest, NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";
import { createTesterServiceClient } from "@/lib/tester/service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireRouteUser(request);
    const supabase = createTesterServiceClient();
    
    const url = new URL(request.url);
    const anonId = url.searchParams.get('anon_id');
    
    if (!user?.id && !anonId) {
      return NextResponse.json({ error: "Missing user_id or anon_id" }, { status: 400 });
    }
    
    // Call the database function to get or assign variant
    const { data, error } = await supabase
      .rpc('get_or_assign_pricing_variant', {
        p_user_id: user?.id || null,
        p_anon_id: anonId || null,
      });
    
    if (error) {
      console.error('[get-variant] RPC failed', error);
      return NextResponse.json({ error: "Failed to get variant" }, { status: 500 });
    }
    
    return NextResponse.json({ variant: data });
  } catch (err) {
    console.error('[get-variant]', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { user } = await requireRouteUser(request);
    const supabase = createTesterServiceClient();
    
    const anonId = body.anon_id;
    
    if (!user?.id && !anonId) {
      return NextResponse.json({ error: "Missing user_id or anon_id" }, { status: 400 });
    }
    
    // Sync cookie variant to database when user signs up
    if (user?.id && anonId && body.variant) {
      // Check if user already has a variant assignment
      const { data: existing } = await supabase
        .from('pricing_variant_assignments')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!existing) {
        // Copy anon variant to user account
        const { error } = await supabase
          .from('pricing_variant_assignments')
          .insert({
            user_id: user.id,
            variant: body.variant,
            source: 'account'
          });
        
        if (error) {
          console.error('[sync-variant] insert failed', error);
        }
      }
    }
    
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[sync-variant]', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
