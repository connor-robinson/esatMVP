/**
 * Email OTP confirmation (signup / recovery) using token_hash from custom templates.
 * Default Supabase emails still go through /auth/callback with a PKCE code.
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const dest = new URL("/auth/callback", url.origin);
  url.searchParams.forEach((value, key) => {
    dest.searchParams.set(key, value);
  });
  return NextResponse.redirect(dest);
}
