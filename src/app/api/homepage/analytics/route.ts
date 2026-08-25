import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireRouteUser } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const event = typeof body.event === "string" ? body.event : null;
    if (!event) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const { user } = await requireRouteUser(request);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase.from("homepage_analytics_events").insert({
      user_id: user?.id ?? null,
      event,
      properties: body.properties ?? {},
    });

    if (error) {
      console.error("[homepage/analytics] insert failed", {
        event,
        code: error.code,
        message: error.message,
      });
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[homepage/analytics]", err);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
