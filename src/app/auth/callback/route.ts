/**
 * OAuth + email confirmation + password-recovery callback.
 * Exchanges PKCE `code` (and token_hash OTP) for a session, then redirects.
 */

import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createCallbackClient } from "@/lib/supabase/server";
import {
  resolvePostAuthPath,
  sanitizeRedirectTo,
} from "@/lib/onboarding/redirect";
import {
  isPasswordRecoveryNext,
  recoveryCookieOptions,
  PASSWORD_RECOVERY_COOKIE,
} from "@/lib/auth/recovery";
import { RESET_PASSWORD_PATH } from "@/lib/auth/urls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

function loginErrorUrl(origin: string, message: string) {
  return new URL(`/login?error=${encodeURIComponent(message)}`, origin);
}

function resetErrorUrl(origin: string, message: string) {
  return new URL(
    `/login/forgot?error=${encodeURIComponent(message)}`,
    origin,
  );
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const typeParam = requestUrl.searchParams.get("type");
  const otpType = OTP_TYPES.has(typeParam as EmailOtpType)
    ? (typeParam as EmailOtpType)
    : null;
  const next = requestUrl.searchParams.get("next");
  const redirectTo = sanitizeRedirectTo(
    requestUrl.searchParams.get("redirectTo") ||
      (isPasswordRecoveryNext(next) ? "/" : next),
  );
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const isRecovery =
    otpType === "recovery" || isPasswordRecoveryNext(next);

  if (error) {
    const target = isRecovery
      ? resetErrorUrl(origin, errorDescription || error)
      : loginErrorUrl(origin, errorDescription || error);
    return NextResponse.redirect(target);
  }

  if (!code && !(tokenHash && otpType)) {
    return NextResponse.redirect(loginErrorUrl(origin, "missing_code"));
  }

  const placeholder = NextResponse.redirect(new URL("/", origin));
  const supabase = createCallbackClient(request, placeholder);

  try {
    if (code) {
      const { data, error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        const target = isRecovery
          ? resetErrorUrl(origin, exchangeError.message)
          : loginErrorUrl(origin, exchangeError.message);
        return NextResponse.redirect(target);
      }
      if (!data.session) {
        const target = isRecovery
          ? resetErrorUrl(origin, "This reset link is invalid or has expired.")
          : loginErrorUrl(origin, "no_session");
        return NextResponse.redirect(target);
      }
    } else if (tokenHash && otpType) {
      const { error: otpError } = await supabase.auth.verifyOtp({
        type: otpType,
        token_hash: tokenHash,
      });
      if (otpError) {
        const target =
          otpType === "recovery"
            ? resetErrorUrl(origin, otpError.message)
            : loginErrorUrl(origin, otpError.message);
        return NextResponse.redirect(target);
      }
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      const target = isRecovery
        ? resetErrorUrl(origin, "This reset link is invalid or has expired.")
        : loginErrorUrl(origin, "no_session");
      return NextResponse.redirect(target);
    }

    if (isRecovery) {
      const response = NextResponse.redirect(
        new URL(RESET_PASSWORD_PATH, origin),
      );
      copyCookies(placeholder, response);
      response.cookies.set(
        PASSWORD_RECOVERY_COOKIE,
        "1",
        recoveryCookieOptions(origin.startsWith("https://")),
      );
      return response;
    }

    const isGoogle =
      session.user.app_metadata?.provider === "google" ||
      session.user.identities?.some((identity) => identity.provider === "google");
    if (isGoogle) {
      await supabase
        .from("profiles")
        .update({ full_name: null, avatar_url: null } as never)
        .eq("id", session.user.id);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("username, onboarding_completed")
      .eq("id", session.user.id)
      .maybeSingle() as {
        data: {
          username: string | null;
          onboarding_completed: boolean | null;
        } | null;
      };

    const nextPath = resolvePostAuthPath(
      profile
        ? {
            username: profile.username,
            onboarding_completed: profile.onboarding_completed,
          }
        : null,
      redirectTo,
    );

    const response = NextResponse.redirect(new URL(nextPath, origin));
    copyCookies(placeholder, response);
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const target = isRecovery
      ? resetErrorUrl(origin, message)
      : loginErrorUrl(origin, message);
    return NextResponse.redirect(target);
  }
}

function copyCookies(from: NextResponse, to: NextResponse) {
  const cookies = from.headers.getSetCookie?.() ?? [];
  for (const cookie of cookies) {
    to.headers.append("Set-Cookie", cookie);
  }
}
