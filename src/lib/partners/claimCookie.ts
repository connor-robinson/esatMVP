import type { NextResponse } from "next/server";
import {
  PARTNER_CLAIM_COOKIE,
  PARTNER_CLAIM_COOKIE_MAX_AGE,
  PARTNER_REDEEM_TRACK_COOKIE,
} from "./types";

export function partnerClaimCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/access",
    maxAge: PARTNER_CLAIM_COOKIE_MAX_AGE,
  };
}

export function setPartnerClaimCookie(
  response: NextResponse,
  rawToken: string,
  secure: boolean,
): void {
  response.cookies.set(
    PARTNER_CLAIM_COOKIE,
    rawToken,
    partnerClaimCookieOptions(secure),
  );
}

export function clearPartnerClaimCookie(
  response: NextResponse,
  secure: boolean,
): void {
  response.cookies.set(PARTNER_CLAIM_COOKIE, "", {
    ...partnerClaimCookieOptions(secure),
    maxAge: 0,
  });
}

export function readPartnerClaimCookie(
  cookieHeader: string | null,
): string | null {
  return readNamedCookie(cookieHeader, PARTNER_CLAIM_COOKIE);
}

/** Payload: partnerSlug|accessEndDate|batchLabel (no tokens). */
export function setPartnerRedeemTrackCookie(
  response: NextResponse,
  payload: { partnerSlug: string; accessEnd: string; batchLabel: string | null },
  secure: boolean,
): void {
  const value = [
    payload.partnerSlug,
    payload.accessEnd.slice(0, 10),
    payload.batchLabel ?? "",
  ].join("|");
  response.cookies.set(PARTNER_REDEEM_TRACK_COOKIE, value, {
    httpOnly: false,
    secure,
    sameSite: "lax",
    path: "/access",
    maxAge: 5 * 60,
  });
}

export function clearPartnerRedeemTrackCookie(
  response: NextResponse,
  secure: boolean,
): void {
  response.cookies.set(PARTNER_REDEEM_TRACK_COOKIE, "", {
    httpOnly: false,
    secure,
    sameSite: "lax",
    path: "/access",
    maxAge: 0,
  });
}

function readNamedCookie(
  cookieHeader: string | null,
  name: string,
): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((p) => p.trim());
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq) !== name) continue;
    const value = decodeURIComponent(part.slice(eq + 1));
    return value || null;
  }
  return null;
}
