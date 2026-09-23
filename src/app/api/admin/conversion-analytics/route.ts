import { NextRequest, NextResponse } from "next/server";
import { requireTesterAdmin } from "@/lib/tester/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await requireTesterAdmin(request);
  if (!admin.ok || !admin.service) {
    return NextResponse.json({ error: admin.error }, { status: admin.status ?? 403 });
  }

  try {
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '90', 10);
    
    // Get conversion funnel data
    const { data: funnelData, error: funnelError } = await admin.service
      .from('pricing_conversion_funnel')
      .select('*');
    
    if (funnelError) {
      console.error('[conversion-analytics] funnel query failed', funnelError);
      return NextResponse.json({ error: "Failed to load funnel data" }, { status: 500 });
    }
    
    // Get attribution sources
    const { data: attributionData, error: attributionError } = await admin.service
      .from('attribution_sources_summary')
      .select('*')
      .order('total_users', { ascending: false })
      .limit(20);
    
    if (attributionError) {
      console.error('[conversion-analytics] attribution query failed', attributionError);
      return NextResponse.json({ error: "Failed to load attribution data" }, { status: 500 });
    }
    
    const now = new Date();
    const since = new Date(now);
    since.setDate(since.getDate() - days);
    
    return NextResponse.json({
      funnel: funnelData || [],
      attribution: attributionData || [],
      timeRange: `${since.toISOString().split('T')[0]} to ${now.toISOString().split('T')[0]}`,
    });
  } catch (err) {
    console.error('[conversion-analytics]', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
