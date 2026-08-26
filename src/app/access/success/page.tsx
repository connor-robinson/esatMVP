"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { APP_ROUTES } from "@/lib/seo/config";
import { trackEvent } from "@/lib/ga/trackEvent";
import {
  complimentaryAccessEndIso,
  formatPartnerAccessDate,
} from "@/lib/partners/dates";
import { PARTNER_REDEEM_TRACK_COOKIE } from "@/lib/partners/types";
import {
  AccessOutcomeCard,
  ACCESS_CTA,
  ACCESS_CTA_SECONDARY,
  AccessTextLink,
} from "@/components/partners/AccessOutcomeCard";

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
  const raw = decodeURIComponent(
    match.slice(PARTNER_REDEEM_TRACK_COOKIE.length + 1),
  );
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
        setEndsAt(
          complimentaryAccessEndIso({
            partnerEndsAt: data.partnerEndsAt,
            accessUntil: data.accessUntil,
            source: data.source,
          }),
        );
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <AccessOutcomeCard
        eyebrow="ESAT Camp"
        title="Confirming your access"
        loading
        loadingLabel="Confirming your access…"
        testId="access-success"
      >
        <p />
      </AccessOutcomeCard>
    );
  }

  if (!hasAccess) {
    return (
      <AccessOutcomeCard
        eyebrow="Access"
        title="We couldn't confirm your access"
        tone="error"
        testId="access-success"
        actions={
          <Link href="/access" className={ACCESS_CTA}>
            Enter access code
          </Link>
        }
      >
      <p className="text-text-muted">
          No active institution entitlement was found on this account. If you
          have a code from your school or programme, redeem it below.
        </p>
      </AccessOutcomeCard>
    );
  }

  return (
    <AccessOutcomeCard
      eyebrow="Programme access"
      title="Success 🎉 You now have full access to ESAT Camp"
      tone="success"
      testId="access-success"
      actions={
        <>
          <Link href={APP_ROUTES.calibration} className={ACCESS_CTA}>
            Try calibration test
          </Link>
          <Link href={APP_ROUTES.questionBank} className={ACCESS_CTA_SECONDARY}>
            Explore the question bank
          </Link>
          <AccessTextLink href={APP_ROUTES.dashboard}>
            Go to dashboard
          </AccessTextLink>
        </>
      }
    >
      <p className="text-text-muted">
        {displayName
          ? `You're accessing ESAT Camp through the ${displayName} programme.`
          : "You're accessing ESAT Camp through an institution programme."}
      </p>
      {endsAt ? (
        <p className="text-text-muted">
          Full access available until {formatPartnerAccessDate(endsAt)}.
        </p>
      ) : null}
      <p className="text-text-muted">
        Start with a short calibration to see where you stand, or jump straight
        into practice.
      </p>
    </AccessOutcomeCard>
  );
}
