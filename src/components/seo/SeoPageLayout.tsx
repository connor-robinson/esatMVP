import Link from "next/link";
import { cn } from "@/lib/utils";
import type { FaqItem, SourceLink } from "@/lib/seo/config";
import { faqPageSchema } from "@/lib/seo/config";
import { SEO_GUIDE_KEYS, SEO_LINKS, type SeoLink } from "@/lib/seo/links";
import { JsonLd } from "@/components/seo/JsonLd";
import { SeoCta, SeoCtaRow } from "@/components/seo/SeoCta";
import { SeoFaq } from "@/components/seo/SeoFaq";
import {
  IndependentDisclaimer,
  InternalLinks,
  LastCheckedNote,
  SourceList,
} from "@/components/seo/SeoSections";

type Cta = { href: string; label: string };

type SeoPageLayoutProps = {
  eyebrow: string;
  title: React.ReactNode;
  /** Intro paragraphs. The first one should answer the search query directly. */
  intro: readonly string[];
  primaryCta: Cta;
  secondaryCta?: Cta;
  /** Set on pages carrying official dates or rules. */
  lastChecked?: { detail?: string } | true;
  children: React.ReactNode;
  faq?: readonly FaqItem[];
  faqHeading?: string;
  finalCta?: {
    heading: string;
    body: string;
    primary: Cta;
    secondary?: Cta;
  };
  related: readonly SeoLink[];
  sources?: readonly SourceLink[];
  /** Article / WebApplication schema. FAQ schema is added automatically. */
  schema?: object | object[];
  /** Required on pages presenting official information. */
  showDisclaimer?: boolean;
  path: string;
};

const CONTENT = "mx-auto w-full max-w-4xl px-4 sm:px-5 lg:px-6";

export function SeoPageLayout({
  eyebrow,
  title,
  intro,
  primaryCta,
  secondaryCta,
  lastChecked,
  children,
  faq,
  faqHeading,
  finalCta,
  related,
  sources,
  schema,
  showDisclaimer,
}: SeoPageLayoutProps) {
  const schemas: object[] = [];
  if (schema) schemas.push(...(Array.isArray(schema) ? schema : [schema]));
  if (faq?.length) schemas.push(faqPageSchema(faq));

  return (
    <div className="bg-[#0A0F1D] text-white">
      {schemas.length ? <JsonLd schema={schemas} /> : null}

      <header className="relative overflow-hidden pt-14 pb-12 sm:pt-20 sm:pb-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(147, 197, 253, 0.3) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className={cn("relative", CONTENT)}>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#3B82F6]">
            {eyebrow}
          </p>
          <h1 className="mt-5 text-4xl font-display font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.5rem]">
            {title}
          </h1>
          <div className="mt-6 space-y-4">
            {intro.map((paragraph) => (
              <p
                key={paragraph}
                className="text-lg leading-relaxed text-[#94A3B8]"
              >
                {paragraph}
              </p>
            ))}
          </div>

          {lastChecked ? (
            <div className="mt-7 rounded-2xl bg-white/[0.04] p-4">
              <LastCheckedNote
                detail={lastChecked === true ? undefined : lastChecked.detail}
              />
            </div>
          ) : null}

          <SeoCtaRow className="mt-8">
            <SeoCta href={primaryCta.href} placement="hero">
              {primaryCta.label}
            </SeoCta>
            {secondaryCta ? (
              <SeoCta
                href={secondaryCta.href}
                variant="quiet"
                placement="hero_secondary"
              >
                {secondaryCta.label}
              </SeoCta>
            ) : null}
          </SeoCtaRow>
        </div>
      </header>

      <div className={cn("space-y-14 pb-6 sm:space-y-16", CONTENT)}>
        {children}

        {faq?.length ? <SeoFaq items={faq} heading={faqHeading} /> : null}

        {finalCta ? (
          <section className="rounded-3xl bg-[#161D2F] p-6 sm:p-9">
            <h2 className="text-2xl font-display font-bold tracking-tight text-white sm:text-3xl">
              {finalCta.heading}
            </h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-[#94A3B8]">
              {finalCta.body}
            </p>
            <SeoCtaRow className="mt-7">
              <SeoCta href={finalCta.primary.href} placement="footer">
                {finalCta.primary.label}
              </SeoCta>
              {finalCta.secondary ? (
                <SeoCta
                  href={finalCta.secondary.href}
                  variant="quiet"
                  placement="footer_secondary"
                >
                  {finalCta.secondary.label}
                </SeoCta>
              ) : null}
            </SeoCtaRow>
          </section>
        ) : null}

        <InternalLinks links={related} />

        {sources?.length ? <SourceList sources={sources} /> : null}

        {showDisclaimer ? (
          <IndependentDisclaimer className="max-w-2xl" />
        ) : null}
      </div>

      <SeoGuideFooter />
    </div>
  );
}

/** Site-wide guide index, repeated on every SEO page so all of them are crawlable. */
export function SeoGuideFooter() {
  const guides = SEO_GUIDE_KEYS.map((key) => SEO_LINKS[key]);
  const tools = [
    SEO_LINKS.calibration,
    SEO_LINKS.drill,
    SEO_LINKS.scoreConverter,
    SEO_LINKS.fermiGame,
    SEO_LINKS.questionBank,
    SEO_LINKS.pastPaperRoadmap,
  ];

  return (
    <footer className="mt-16 bg-[#0A0F1D] pt-12 pb-14">
      <div className={CONTENT}>
        <div className="grid gap-10 sm:grid-cols-2">
          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-white">
              ESAT guides
            </h2>
            <ul className="mt-5 grid gap-3 text-sm text-[#94A3B8] sm:grid-cols-2">
              {guides.map((guide) => (
                <li key={guide.href}>
                  <Link
                    href={guide.href}
                    className="transition-colors hover:text-[#3B82F6]"
                  >
                    {guide.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-white">
              Practice and tools
            </h2>
            <ul className="mt-5 grid gap-3 text-sm text-[#94A3B8] sm:grid-cols-2">
              {tools.map((tool) => (
                <li key={tool.href}>
                  <Link
                    href={tool.href}
                    className="transition-colors hover:text-[#3B82F6]"
                  >
                    {tool.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <IndependentDisclaimer className="mt-10" />
      </div>
    </footer>
  );
}
