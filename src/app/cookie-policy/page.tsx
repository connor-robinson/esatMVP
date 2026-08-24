import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { CookiePreferencesButton } from "@/components/ga/CookiePreferencesButton";
import { BRAND_CONFIG } from "@/config/brand";
import { buildSeoMetadata } from "@/lib/seo/config";

const PATH = "/cookie-policy";
const TITLE = "Cookie Policy | ESAT Camp";
const DESCRIPTION =
  "How ESAT Camp uses necessary storage and optional cookies for Google Analytics and Google Ads conversion measurement, and how to withdraw consent.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
});

export default function CookiePolicyPage() {
  return (
    <Container size="sm" className="py-14 sm:py-20">
      <div className="mx-auto max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#3B82F6]">
          Legal
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-text">
          Cookie Policy
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-text-muted">
          This policy explains how {BRAND_CONFIG.displayName} (
          <Link href="/" className="text-text underline-offset-2 hover:underline">
            esatcamp.com
          </Link>
          ) uses cookies and similar storage in the UK.
        </p>

        <section className="mt-10 space-y-3">
          <h2 className="font-heading text-xl font-semibold text-text">
            Necessary storage
          </h2>
          <p className="text-sm leading-relaxed text-text-muted">
            We use essential browser storage so the site can function: keeping
            you signed in, remembering theme preferences, and saving your
            optional-cookie choice. These are required for the service you
            request and are not used for advertising.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="font-heading text-xl font-semibold text-text">
            Optional cookies (analytics and conversion measurement)
          </h2>
          <p className="text-sm leading-relaxed text-text-muted">
            If you choose{" "}
            <strong className="font-medium text-text">
              Accept optional cookies
            </strong>
            , we enable Google Analytics 4 (measurement ID{" "}
            <code className="rounded-md bg-surface-mid px-1.5 py-0.5 text-xs text-text">
              G-Y7E2CJSKV0
            </code>
            ) for website analytics, and we allow Google tags to use cookies for{" "}
            <strong className="font-medium text-text">
              Google Ads conversion measurement
            </strong>{" "}
            (to understand whether ads led someone to this site and key actions
            such as sign-up or purchase). If you choose{" "}
            <strong className="font-medium text-text">
              Reject optional cookies
            </strong>
            , we do not load Google Analytics, we keep Consent Mode signals
            denied, and we remove existing{" "}
            <code className="text-xs">_ga</code> /{" "}
            <code className="text-xs">_ga_*</code> /{" "}
            <code className="text-xs">_gcl*</code> /{" "}
            <code className="text-xs">_gac*</code> cookies we can clear from this
            site. Your reject choice itself is kept in local storage so we
            remember it.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            Optional cookies are{" "}
            <strong className="font-medium text-text">off by default</strong>. We
            only enable them after you opt in. We use Google Consent Mode v2 so
            storage signals start as denied until you accept.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            We do{" "}
            <strong className="font-medium text-text">not</strong> enable
            remarketing or personalised advertising. Even after acceptance, the
            Consent Mode signal for ad personalisation stays denied.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="font-heading text-xl font-semibold text-text">
            What analytics and conversion measurement collect
          </h2>
          <p className="text-sm leading-relaxed text-text-muted">
            When enabled, Google Analytics may process approximate page views,
            page paths, device/browser type, rough location (from IP, which we
            ask Google to anonymise), and similar usage metrics. Conversion
            measurement may associate a visit or key event with an earlier ad
            click using Google cookies. We do not use these tools to collect
            passwords, answers you type into tools, or other form free-text that
            identifies you.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="font-heading text-xl font-semibold text-text">
            Why we use it
          </h2>
          <p className="text-sm leading-relaxed text-text-muted">
            We use aggregated analytics to see which pages and tools help
            students prepare for the ESAT and TMUA, and to improve content and
            navigation. We use conversion measurement to understand whether our
            Google Ads spend leads people to useful actions on the site. It is
            not used to sell your data or to show personalised third-party ads
            on this site.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="font-heading text-xl font-semibold text-text">
            How to withdraw consent
          </h2>
          <p className="text-sm leading-relaxed text-text-muted">
            You can change your mind at any time. Use{" "}
            <strong className="font-medium text-text">Cookie preferences</strong>{" "}
            in the site footer (or the button below), then choose{" "}
            <strong className="font-medium text-text">
              Reject optional cookies
            </strong>
            . We will stop future analytics events, set Consent Mode signals
            back to denied, and clear applicable Google cookies for this site
            where possible. Your choice is stored in your browser so we remember
            it on later visits.
          </p>
          <div className="pt-2">
            <CookiePreferencesButton />
          </div>
        </section>

        <p className="mt-12 text-xs leading-relaxed text-text-subtle">
          Last updated: 25 August 2026. Questions?{" "}
          <Link
            href="/help"
            className="text-text-muted underline-offset-2 hover:underline"
          >
            Contact support
          </Link>
          .
        </p>
      </div>
    </Container>
  );
}
