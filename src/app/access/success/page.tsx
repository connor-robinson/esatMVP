"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { APP_ROUTES } from "@/lib/seo/config";
import { CALIBRATION_ROUTES } from "@/lib/calibration/constants";
import { trackEvent } from "@/lib/ga/trackEvent";
import { PARTNER_REDEEM_TRACK_COOKIE } from "@/lib/partners/types";

function formatAccessEnd(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function readTrackCookie(): {
  partner: string;
  accessEnd: string;
  batch: string;
} | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${PARTNER_REDEEM_TRACK_COOKIE}=`));
  if (!match) return null;
  const raw = decodeURIComponent(match.slice(PARTNER_REDEEM_TRACK_COOKIE.length + 1));
  const [partner, accessEnd, batch] = raw.split("|");
  if (!partner) return null;
  return { partner, accessEnd: accessEnd || "", batch: batch || "" };
}

function clearTrackCookie() {
  document.cookie = `${PARTNER_REDEEM_TRACK_COOKIE}=; Path=/access; Max-Age=0; SameSite=Lax`;
}

export default function AccessSuccessPage() {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const track = readTrackCookie();
    if (track) {
      trackEvent("partner_invite_redeemed", {
        partner: track.partner,
        batch: track.batch || undefined,
        access_end: track.accessEnd || undefined,
      });
      clearTrackCookie();
    }

    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/subscription/status", {
          cache: "no-store",
        });
        const data = await res.json();
        if (!mounted) return;
        setHasAccess(Boolean(data.hasFullAccess));
        setDisplayName(data.partnerDisplayName ?? null);
        setEndsAt(data.accessUntil ?? null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="min-h-[70vh] py-16">
      <Container size="sm">
        {loading ? (
          <p className="text-stone-500">Confirming your access…</p>
        ) : hasAccess ? (
          <>
            <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
              Your complimentary ESAT Camp access is active
            </h1>
            <p className="mt-4 text-stone-600">
              {displayName
                ? `You're accessing ESAT Camp through the ${displayName} programme.`
                : "You're accessing ESAT Camp through an institution programme."}
            </p>
            {endsAt && (
              <p className="mt-2 text-stone-600">
                Full access available until {formatAccessEnd(endsAt)}.
              </p>
            )}
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href={CALIBRATION_ROUTES.hub}
                className="inline-flex justify-center rounded-lg bg-stone-900 px-5 py-3 text-sm font-medium text-white"
              >
                Start your calibration
              </Link>
              <Link
                href={APP_ROUTES.questionBank}
                className="inline-flex justify-center rounded-lg bg-stone-100 px-5 py-3 text-sm font-medium text-stone-900"
              >
                Explore the question bank
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
              Access not found
            </h1>
            <p className="mt-4 text-stone-600">
              We could not confirm an active institution entitlement on this
              account. If you have a code, redeem it from the access page.
            </p>
            <Link
              href="/access"
              className="mt-8 inline-flex rounded-lg bg-stone-900 px-5 py-3 text-sm font-medium text-white"
            >
              Enter access code
            </Link>
          </>
        )}
      </Container>
    </main>
  );
}
