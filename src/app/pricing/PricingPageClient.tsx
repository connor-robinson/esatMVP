"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { PricingTable, type PricingTier } from "@/components/ui";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { useSubscription } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";
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
import { 
  VARIANT_CONFIGS, 
  EXPRESS_DEAL_PRICE_GBP,
  EXPRESS_DEAL_ORIGINAL_PRICE_GBP,
  type PricingVariant 
} from "@/lib/pricing/abTest";
import { getOrAssignVariant } from "@/lib/pricing/abTestClient";
import {
  buildCheckoutSignupUrl,
  isPaidPlanId,
  type PaidPlanId,
} from "@/lib/pricing/checkoutAuth";
import { ArrowLeft, ArrowRight, MessageCircle } from "lucide-react";
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

function daysUntilEsat(): number {
  const diff = SEASON_PASS_ACCESS_UNTIL.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

function LocalhostVariantPreview({
  currentVariant,
  onSwitchVariant,
}: {
  currentVariant: PricingVariant;
  onSwitchVariant: (variant: PricingVariant) => void;
}) {
  const daysUntilExam = daysUntilEsat();
  
  return (
    <div className="mb-8 border-t border-b border-border-subtle bg-surface-elevated/50 px-4 py-6">
      <div className="mx-auto max-w-4xl">
        <div className="text-center mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
            Localhost Testing
          </p>
          <h2 className="mt-2 text-lg font-semibold text-text">
            A/B Test Variants
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Switch between pricing variants to test both experiences
          </p>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2">
          {(['control', 'express_deal'] as PricingVariant[]).map((variant) => {
            const config = VARIANT_CONFIGS[variant];
            const isActive = currentVariant === variant;
            
            return (
              <button
                key={variant}
                onClick={() => onSwitchVariant(variant)}
                className={cn(
                  "border px-4 py-4 text-left transition-all",
                  isActive
                    ? "border-primary bg-primary/10"
                    : "border-border-subtle bg-surface-elevated hover:border-primary/50"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-text">
                      {config.displayName}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {config.description}
                    </p>
                    
                    <div className="mt-3 space-y-1.5 text-xs text-text-muted">
                      <p>
                        <strong>Monthly:</strong> £14.99/month with 4-day free trial
                      </p>
                      {config.showExpressDeal ? (
                        <p>
                          <strong>Express Deal:</strong> £9.49/month instant buy 
                          <span className="text-primary ml-1">
                            (highlighted)
                          </span>
                        </p>
                      ) : (
                        <p>
                          <strong>Weekly:</strong> £8/week
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {isActive && (
                    <span className="shrink-0 inline-flex items-center bg-primary/25 px-2 py-1 text-xs font-bold text-text">
                      ACTIVE
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        
        <p className="mt-4 text-center text-xs text-text-subtle">
          Variant changes apply immediately. Your current variant cookie will be updated.
        </p>
      </div>
    </div>
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
  const [pricingVariant, setPricingVariant] = useState<PricingVariant | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [manualCodeInput, setManualCodeInput] = useState("");
  const [friendCodeStatus, setFriendCodeStatus] = useState<FriendCodeStatus>({
    state: "idle",
  });
  const autoCheckoutStarted = useRef(false);

  // Load A/B test variant
  useEffect(() => {
    const { variant } = getOrAssignVariant();
    setPricingVariant(variant);
  }, []);

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
  const daysUntilExam = daysUntilEsat();
  
  // Check if Express Deal should be shown
  const showExpressDeal = pricingVariant === 'express_deal';
  
  // Show localhost variant preview in development
  const showLocalhostPreview = process.env.NODE_ENV === "development";
  
  const handleSwitchVariant = (newVariant: PricingVariant) => {
    setPricingVariant(newVariant);
    // Update cookie
    if (typeof document !== "undefined") {
      const expires = new Date();
      expires.setDate(expires.getDate() + 90);
      document.cookie = `pricing_variant=${encodeURIComponent(newVariant)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
    }
  };

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

  const paidCta = (planId: "weekly" | "monthly" | "season_pass" | "express_deal", loadingLabel: string) => {
    if (loading === planId) return "Loading…";
    if (isPartnerAccess) return "Included with your access";
    
    // Map express_deal to monthly for tier comparison (same product)
    const tierToCompare = planId === "express_deal" ? "monthly" : planId;
    if (tier === tierToCompare) return "Current plan";

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
    ...(showExpressDeal ? [{
      id: "express_deal" as const,
      name: "Express Deal",
      price: formatGbpPrice(EXPRESS_DEAL_PRICE_GBP),
      compareAtPrice: formatGbpPrice(EXPRESS_DEAL_ORIGINAL_PRICE_GBP),
      caption: "per month",
      priceNote: `${daysUntilExam} days until ESAT. Access starts immediately`,
      features: FEATURES.paid,
      highlighted: true,
      ctaLabel: paidCta("express_deal", "Get instant access"),
    }] : [{
      id: "weekly" as const,
      name: "Weekly",
      price: "£8",
      caption: "per week",
      priceNote:
        isRecurringPaid && tier !== "weekly"
          ? "Switches on your next bill"
          : undefined,
      features: FEATURES.paid,
      ctaLabel: paidCta("weekly", "Upgrade"),
    }]),
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
      highlighted: !showExpressDeal,
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

  const handleCheckout = async (planType: PaidPlanId | "express_deal") => {
    if (isPartnerAccess) {
      setBanner(
        "You already have full access through your institution programme. No payment is needed.",
      );
      return;
    }
    
    // Express Deal maps to monthly plan (same product, different price point)
    const stripePlanType: PaidPlanId = planType === "express_deal" ? "monthly" : planType;
    
    if (!session?.user) {
      const sourcePage = currentGaPath() ?? "/pricing";
      rememberGaSourcePage(sourcePage);
      trackEvent("checkout_signup_required", {
        selected_plan: stripePlanType,
        variant: planType === "express_deal" ? "express_deal" : "control",
        source_page: sourcePage,
      });
      // Preserve the URL code through signup even before validation finishes.
      router.push(buildCheckoutSignupUrl(stripePlanType, codeFromUrl || null));
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
          planType: stripePlanType,
          isExpressDeal: planType === "express_deal",
          ...(validFriendCode ? { referralCode: validFriendCode } : {}),
          ...ga,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        // Genuine checkout: Stripe session created and redirect about to happen.
        trackEvent("begin_checkout", {
          plan_type: stripePlanType,
          variant: planType === "express_deal" ? "express_deal" : "control",
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
                    : "radial-gradient(circle at top right, rgba(169, 177, 103, 0.18) 0%, transparent 55%)",
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
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                    Verifying code
                  </p>
                  <p className="mt-1 text-sm leading-snug text-text">
                    Checking{" "}
                    <span className="font-mono font-semibold text-text">
                      {codeFromUrl}
                    </span>
                    …
                  </p>
                </>
              ) : friendCodeStatus.state === "valid" ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                    Code verified
                  </p>
                  <p className="mt-1.5 text-sm leading-snug text-text">
                    Referral code{" "}
                    <span className="font-mono font-semibold text-primary">
                      {friendCodeStatus.code}
                    </span>{" "}
                    will be applied at checkout for your discount.
                  </p>
                </>
              ) : null}
            </div>
          </div>
        ) : !codeFromUrl ? (
          <div className="mx-auto mb-5 max-w-md sm:mb-6">
            <form
              className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"
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
              <div className="flex-1">
                <label htmlFor="friend-code-input" className="block text-xs font-medium text-text-muted mb-1.5">
                  Referral code
                </label>
                <input
                  id="friend-code-input"
                  value={manualCodeInput}
                  onChange={(event) => setManualCodeInput(event.target.value)}
                  placeholder="Enter your code"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full border border-border-subtle bg-surface-elevated px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <button
                type="submit"
                className="shrink-0 bg-primary px-6 py-2.5 text-sm font-semibold text-black hover:bg-primary/90 sm:mt-5"
              >
                Apply
              </button>
            </form>
            <p className="mt-2 text-xs text-center text-text-subtle">
              Have a referral code from a friend? Enter it above to get your discount.
            </p>
          </div>
        ) : null}

        {showLocalhostPreview && pricingVariant ? (
          <LocalhostVariantPreview
            currentVariant={pricingVariant}
            onSwitchVariant={handleSwitchVariant}
          />
        ) : null}

        <PricingTable
          tiers={tiers}
          onSelect={(id) => {
            if (id === "free") {
              if (tier !== "free") router.push("/profile");
              return;
            }
            if (id !== "weekly" && id !== "monthly" && id !== "season_pass" && id !== "express_deal") return;
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
              // Express Deal maps to monthly for plan switching
              const planToSwitch = id === "express_deal" ? "monthly" : id;
              handleSwitch(planToSwitch);
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
        
        {/* Contact Support Button */}
        <Link
          href="/support"
          className="fixed bottom-6 right-6 flex h-12 w-12 items-center justify-center bg-primary text-black shadow-lg transition-opacity hover:opacity-90 sm:h-14 sm:w-14"
          aria-label="Contact Support"
        >
          <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
        </Link>
      </Container>
    </div>
  );
}
