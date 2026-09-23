"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { PricingTable, type PricingTier } from "@/components/ui";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { useSubscription } from "@/hooks/useSubscription";
import {
  formatGbpPrice,
  getSeasonPassPrice,
  getWeeksUntilExam,
  MONTHLY_LIST_PRICE_GBP,
  MONTHLY_PRICE_GBP,
  SEASON_PASS_ACCESS_UNTIL,
  SEASON_PASS_ACCESS_UNTIL_LABEL,
  type PlanId,
} from "@/lib/stripe/best-value";
import { VARIANT_CONFIGS, type PricingVariant } from "@/lib/pricing/abTest";
import {
  buildCheckoutSignupUrl,
  isPaidPlanId,
  type PaidPlanId,
} from "@/lib/pricing/checkoutAuth";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  currentGaPath,
  readGaSourcePage,
  rememberGaSourcePage,
  trackEvent,
  trackEventOnce,
  captureGaCheckoutAttribution,
} from "@/lib/ga";
import { OWN_REFERRAL_CODE_MESSAGE } from "@/lib/feedbackReferral/codes";

const FEATURES = {
  free: [
    "5 free mocks",
    "Addition mental maths",
    "Sit any past paper",
    "10 questions per subject",
  ],
  paid: [
    "In-depth mock analysis",
    "Full mental maths",
    "Unlimited question bank",
    "Solutions, review, and stats",
    "Drills and flashcards",
  ],
};

const LOCAL_VARIANTS: PricingVariant[] = [
  "3day_original",
  "3day_discounted",
  "nodeal_original",
  "nodeal_discounted",
];

