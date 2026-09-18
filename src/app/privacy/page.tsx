import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { CookiePreferencesButton } from "@/components/ga/CookiePreferencesButton";
import { buildNoIndexMetadata } from "@/lib/seo/noIndex";

const TITLE = "Privacy Policy | ESAT Camp";
const DESCRIPTION =
  "How ESAT Camp collects, uses and protects account and usage information.";

export const metadata: Metadata = buildNoIndexMetadata({
  title: TITLE,
  description: DESCRIPTION,
});

function MailtoSupport() {
  return (
    <a
      href="mailto:support@esatcamp.com"
      className="font-medium text-text underline-offset-2 hover:underline"
    >
      support@esatcamp.com
    </a>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <Container size="sm" className="py-14 sm:py-20">
      <article className="mx-auto max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#3B82F6]">
          Legal
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-text">
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-text-muted">
          Last updated: 18 September 2026
        </p>

        <section className="mt-10 space-y-4">
          <h2 className="font-heading text-xl font-semibold text-text">
            1. Who we are
          </h2>
          <p className="text-sm leading-relaxed text-text-muted">
            ESAT Camp is operated by Anson Chan, trading as ESAT Camp. For
            privacy enquiries, contact <MailtoSupport />.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            ESAT Camp is designed for students preparing for university
            admissions, including some users under 18, and we take this into
            account when deciding how personal information is used.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-heading text-xl font-semibold text-text">
            2. What we collect and why
          </h2>
          <p className="text-sm leading-relaxed text-text-muted">
            Depending on how you use ESAT Camp, we may collect:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-text-muted">
            <li>email, account ID and chosen username;</li>
            <li>
              optional study and onboarding preferences such as exam preference,
              ESAT subjects, target universities and referral source;
            </li>
            <li>
              question attempts, answers, scores, mock results and progress;
            </li>
            <li>subscription, access and payment-status information;</li>
            <li>marketing preferences; and</li>
            <li>
              technical information such as IP address, device/browser details,
              security logs, website usage and attribution data.
            </li>
          </ul>
          <p className="text-sm leading-relaxed text-text-muted">
            We use this information to provide accounts and ESAT Camp features,
            save progress, manage access and subscriptions, keep the service
            secure and improve it, measure analytics and advertising where
            consent is required, send opted-in marketing, and meet legal or
            accounting obligations.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            Our lawful bases are performance of a contract with you, our
            legitimate interests in running a secure and useful service, consent
            where required (for example optional cookies or marketing), and
            legal obligation where the law requires us to keep or disclose
            information.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-heading text-xl font-semibold text-text">
            3. Who we share data with
          </h2>
          <p className="text-sm leading-relaxed text-text-muted">
            We use trusted providers to run ESAT Camp:{" "}
            <strong className="font-medium text-text">Supabase</strong>{" "}
            (database and authentication),{" "}
            <strong className="font-medium text-text">Vercel</strong> (hosting
            and delivery),{" "}
            <strong className="font-medium text-text">Stripe</strong> (payments),{" "}
            <strong className="font-medium text-text">Google</strong> (sign-in,
            analytics and advertising conversion measurement), and{" "}
            <strong className="font-medium text-text">Resend</strong> (email
            delivery).
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            Google sign-in provides the email and account identifiers needed for
            authentication. Payments are processed by Stripe. ESAT Camp does not
            store full card numbers or CVC details.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            Partner organisations such as schools or charities may receive
            anonymous or aggregated usage figures, but not identifiable student
            accounts, answers or scores.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            Some providers may process information outside the UK. Where
            required, we use appropriate UK data-transfer safeguards.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            We do not sell personal information.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-heading text-xl font-semibold text-text">
            4. Public information, cookies and marketing
          </h2>
          <p className="text-sm leading-relaxed text-text-muted">
            Leaderboards may show your chosen username together with score,
            accuracy, timing or rank where relevant. Avoid a username that
            reveals personal information you do not want others to see.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            We use necessary technologies to operate ESAT Camp and optional
            analytics/advertising technologies such as Google Analytics and
            Google Ads. Where consent is required, these are not used until you
            give permission. Change your choice anytime via Cookie preferences
            below, or see our{" "}
            <Link
              href="/cookie-policy"
              className="font-medium text-text underline-offset-2 hover:underline"
            >
              Cookie Policy
            </Link>
            .
          </p>
          <div>
            <CookiePreferencesButton />
          </div>
          <p className="text-sm leading-relaxed text-text-muted">
            Creating an account does not subscribe you to marketing. Marketing
            is opt-in and you can unsubscribe at any time.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-heading text-xl font-semibold text-text">
            5. Retention and deletion
          </h2>
          <p className="text-sm leading-relaxed text-text-muted">
            We keep personal information only for as long as reasonably
            necessary to provide ESAT Camp and meet legal, accounting, security
            or fraud-prevention requirements. Account and practice information
            is generally retained while an account remains active. If you
            request deletion, we delete or anonymise information where
            appropriate, except where information must reasonably be retained.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            To ask us to delete your information, contact <MailtoSupport />.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-heading text-xl font-semibold text-text">
            6. Your rights
          </h2>
          <p className="text-sm leading-relaxed text-text-muted">
            Depending on the circumstances, UK data-protection law may give you
            rights of access, correction, deletion, restriction, objection,
            data portability where applicable, and withdrawal of consent.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            <strong className="font-medium text-text">
              You have the right to object to processing based on our legitimate
              interests in certain circumstances.
            </strong>
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            To exercise your rights, contact <MailtoSupport />.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            You can also complain to the Information Commissioner&apos;s Office
            (ICO) at{" "}
            <a
              href="https://ico.org.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-text underline-offset-2 hover:underline"
            >
              ico.org.uk
            </a>
            .
          </p>
        </section>
      </article>
    </Container>
  );
}
