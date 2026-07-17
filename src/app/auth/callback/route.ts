/**
 * OAuth callback handler
 * Handles the redirect from Google OAuth and redirects user to intended page
 * With Supabase SSR, the session is automatically handled via cookies
 */

import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import {
  resolvePostAuthPath,
  sanitizeRedirectTo,
} from "@/lib/onboarding/redirect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirectTo = sanitizeRedirectTo(
    requestUrl.searchParams.get("redirectTo"),
  );
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription || error)}`, requestUrl.origin)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=missing_code", requestUrl.origin)
    );
  }

  try {
    const supabase = createRouteClient();
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
      );
    }

    if (!data.session) {
      return NextResponse.redirect(
        new URL("/login?error=no_session", requestUrl.origin)
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("username, onboarding_completed")
      .eq("id", data.session.user.id)
      .maybeSingle();

    const nextPath = resolvePostAuthPath(
      profile
        ? {
            username: profile.username,
            onboarding_completed: profile.onboarding_completed,
          }
        : null,
      redirectTo,
    );

    return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
  } catch (err) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(err instanceof Error ? err.message : "Unknown error")}`,
        requestUrl.origin
      )
    );
  }
}