function daysUntilEsat(): number {
  const diff = SEASON_PASS_ACCESS_UNTIL.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

function LocalPricingVariants() {
  const days = daysUntilEsat();

  return (
    <section className="mb-8">
      <p className="text-center text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
        Localhost preview
      </p>
      <h2 className="mt-2 text-center font-heading text-xl font-semibold text-text">
        {days} days until the ESAT
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-center text-sm text-text-muted">
        Four monthly offers, shown only while you are on localhost.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {LOCAL_VARIANTS.map((id) => {
          const config = VARIANT_CONFIGS[id];
          const discounted = config.monthlyPriceGbp < MONTHLY_PRICE_GBP;
          return (
            <article
              key={id}
              className="rounded-organic-xl bg-surface-elevated px-5 py-5"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                {config.trialDays > 0
                  ? `${config.trialDays}-day free trial`
                  : "Pay today"}
              </p>
              <p className="mt-3 text-sm font-medium text-text">
                {days} days until the ESAT
              </p>
              <div className="mt-3 flex flex-wrap items-baseline gap-x-2">
                {discounted ? (
                  <span className="text-base font-semibold text-text-subtle line-through">
                    {formatGbpPrice(MONTHLY_PRICE_GBP)}
                  </span>
                ) : null}
                <span className="text-3xl font-bold tracking-tight text-text">
                  {formatGbpPrice(config.monthlyPriceGbp)}
                </span>
                <span className="text-sm text-text-muted">/month</span>
              </div>
              <p className="mt-3 text-sm leading-snug text-text-muted">
                {discounted
                  ? "Reduced while you prepare for the ESAT."
                  : "Standard monthly price."}
                {config.trialDays > 0
                  ? " Card required. Cancel anytime."
                  : " Access starts straight away."}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

const PAID_RECURRING = new Set(["weekly", "monthly"]);

type FriendCodeStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "valid"; code: string }
  | {
      state: "invalid";
      code: string;
      message: string;
      reason: "already_used" | "own_code" | "not_found" | "verify_failed";
    };

function formatPeriodEnd(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function friendCodeInvalidFromReason(code: string, reason: string | undefined): Extract<
  FriendCodeStatus,
  { state: "invalid" }
> {
  if (reason === "already_used") {
    return {
      state: "invalid",
      code,
      reason: "already_used",
      message: "This friend code has already been used.",
    };
  }
  if (reason === "own_code") {
    return {
      state: "invalid",
      code,
      reason: "own_code",
      message: OWN_REFERRAL_CODE_MESSAGE,
    };
  }
  return {
    state: "invalid",
    code,
    reason: "not_found",
    message: "This friend code is not valid.",
  };
}

export default function PricingPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useSupabaseSession();
  const {
    tier,
    hasFullAccess,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    pendingPlan,
    source,
  } = useSubscription();
  const [loading, setLoading] = useState<string | null>(null);
  const showVariantPreview = process.env.NODE_ENV === "development";
  const [banner, setBanner] = useState<string | null>(null);
  const [manualCodeInput, setManualCodeInput] = useState("");
  const [friendCodeStatus, setFriendCodeStatus] = useState<FriendCodeStatus>({
    state: "idle",
  });
  const autoCheckoutStarted = useRef(false);

  const seasonPrice = getSeasonPassPrice();
  const perWeekSeason = seasonPrice / getWeeksUntilExam();
  const monthlyPriceLabel = formatGbpPrice(MONTHLY_PRICE_GBP);
  const monthlyListPriceLabel = formatGbpPrice(MONTHLY_LIST_PRICE_GBP);
  const periodEndLabel = formatPeriodEnd(currentPeriodEnd);
  const isRecurringPaid = PAID_RECURRING.has(tier);
  const isSeasonPass = tier === "season_pass";
  const isPartnerAccess = tier === "partner" || source === "partner";
  const fromSettings = searchParams.get("from") === "settings";
  const codeFromUrl = searchParams.get("code")?.trim().toUpperCase() ?? "";
  const validFriendCode =
    friendCodeStatus.state === "valid" ? friendCodeStatus.code : null;
  const hasFriendCode = Boolean(validFriendCode);
  const isOwnReferralCode =
    friendCodeStatus.state === "invalid" &&
    friendCodeStatus.reason === "own_code";
  const ownReferralBlocked = isOwnReferralCode;

  useEffect(() => {
    const sourcePage = readGaSourcePage() ?? currentGaPath() ?? "/pricing";
    rememberGaSourcePage(sourcePage);
    trackEventOnce("pricing_viewed", "pricing_viewed", {
      source_page: sourcePage,
    });
  }, []);

  useEffect(() => {
    if (!codeFromUrl) {
      setFriendCodeStatus({ state: "idle" });
      return;
    }

    let cancelled = false;
    setFriendCodeStatus({ state: "checking" });

    void (async () => {
      try {
        const res = await fetch(
          `/api/feedback-referral/validate?code=${encodeURIComponent(codeFromUrl)}`,
        );
        const data = (await res.json().catch(() => ({}))) as {
          valid?: boolean;
          code?: string;
          reason?: string;
        };
        if (cancelled) return;
        if (data.valid && data.code) {
          setFriendCodeStatus({ state: "valid", code: data.code });
          return;
        }
        setFriendCodeStatus(
          friendCodeInvalidFromReason(codeFromUrl, data.reason),
        );
      } catch {
        if (cancelled) return;
        setFriendCodeStatus({
          state: "invalid",
          code: codeFromUrl,
          reason: "verify_failed",
          message: "Could not verify this friend code. Try again.",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [codeFromUrl, session?.user?.id]);

  const paidCta = (planId: "weekly" | "monthly" | "season_pass", loadingLabel: string) => {
    if (loading === planId) return "Loading…";
    if (isPartnerAccess) return "Included with your access";
    if (tier === planId) return "Current plan";

    if (isSeasonPass) {
      return "Available after pass ends";
    }

    if (ownReferralBlocked) {
      return OWN_REFERRAL_CODE_MESSAGE;
    }

    if (isRecurringPaid) {
      if (planId === "season_pass" && cancelAtPeriodEnd && pendingPlan === "season_pass") {
        return periodEndLabel ? `Ends ${periodEndLabel}` : "Ending soon";
      }
      return "Switch";
    }

    return loadingLabel;
  };

  const tiers: PricingTier[] = [
    {
      id: "free",
      name: "Free",
      price: "£0",
      features: FEATURES.free,
      ctaLabel: isPartnerAccess
        ? "Institution access active"
        : tier === "free"
          ? "Current plan"
          : "Downgrade via profile",
    },
    {
      id: "weekly",
      name: "Weekly",
      price: "£8",
      caption: "per week",
      priceNote:
        isRecurringPaid && tier !== "weekly"
          ? "Switches on your next bill"
          : undefined,
      features: FEATURES.paid,
      ctaLabel: paidCta("weekly", "Upgrade"),
    },
    {
      id: "monthly",
      name: "Monthly",
      price: monthlyPriceLabel,
      compareAtPrice: monthlyListPriceLabel,
      caption: "per month",
      priceNote:
        isRecurringPaid && tier !== "monthly"
          ? "Switches on your next bill"
          : hasFriendCode
            ? "Friend discount applied at checkout"
            : "4-day free trial. Cancel anytime",
      features: FEATURES.paid,
      highlighted: true,
      ctaLabel: paidCta(
        "monthly",
        hasFriendCode ? "Upgrade" : "Start free trial",
      ),
    },
    {
      id: "season_pass",
      name: "Exam Season Pass",
      price: `£${seasonPrice}`,
      caption: `~ £${perWeekSeason.toFixed(1)}/week`,
      priceNote:
        isRecurringPaid && cancelAtPeriodEnd && pendingPlan === "season_pass"
          ? periodEndLabel
            ? `Current plan ends ${periodEndLabel}`
            : "Current plan ending soon"
          : isRecurringPaid
            ? "Available after your current plan ends"
            : `One payment. Access until ${SEASON_PASS_ACCESS_UNTIL_LABEL}`,
      features: FEATURES.paid,
      featured: true,
      ctaLabel: paidCta("season_pass", "Upgrade"),
    },
  ];

  const handleCheckout = async (planType: PaidPlanId) => {
    if (isPartnerAccess) {
      setBanner(
        "You already have full access through your institution programme. No payment is needed.",
      );
      return;
    }
    if (!session?.user) {
      const sourcePage = currentGaPath() ?? "/pricing";
      rememberGaSourcePage(sourcePage);
      trackEvent("checkout_signup_required", {
        selected_plan: planType,
        source_page: sourcePage,
      });
      // Preserve the URL code through signup even before validation finishes.
      router.push(buildCheckoutSignupUrl(planType, codeFromUrl || null));
      return;
    }
    if (friendCodeStatus.state === "checking") {
      setBanner("Checking friend code…");
      return;
    }
    if (ownReferralBlocked) {
      setBanner(OWN_REFERRAL_CODE_MESSAGE);
      return;
    }
    setLoading(planType);
    setBanner(null);
    try {
      const ga = await captureGaCheckoutAttribution();
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planType,
          ...(validFriendCode ? { referralCode: validFriendCode } : {}),
          ...ga,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        // Genuine checkout: Stripe session created and redirect about to happen.
        trackEvent("begin_checkout", {
          plan_type: planType,
          currency: "GBP",
        });
        window.location.href = data.url;
        return;
      }
      throw new Error(
        typeof data.error === "string" ? data.error : "checkout_failed",
      );
    } catch (err) {
      setLoading(null);
      setBanner(
        err instanceof Error && err.message !== "checkout_failed"
          ? err.message
          : "Could not start checkout. Try again.",
      );
    }
  };

  useEffect(() => {
    const checkoutPlan = searchParams.get("checkout");
    if (!session?.user || !isPaidPlanId(checkoutPlan)) return;
    if (autoCheckoutStarted.current) return;
    if (isPartnerAccess || isSeasonPass || isRecurringPaid) return;
    // Wait until friend-code validation finishes so we do not send a bad code.
    if (codeFromUrl && friendCodeStatus.state === "checking") return;
    if (codeFromUrl && friendCodeStatus.state === "idle") return;
    if (ownReferralBlocked) return;
    autoCheckoutStarted.current = true;
    const pricingReturn = validFriendCode
      ? `/pricing?code=${encodeURIComponent(validFriendCode)}`
      : codeFromUrl
        ? `/pricing?code=${encodeURIComponent(codeFromUrl)}`
        : "/pricing";
    router.replace(pricingReturn, { scroll: false });
    void handleCheckout(checkoutPlan);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resume checkout once after signup
  }, [
    session?.user,
    searchParams,
    isSeasonPass,
    isRecurringPaid,
    isPartnerAccess,
    friendCodeStatus.state,
    validFriendCode,
  ]);

  const handleSwitch = async (planType: PlanId) => {
    if (planType === "free") return;
    if (!session?.user) {
      const sourcePage = currentGaPath() ?? "/pricing";
      rememberGaSourcePage(sourcePage);
      trackEvent("checkout_signup_required", {
        selected_plan: planType,
        source_page: sourcePage,
      });
      router.push(buildCheckoutSignupUrl(planType, codeFromUrl || null));
      return;
    }
    setLoading(planType);
    setBanner(null);
    try {
      const res = await fetch("/api/stripe/switch-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Switch failed");
      setBanner(data.message ?? "Plan switch scheduled.");
      // Refresh so CTAs update
      window.location.reload();
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "Could not switch plan.");
      setLoading(null);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-58px)] overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute inset-0 opacity-[0.55]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(169, 177, 103, 0.42) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div
          className="absolute inset-0 opacity-45"
          style={{
            backgroundImage: [
              "linear-gradient(118deg, transparent 42%, rgba(169, 177, 103, 0.06) 50%, transparent 58%)",
              "linear-gradient(98deg, transparent 36%, rgba(169, 177, 103, 0.045) 47%, transparent 57%)",
              "linear-gradient(138deg, transparent 28%, rgba(169, 177, 103, 0.065) 52%, transparent 68%)",
            ].join(", "),
          }}
        />
        <div
          className="absolute left-1/2 top-0 h-[55%] w-[min(90vw,40rem)] -translate-x-1/2 opacity-35"
          style={{
            background:
              "conic-gradient(from 180deg at 50% -8%, transparent 160deg, rgba(169, 177, 103, 0.07) 174deg, rgba(169, 177, 103, 0.1) 180deg, rgba(169, 177, 103, 0.07) 186deg, transparent 200deg)",
          }}
        />
        <div
          className="absolute left-1/2 top-[-6rem] h-[26rem] w-[min(90vw,36rem)] -translate-x-1/2 opacity-28"
          style={{
            background:
              "radial-gradient(circle at center, rgba(169, 177, 103, 0.14) 0%, transparent 68%)",
          }}
        />
      </div>

      <Container size="xl" className="relative pb-16 pt-4 sm:pb-24 sm:pt-5">
        {fromSettings ? (
          <div className="mb-6 sm:mb-8">
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 text-sm font-medium text-text-muted transition-colors hover:text-text"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
              Back to settings
            </Link>
          </div>
        ) : null}

        {hasFullAccess && periodEndLabel && isRecurringPaid ? (
          <p className="mb-4 text-center text-sm text-text-muted">
            Current plan renews / ends {periodEndLabel}
            {cancelAtPeriodEnd ? " (set to end, no further renewals)" : ""}.
          </p>
        ) : null}
        {banner ? (
          <p className="mx-auto mb-4 max-w-xl rounded-organic-lg bg-primary/15 px-4 py-3 text-center text-sm text-text">
            {banner}
          </p>
        ) : null}
        {codeFromUrl && friendCodeStatus.state !== "idle" ? (
          <div
            className={
              friendCodeStatus.state === "invalid"
                ? "relative mx-auto mb-5 max-w-lg overflow-hidden rounded-organic-lg border border-error/40 bg-error/10 px-4 py-3.5 shadow-md sm:mb-6"
                : "relative mx-auto mb-5 max-w-md overflow-hidden rounded-organic-lg border border-primary/30 bg-surface-elevated px-4 py-3 shadow-md sm:mb-6"
            }
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  friendCodeStatus.state === "invalid"
                    ? "radial-gradient(circle at top right, rgba(248, 113, 113, 0.22) 0%, transparent 55%)"
                    : "radial-gradient(circle at top right, rgba(169, 177, 103, 0.28) 0%, transparent 55%)",
              }}
            />
            <div className="relative z-10">
              {friendCodeStatus.state === "invalid" ? (
                <>
                  <p className="text-sm font-semibold leading-snug text-error sm:text-base">
                    {friendCodeStatus.message}
                  </p>
                  <p className="mt-1.5 text-xs leading-snug text-text-muted sm:text-sm">
                    Code{" "}
                    <span className="font-mono font-semibold text-text">
                      {codeFromUrl}
                    </span>
                    {friendCodeStatus.reason === "own_code"
                      ? " belongs to your account. Share it with a friend instead."
                      : friendCodeStatus.reason === "already_used"
                        ? " has already been redeemed."
                        : " cannot be applied."}
                  </p>
                </>
              ) : friendCodeStatus.state === "checking" ? (
                <>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-primary">
                    Checking friend code
                  </p>
                  <p className="mt-1 text-sm leading-snug text-text">
                    Verifying{" "}
                    <span className="font-mono font-semibold text-primary">
                      {codeFromUrl}
                    </span>
                    …
                  </p>
                </>
              ) : friendCodeStatus.state === "valid" ? (
                <p className="text-sm leading-snug text-text">
                  Friend code{" "}
                  <span className="font-mono font-semibold text-primary">
                    {friendCodeStatus.code}
                  </span>{" "}
                  will be applied automatically at checkout.
                </p>
              ) : null}
            </div>
          </div>
        ) : !codeFromUrl ? (
          <form
            className="mx-auto mb-5 flex max-w-md flex-col items-stretch gap-3 sm:mb-6 sm:flex-row sm:items-center"
            onSubmit={(event) => {
              event.preventDefault();
              const next = manualCodeInput.trim().toUpperCase();
              if (!next) return;
              const params = new URLSearchParams(searchParams.toString());
              params.set("code", next);
              params.delete("checkout");
              router.push(`/pricing?${params.toString()}`);
            }}
          >
            <label className="sr-only" htmlFor="friend-code-input">
              Friend code
            </label>
            <input
              id="friend-code-input"
              value={manualCodeInput}
              onChange={(event) => setManualCodeInput(event.target.value)}
              placeholder="Have a friend code? Enter it here"
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 rounded-organic-lg border border-border bg-surface-elevated px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:shadow-glow-focus"
            />
            <button
              type="submit"
              className="shrink-0 rounded-organic-lg bg-primary px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
            >
              Apply code
            </button>
          </form>
        ) : null}

        {showVariantPreview ? <LocalPricingVariants /> : null}

        <PricingTable
          tiers={tiers}
          onSelect={(id) => {
            if (id === "free") {
              if (tier !== "free") router.push("/profile");
              return;
            }
            if (id !== "weekly" && id !== "monthly" && id !== "season_pass") return;
            if (ownReferralBlocked) return;

            // Season-pass holders keep prepaid access until Oct - no mid-pass switch
            if (isSeasonPass) return;

            // Already scheduled season-pass end - don't re-fire
            if (
              id === "season_pass" &&
              cancelAtPeriodEnd &&
              pendingPlan === "season_pass"
            ) {
              return;
            }

            if (isRecurringPaid) {
              handleSwitch(id);
              return;
            }

            void handleCheckout(id);
          }}
        />

        <div className="mt-14 text-center">
          {!session?.user ? (
            <p className="text-sm text-text-muted">
              <Link
                href="/login?mode=signup&redirectTo=%2Fpricing"
                className="font-medium text-primary underline-offset-4 hover:text-primary-hover hover:underline"
              >
                Create an account to subscribe.
              </Link>{" "}
              Already have access?{" "}
              <Link
                href="/profile"
                className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:text-primary-hover hover:underline"
              >
                Manage subscription
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
              </Link>
            </p>
          ) : (
            <p className="text-sm text-text-muted">
              <Link
                href="/profile"
                className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:text-primary-hover hover:underline"
              >
                Manage subscription
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
              </Link>
            </p>
          )}
        </div>
      </Container>
    </div>
  );
}
