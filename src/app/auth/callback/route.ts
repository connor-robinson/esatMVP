/**
 * OAuth callback handler
 * Handles the redirect from Google OAuth and redirects user to intended page
 * With Supabase SSR, the session is automatically handled via cookies
 */

import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirectTo = requestUrl.searchParams.get("redirectTo") || "/past-papers/library";
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  // Handle OAuth errors
  if (error) {
    console.error("[auth] OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription || error)}`, requestUrl.origin)
    );
  }

  // Handle missing code
  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=missing_code", requestUrl.origin)
    );
  }

  try {
    const supabase = createRouteClient();
    
    // Exchange code for session - this sets cookies automatically with SSR
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("[auth] Exchange error:", exchangeError);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
      );
    }

    if (!data.session) {
      return NextResponse.redirect(
        new URL("/login?error=no_session", requestUrl.origin)
      );
    }

    // Success - redirect to intended page
    // The session is now stored in cookies and will be available on the next page
    return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
  } catch (err) {
    console.error("[auth] Callback error:", err);
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(err instanceof Error ? err.message : "Unknown error")}`,
        requestUrl.origin
      )
    );
  }
}

