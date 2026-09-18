import type { Metadata } from "next";
import type { ReactNode } from "react";
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

function MailtoSupport({ className }: { className?: string }) {
  return (
    <a
      href="mailto:support@esatcamp.com"
      className={
        className ??
        "font-medium text-text underline-offset-2 hover:underline"
      }
    >
      support@esatcamp.com
    </a>
  );
}

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-text underline-offset-2 hover:underline"
    >
      {children}
    </a>
  );
}

const LAWFUL_BASIS_ROWS: { purpose: string; info: string; basis: string }[] = [
  {
    purpose: "Create, authenticate and maintain your account",
    info: "Email address, account identifiers, authentication information",
    basis: "Performance of our contract with you",
  },
  {
    purpose: "Provide ESAT Camp features and save progress",
    info: "Account ID, attempts, answers, scores, progress, access status and study preferences",
    basis: "Performance of our contract with you",
  },
  {
    purpose: "Process subscriptions and maintain paid access",
    info: "Account ID, subscription status and payment/transaction references",
    basis:
      "Performance of our contract with you; legal obligations where applicable",
  },
  {
    purpose:
      "Keep ESAT Camp secure, prevent abuse and investigate technical problems",
    info: "Account, device, IP, usage and security-log information",
    basis:
      "Our legitimate interests in protecting users and operating a secure service",
  },
  {
    purpose: "Understand and improve how ESAT Camp works",
    info: "Usage and performance information",
    basis:
      "Our legitimate interests where the processing is necessary and proportionate; consent where required for non-essential cookies or similar technologies",
  },
  {
    purpose: "Measure advertising conversions",
    info: "Limited online identifiers and conversion events",
    basis: "Consent where required",
  },
  {
    purpose: "Send newsletters or promotional emails",
    info: "Email address and subscription preferences",
    basis: "Consent",
  },
  {
    purpose: "Send essential service messages",
    info: "Email address and account information",
    basis:
      "Performance of our contract with you and/or our legitimate interests in administering the service",
  },
  {
    purpose:
      "Respond to questions, support requests and privacy requests",
    info: "Contact details and the information you send us",
    basis:
      "Performance of our contract, legitimate interests, and/or compliance with legal obligations",
  },
  {
    purpose: "Meet legal, tax, accounting or regulatory requirements",
    info: "Relevant account or transaction information",
    basis: "Compliance with legal obligations",
  },
];

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

        <nav
          aria-label="On this page"
          className="mt-8 rounded-organic-lg bg-surface-mid/60 px-4 py-4 sm:px-5"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">
            Contents
          </p>
          <ol className="mt-3 columns-1 gap-x-8 space-y-1.5 text-sm text-text-muted sm:columns-2">
            {[
              ["quick-summary", "Quick summary"],
              ["who-we-are", "1. Who we are"],
              ["who-this-applies-to", "2. Who this policy applies to"],
              ["personal-information", "3. Personal information we collect"],
              ["how-and-why", "4. How and why we use your information"],
              ["google-sign-in", "5. Signing in with Google"],
              ["practice-data", "6. Practice data and scores"],
              ["leaderboards", "7. Leaderboards and chosen usernames"],
              ["payments", "8. Payments"],
              ["analytics-cookies", "9. Analytics, advertising and cookies"],
              ["emails", "10. Emails and marketing"],
              ["service-providers", "11. Service providers"],
              ["access-partners", "12. Schools, charities and access partners"],
              ["international", "13. International data transfers"],
              ["retention", "14. How long we keep information"],
              ["children", "15. Children and young people"],
              ["security", "16. Security"],
              ["automated-ai", "17. Automated decision-making and AI"],
              ["your-rights", "18. Your data-protection rights"],
              ["complaints", "19. Complaints"],
              ["changes", "20. Changes to this policy"],
              ["contact", "21. Contact"],
            ].map(([id, label]) => (
              <li key={id} className="break-inside-avoid">
                <a
                  href={`#${id}`}
                  className="underline-offset-2 hover:text-text hover:underline"
                >
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <section id="quick-summary" className="mt-12 scroll-mt-24 space-y-4">
          <h2 className="font-heading text-xl font-semibold text-text">
            Quick summary
          </h2>
          <p className="text-sm leading-relaxed text-text-muted">
            ESAT Camp is an independent online platform for students preparing
            for university admissions tests.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            We collect only the information we need to provide and improve ESAT
            Camp, such as account details, practice activity, scores, access
            status and limited technical/analytics information.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            We do <strong className="font-medium text-text">not</strong> sell
            your personal information.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            We do <strong className="font-medium text-text">not</strong> share
            identifiable student information with schools, charities or access
            partners such as In2scienceUK. Where we report on the use of partner
            access codes, we use anonymous or aggregated statistics.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            Marketing emails are optional. Creating an ESAT Camp account does
            not automatically subscribe you to marketing.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            If you have a privacy question or want to exercise your
            data-protection rights, contact <MailtoSupport />.
          </p>
        </section>

        <hr className="my-12 border-0 border-t border-border/40" />

        <section id="who-we-are" className="scroll-mt-24 space-y-4">
          <h2 className="font-heading text-xl font-semibold text-text">
            1. Who we are
          </h2>
          <p className="text-sm leading-relaxed text-text-muted">
            ESAT Camp is an independent educational service operated by{" "}
            <strong className="font-medium text-text">Anson Chan</strong>.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            For the purposes of UK data-protection law, Anson Chan, trading as
            ESAT Camp, is the controller of the personal information described
            in this Privacy Policy.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            You can contact us about privacy or your personal information at:{" "}
            <MailtoSupport />
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            In this policy, “ESAT Camp”, “we”, “us” and “our” refer to ESAT Camp
            and its operator.
          </p>
        </section>

        <section id="who-this-applies-to" className="mt-12 scroll-mt-24 space-y-4">
          <h2 className="font-heading text-xl font-semibold text-text">
            2. Who this policy applies to
          </h2>
          <p className="text-sm leading-relaxed text-text-muted">
            This policy applies to people who:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-text-muted">
            <li>visit esatcamp.com;</li>
            <li>create or use an ESAT Camp account;</li>
            <li>
              use our question bank, mock papers, score tools or other practice
              features;
            </li>
            <li>
              use an access code provided through a school, charity or other
              organisation;
            </li>
            <li>subscribe to ESAT Camp emails; or</li>
            <li>contact us for support.</li>
          </ul>
          <p className="text-sm leading-relaxed text-text-muted">
            ESAT Camp is designed primarily for students preparing for
            university admissions. Some users may therefore be under 18. We aim
            to explain our use of personal information clearly and to protect
            younger users&apos; privacy by default.
          </p>
        </section>

        <section
          id="personal-information"
          className="mt-12 scroll-mt-24 space-y-4"
        >
          <h2 className="font-heading text-xl font-semibold text-text">
            3. Personal information we collect
          </h2>
          <p className="text-sm leading-relaxed text-text-muted">
            Depending on how you use ESAT Camp, we may collect the following
            information.
          </p>

          <h3 className="pt-2 font-heading text-lg font-semibold text-text">
            Account information
          </h3>
          <p className="text-sm leading-relaxed text-text-muted">
            This may include:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-text-muted">
            <li>your email address;</li>
            <li>authentication/account identifiers;</li>
            <li>your chosen username;</li>
            <li>
              information needed to create and secure your account; and
            </li>
            <li>
              limited sign-in information from a provider such as Google, where
              applicable (currently your email address and authentication
              identifiers; we do not request or store your Google display name
              or profile photo).
            </li>
          </ul>
          <p className="text-sm leading-relaxed text-text-muted">
            If you create an account using email and password, authentication
            credentials are handled through our authentication system. We do not
            need to know your password in plain text.
          </p>

          <h3 className="pt-2 font-heading text-lg font-semibold text-text">
            Study preferences and onboarding information
          </h3>
          <p className="text-sm leading-relaxed text-text-muted">
            When you set up your account, we may ask for preferences that help
            personalise practice, such as:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-text-muted">
            <li>exam preference (for example ESAT or TMUA);</li>
            <li>ESAT subject choices, where relevant;</li>
            <li>target universities;</li>
            <li>intended sitting or early-applicant preference;</li>
            <li>how you heard about ESAT Camp; and</li>
            <li>
              accessibility or exam-arrangement preferences you choose to save
              (for example extra time or rest breaks), together with interface
              preferences such as font size or theme.
            </li>
          </ul>

          <h3 className="pt-2 font-heading text-lg font-semibold text-text">
            Practice and progress information
          </h3>
          <p className="text-sm leading-relaxed text-text-muted">
            We may store information such as:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-text-muted">
            <li>questions attempted;</li>
            <li>answers submitted;</li>
            <li>whether answers were correct or incorrect;</li>
            <li>scores and mock-paper results;</li>
            <li>practice history and progress;</li>
            <li>use of particular ESAT Camp features; and</li>
            <li>information needed to save or restore your progress.</li>
          </ul>

          <h3 className="pt-2 font-heading text-lg font-semibold text-text">
            Access and subscription information
          </h3>
          <p className="text-sm leading-relaxed text-text-muted">
            We may store:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-text-muted">
            <li>whether you have free or paid access;</li>
            <li>subscription status;</li>
            <li>access-code use;</li>
            <li>relevant payment or transaction references; and</li>
            <li>
              information needed to provide the level of access attached to your
              account.
            </li>
          </ul>

          <h3 className="pt-2 font-heading text-lg font-semibold text-text">
            Technical and usage information
          </h3>
          <p className="text-sm leading-relaxed text-text-muted">
            When you use ESAT Camp, we and our service providers may receive
            technical information such as:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-text-muted">
            <li>IP address;</li>
            <li>browser and device information;</li>
            <li>pages or features visited;</li>
            <li>approximate event times;</li>
            <li>referral information and first-touch attribution details;</li>
            <li>diagnostic and security logs; and</li>
            <li>
              analytics and advertising-conversion events, where you have given
              any consent required for non-essential tracking.
            </li>
          </ul>
          <p className="text-sm leading-relaxed text-text-muted">
            We do not intentionally ask users to provide information such as
            their school, predicted grades, age or home address as part of the
            normal ESAT Camp account.
          </p>
        </section>

        <section id="how-and-why" className="mt-12 scroll-mt-24 space-y-4">
          <h2 className="font-heading text-xl font-semibold text-text">
            4. How and why we use your information
          </h2>
          <p className="text-sm leading-relaxed text-text-muted">
            We use personal information only where we have a lawful reason to do
            so.
          </p>
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <table className="mt-4 w-full min-w-[36rem] border-collapse text-left text-sm">
              <caption className="sr-only">
                Purposes of processing, typical information used, and lawful
                basis
              </caption>
              <thead>
                <tr className="border-b border-border/50">
                  <th scope="col" className="py-3 pr-4 font-semibold text-text">
                    Purpose
                  </th>
                  <th scope="col" className="py-3 pr-4 font-semibold text-text">
                    Typical information used
                  </th>
                  <th scope="col" className="py-3 font-semibold text-text">
                    Lawful basis
                  </th>
                </tr>
              </thead>
              <tbody>
                {LAWFUL_BASIS_ROWS.map((row) => (
                  <tr
                    key={row.purpose}
                    className="border-b border-border/30 align-top"
                  >
                    <td className="py-3 pr-4 text-text-muted">{row.purpose}</td>
                    <td className="py-3 pr-4 text-text-muted">{row.info}</td>
                    <td className="py-3 text-text-muted">{row.basis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm leading-relaxed text-text-muted">
            Where we rely on legitimate interests, those interests include
            operating and improving ESAT Camp, keeping the platform secure,
            preventing misuse and understanding whether core features are
            functioning properly. We consider these interests against users&apos;
            privacy rights, particularly where users may be under 18.
          </p>
        </section>

        <section id="google-sign-in" className="mt-12 scroll-mt-24 space-y-4">
          <h2 className="font-heading text-xl font-semibold text-text">
            5. Signing in with Google
          </h2>
          <p className="text-sm leading-relaxed text-text-muted">
            ESAT Camp allows users to sign in using Google as well as by email
            and password.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            If you choose Google sign-in, Google authenticates you and provides
            ESAT Camp with the limited account information needed for
            authentication. Our Google sign-in flow is configured to request
            email and basic OpenID authentication only. We store your email
            address and authentication identifiers. We do not request or keep
            your Google display name or profile picture for your ESAT Camp
            profile.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            Google&apos;s own processing of your information is governed by
            Google&apos;s privacy terms. ESAT Camp only uses information
            received through Google sign-in for purposes described in this
            policy.
          </p>
        </section>

        <section id="practice-data" className="mt-12 scroll-mt-24 space-y-4">
          <h2 className="font-heading text-xl font-semibold text-text">
            6. Practice data and scores
          </h2>
          <p className="text-sm leading-relaxed text-text-muted">
            We store practice activity so that features such as saved progress,
            question history, review tools and mock-paper results can work.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            Your individual question history and account data are not provided
            to access partners, schools or other students unless we specifically
            tell you otherwise and have a lawful basis to do so.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            We may use anonymous or aggregated practice information to
            understand questions and features at a group level, for example to
            understand how difficult a question appears to be. Once information
            has been genuinely anonymised so that it no longer identifies an
            individual, it is no longer personal information.
          </p>
        </section>

        <section id="leaderboards" className="mt-12 scroll-mt-24 space-y-4">
          <h2 className="font-heading text-xl font-semibold text-text">
            7. Leaderboards and chosen usernames
          </h2>
          <p className="text-sm leading-relaxed text-text-muted">
            Some ESAT Camp features may include leaderboards.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            Where you participate in a leaderboard, other users may be able to
            see your{" "}
            <strong className="font-medium text-text">chosen username</strong>{" "}
            together with the score, result, ranking or other performance
            information relevant to that leaderboard.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            We do not publish your email address through leaderboards. You
            should avoid choosing a username that reveals personal information
            you do not want other users to see.
          </p>
        </section>

        <section id="payments" className="mt-12 scroll-mt-24 space-y-4">
          <h2 className="font-heading text-xl font-semibold text-text">
            8. Payments
          </h2>
          <p className="text-sm leading-relaxed text-text-muted">
            Payments for ESAT Camp are processed using{" "}
            <strong className="font-medium text-text">Stripe</strong>.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            Stripe processes payment-card information as a payment provider.
            ESAT Camp does{" "}
            <strong className="font-medium text-text">not</strong> receive or
            store your full payment-card number, card security code or full card
            credentials.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            We may receive and store limited information needed to connect a
            Stripe payment or subscription to your ESAT Camp account, such as a
            customer or transaction reference, payment/subscription status,
            amount and date.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            Stripe processes personal information under its own privacy terms
            and as necessary to provide payment services.
          </p>
        </section>

        <section
          id="analytics-cookies"
          className="mt-12 scroll-mt-24 space-y-4"
        >
          <h2 className="font-heading text-xl font-semibold text-text">
            9. Analytics, advertising and cookies
          </h2>
          <p className="text-sm leading-relaxed text-text-muted">
            ESAT Camp uses technologies and services including{" "}
            <strong className="font-medium text-text">Google Analytics 4</strong>{" "}
            and{" "}
            <strong className="font-medium text-text">
              Google Ads conversion tracking
            </strong>{" "}
            to help us understand website performance and measure the
            effectiveness of our advertising. Our hosting provider,{" "}
            <strong className="font-medium text-text">Vercel</strong>, may also
            process limited technical and delivery logs as part of operating the
            website.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            Some technologies are necessary for the website to operate securely
            and correctly. Other technologies, particularly Google analytics or
            advertising technologies, may be non-essential.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            Where UK law requires consent before a non-essential cookie or
            similar technology is stored or accessed on your device, we will ask
            for that consent first. You can refuse non-essential Google
            analytics and advertising technologies without losing access to the
            core service.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            You can change or withdraw applicable cookie choices through{" "}
            <strong className="font-medium text-text">Cookie preferences</strong>{" "}
            in the site footer, or using the control below. More detail is in
            our{" "}
            <Link
              href="/cookie-policy"
              className="font-medium text-text underline-offset-2 hover:underline"
            >
              Cookie Policy
            </Link>
            .
          </p>
          <div className="pt-1">
            <CookiePreferencesButton />
          </div>
        </section>

        <section id="emails" className="mt-12 scroll-mt-24 space-y-4">
          <h2 className="font-heading text-xl font-semibold text-text">
            10. Emails and marketing
          </h2>
          <p className="text-sm leading-relaxed text-text-muted">
            Creating an ESAT Camp account does{" "}
            <strong className="font-medium text-text">not</strong> automatically
            subscribe you to marketing emails.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            We only send marketing or newsletter emails where you have chosen to
            subscribe or where another lawful basis clearly permits the
            communication.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            You can unsubscribe from marketing emails at any time using the
            unsubscribe option in the email or by contacting <MailtoSupport />.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            We may still send non-marketing messages that are necessary to
            operate your account, such as security, authentication, important
            service or subscription messages.
          </p>
        </section>

        <section
          id="service-providers"
          className="mt-12 scroll-mt-24 space-y-4"
        >
          <h2 className="font-heading text-xl font-semibold text-text">
            11. Service providers and when information is shared
          </h2>
          <p className="text-sm leading-relaxed text-text-muted">
            We use trusted third-party providers to operate ESAT Camp. Depending
            on how you use the service, these may include:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-text-muted">
            <li>
              <strong className="font-medium text-text">Supabase</strong>:
              database, authentication and backend infrastructure;
            </li>
            <li>
              <strong className="font-medium text-text">Vercel</strong>: website
              hosting, delivery, performance and technical services;
            </li>
            <li>
              <strong className="font-medium text-text">Stripe</strong>: payment
              and subscription processing;
            </li>
            <li>
              <strong className="font-medium text-text">Google</strong>: Google
              sign-in, analytics and advertising/conversion services; and
            </li>
            <li>
              <strong className="font-medium text-text">Resend</strong> and other
              email-delivery providers used to send service or opted-in
              marketing emails.
            </li>
          </ul>
          <p className="text-sm leading-relaxed text-text-muted">
            These providers may process limited personal information on our
            behalf or, in some circumstances, as independent controllers for
            their own legally defined purposes.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            We may also disclose information where reasonably necessary to:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-text-muted">
            <li>
              comply with the law, a court order or a valid regulatory request;
            </li>
            <li>
              protect the rights, safety or security of ESAT Camp, its users or
              others;
            </li>
            <li>detect or prevent fraud, abuse or security incidents; or</li>
            <li>
              deal with a business transfer or restructuring, if one occurs in
              the future and subject to applicable law.
            </li>
          </ul>
          <p className="text-sm leading-relaxed text-text-muted">
            We do <strong className="font-medium text-text">not</strong> sell
            your personal information.
          </p>
        </section>

        <section id="access-partners" className="mt-12 scroll-mt-24 space-y-4">
          <h2 className="font-heading text-xl font-semibold text-text">
            12. Schools, charities and access partners
          </h2>
          <p className="text-sm leading-relaxed text-text-muted">
            ESAT Camp sometimes provides access codes through schools, charities
            and widening-participation or educational organisations.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            Using one of these codes does not mean that the organisation
            receives access to your ESAT Camp account, email address, individual
            answers, scores or practice history.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            We may provide partners with{" "}
            <strong className="font-medium text-text">
              anonymous or aggregated information
            </strong>
            , such as the number of students who activated an access code or
            overall use of the service. We do not provide them with information
            identifying individual students unless we have separately told the
            affected user and have an appropriate lawful basis.
          </p>
        </section>

        <section id="international" className="mt-12 scroll-mt-24 space-y-4">
          <h2 className="font-heading text-xl font-semibold text-text">
            13. International data transfers
          </h2>
          <p className="text-sm leading-relaxed text-text-muted">
            Some of the technology providers used by ESAT Camp operate
            internationally and may process information outside the United
            Kingdom.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            Where UK data-protection law requires safeguards for an
            international transfer, we use providers and transfer mechanisms
            intended to provide an appropriate level of protection, such as
            applicable UK adequacy regulations or approved contractual
            safeguards.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            You can contact <MailtoSupport /> if you would like more information
            about the safeguards relevant to your information.
          </p>
        </section>

        <section id="retention" className="mt-12 scroll-mt-24 space-y-4">
          <h2 className="font-heading text-xl font-semibold text-text">
            14. How long we keep information
          </h2>
          <p className="text-sm leading-relaxed text-text-muted">
            We keep personal information only for as long as reasonably
            necessary for the purposes described in this policy.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">In general:</p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-text-muted">
            <li>
              account and practice information is retained while your account
              remains active or while it is reasonably needed to provide the
              service;
            </li>
            <li>
              marketing subscription information is retained while you remain
              subscribed and as needed to record an unsubscribe request;
            </li>
            <li>
              support and security information may be retained for a reasonable
              period after an issue is resolved;
            </li>
            <li>
              transaction information may be retained where required for
              accounting, tax, fraud-prevention or legal purposes; and
            </li>
            <li>
              limited copies may remain temporarily in secure backups until
              those backups are overwritten in the ordinary course of our
              systems.
            </li>
          </ul>
          <p className="text-sm leading-relaxed text-text-muted">
            If you delete your account or ask us to delete it, we will delete or
            anonymise personal information associated with the account where
            appropriate, except where we need to retain particular information
            for legal, accounting, security, fraud-prevention or
            dispute-resolution purposes.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            We review our retention practices as the service develops rather
            than keeping identifiable information indefinitely without a reason.
          </p>
        </section>

        <section id="children" className="mt-12 scroll-mt-24 space-y-4">
          <h2 className="font-heading text-xl font-semibold text-text">
            15. Children and young people
          </h2>
          <p className="text-sm leading-relaxed text-text-muted">
            ESAT Camp is designed for students preparing for university
            admissions, so we recognise that some users may be under 18.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            We aim to:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-text-muted">
            <li>
              collect only the information reasonably needed to provide the
              service;
            </li>
            <li>use privacy-protective defaults;</li>
            <li>explain our use of information in clear language;</li>
            <li>
              avoid sharing identifiable student information with access
              partners;
            </li>
            <li>
              give users appropriate ways to control marketing and non-essential
              tracking; and
            </li>
            <li>
              take the interests of younger users into account when designing
              features involving personal information.
            </li>
          </ul>
          <p className="text-sm leading-relaxed text-text-muted">
            If you are under 18 and there is anything in this policy you do not
            understand, you can contact us at <MailtoSupport />. You may also
            wish to discuss it with a parent, guardian or another trusted adult.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            ESAT Camp is an admissions-preparation service and is not designed
            to collect sensitive personal information from children.
          </p>
        </section>

        <section id="security" className="mt-12 scroll-mt-24 space-y-4">
          <h2 className="font-heading text-xl font-semibold text-text">
            16. Security
          </h2>
          <p className="text-sm leading-relaxed text-text-muted">
            We use technical and organisational measures intended to protect
            personal information against unauthorised access, loss, misuse or
            alteration.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            No online service can guarantee absolute security. Users should keep
            their account credentials secure and contact us if they believe
            their account has been compromised.
          </p>
        </section>

        <section id="automated-ai" className="mt-12 scroll-mt-24 space-y-4">
          <h2 className="font-heading text-xl font-semibold text-text">
            17. Automated decision-making and AI
          </h2>
          <p className="text-sm leading-relaxed text-text-muted">
            ESAT Camp does not use your personal information to make solely
            automated decisions that produce legal or similarly significant
            effects about you.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            We do not send identifiable ESAT Camp account information to
            generative-AI providers for the purpose of generating questions,
            educational content or explanations.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            If this changes in a way that materially affects how personal
            information is used, we will update this policy and provide any
            notice or choice required by law.
          </p>
        </section>

        <section id="your-rights" className="mt-12 scroll-mt-24 space-y-4">
          <h2 className="font-heading text-xl font-semibold text-text">
            18. Your data-protection rights
          </h2>
          <p className="text-sm leading-relaxed text-text-muted">
            Depending on the circumstances and the lawful basis we rely on, UK
            data-protection law may give you rights including the right to:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-text-muted">
            <li>
              ask for a copy of personal information we hold about you;
            </li>
            <li>ask us to correct inaccurate or incomplete information;</li>
            <li>
              ask us to delete personal information in certain circumstances;
            </li>
            <li>
              ask us to restrict how information is used in certain
              circumstances;
            </li>
            <li>
              object to certain processing, including processing based on
              legitimate interests;
            </li>
            <li>
              receive certain information in a portable format where the right
              to data portability applies; and
            </li>
            <li>
              withdraw consent at any time where processing is based on consent.
            </li>
          </ul>
          <p className="text-sm leading-relaxed text-text-muted">
            <strong className="font-medium text-text">
              You have the right to object to processing based on our legitimate
              interests in certain circumstances.
            </strong>
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            Withdrawing consent does not make processing carried out before
            withdrawal unlawful.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            To exercise a privacy right, contact <MailtoSupport />. We may need
            to verify that the request relates to your account before acting on
            it.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            You can also delete your ESAT Camp account using the
            account-deletion functionality available through the service, where
            provided.
          </p>
        </section>

        <section id="complaints" className="mt-12 scroll-mt-24 space-y-4">
          <h2 className="font-heading text-xl font-semibold text-text">
            19. Complaints
          </h2>
          <p className="text-sm leading-relaxed text-text-muted">
            If you have a concern about how ESAT Camp uses your personal
            information, please contact us first at <MailtoSupport /> so that we
            can investigate.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            You also have the right to complain to the{" "}
            <strong className="font-medium text-text">
              Information Commissioner&apos;s Office (ICO)
            </strong>
            , the UK&apos;s data-protection regulator.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            Information about making a complaint is available at{" "}
            <ExternalLink href="https://ico.org.uk">ico.org.uk</ExternalLink>.
          </p>
        </section>

        <section id="changes" className="mt-12 scroll-mt-24 space-y-4">
          <h2 className="font-heading text-xl font-semibold text-text">
            20. Changes to this policy
          </h2>
          <p className="text-sm leading-relaxed text-text-muted">
            We may update this Privacy Policy as ESAT Camp develops, our
            providers change or legal requirements change.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            The latest version will always show its effective date at the top of
            this page. If we make a material change to how we use personal
            information, we will take reasonable steps to bring the change to
            affected users&apos; attention.
          </p>
        </section>

        <section id="contact" className="mt-12 scroll-mt-24 space-y-4">
          <h2 className="font-heading text-xl font-semibold text-text">
            21. Contact
          </h2>
          <p className="text-sm leading-relaxed text-text-muted">
            For questions about this Privacy Policy, your account or your
            personal information, contact:
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            <strong className="font-medium text-text">ESAT Camp</strong>
            <br />
            Operated by Anson Chan
            <br />
            <MailtoSupport />
          </p>
        </section>
      </article>
    </Container>
  );
}
