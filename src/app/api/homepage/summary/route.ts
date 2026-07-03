import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireRouteUser } from "@/lib/supabase/auth";
import {
  fetchHomepageSummary,
  fetchTesterStateForHomepage,
} from "@/lib/homepage/serverSummary";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireRouteUser(request);
    if (error || !user) {
      return NextResponse.json({ summary: null }, { status: 200 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const [summary, tester] = await Promise.all([
      fetchHomepageSummary(supabase, user.id),
      fetchTesterStateForHomepage(supabase, user.id),
    ]);

    return NextResponse.json({ summary, tester });
  } catch {
    return NextResponse.json(
      { summary: null, error: "Failed to load homepage summary" },
      { status: 200 },
    );
  }
}
