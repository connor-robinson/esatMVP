import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";

/**
 * Optional warm/refresh endpoint for homepage social-proof stats.
 * Secure with CRON_SECRET when calling from Vercel Cron.
 * See vercel.json for the three-hour schedule.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  revalidateTag("homepage-social-proof");
  return NextResponse.json({
    ok: true,
    revalidated: true,
    tag: "homepage-social-proof",
  });
}
