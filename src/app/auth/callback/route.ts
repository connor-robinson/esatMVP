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
  const redirectTo = requestUrl.searchParams.get("redirectTo") || "/papers/library";
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
    console.log("[auth/callback] Starting OAuth callback processing");
    const supabase = createRouteClient();
    
    console.log("[auth/callback] Exchanging code for session...");
    // Exchange code for session - this sets cookies automatically with SSR
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("[auth/callback] Exchange error:", {
        message: exchangeError.message,
        status: exchangeError.status,
        name: exchangeError.name,
        fullError: JSON.stringify(exchangeError, null, 2)
      });
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
      );
    }

    console.log("[auth/callback] Session exchange successful", {
      hasSession: !!data.session,
      hasUser: !!data.user,
      userId: data.user?.id
    });

    if (!data.session) {
      console.error("[auth/callback] No session in response");
      return NextResponse.redirect(
        new URL("/login?error=no_session", requestUrl.origin)
      );
    }

    console.log("[auth/callback] Successfully authenticated, redirecting to:", redirectTo);
    // Success - redirect to intended page
    // The session is now stored in cookies and will be available on the next page
    return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
  } catch (err) {
    console.error("[auth/callback] Unexpected error:", {
      error: err,
      message: err instanceof Error ? err.message : "Unknown error",
      stack: err instanceof Error ? err.stack : undefined
    });
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(err instanceof Error ? err.message : "Unknown error")}`,
        requestUrl.origin
      )
    );
  }
}

