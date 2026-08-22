import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { ABOUT_PATH, FOUNDERS } from "@/config/founders";
import {
  APP_ROUTES,
  buildCanonicalUrl,
  PRODUCTION_SITE_URL,
} from "@/lib/seo/config";

const TITLE = "About ESAT Camp | Meet the Founders";
const DESCRIPTION =
  "Meet the students behind ESAT Camp and learn why we created a clearer, more effective way to prepare for the ESAT.";
const ABOUT_URL = buildCanonicalUrl(ABOUT_PATH);

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: ABOUT_URL },
  openGraph: {
    type: "website",
    siteName: "ESAT CAMP",
    title: TITLE,
    description: DESCRIPTION,
    url: ABOUT_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const PERSON_SCHEMAS = Object.values(FOUNDERS).map((founder) => ({
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": `${ABOUT_URL}#${founder.id}`,
  name: founder.name,
  url: `${ABOUT_URL}#${founder.id}`,
  image: buildCanonicalUrl(founder.imageSrc),
  jobTitle: founder.role,
  description: `${founder.credential}. ${founder.bio}`,
  worksFor: {
    "@id": `${PRODUCTION_SITE_URL}/#organization`,
  },
}));

const ABOUT_SCHEMAS = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${PRODUCTION_SITE_URL}/#organization`,
    name: "ESAT CAMP",
    url: PRODUCTION_SITE_URL,
    description:
      "An independent educational platform for focused, practical ESAT preparation.",
    founder: PERSON_SCHEMAS.map((person) => ({ "@id": person["@id"] })),
  },
  ...PERSON_SCHEMAS,
];

const PRINCIPLES = [
  {
    title: "Clear",
    copy: "Straightforward explanations without unnecessary complexity.",
  },
  {
    title: "Focused",
    copy: "Resources designed specifically around the ESAT syllabus and format.",
  },
  {
    title: "Transparent",
    copy: "Clear sources, honest guidance and no claims of university endorsement.",
  },
] as const;

function FounderCard({
  founder,
}: {
  founder: (typeof FOUNDERS)[keyof typeof FOUNDERS];
}) {
  return (
    <article
      id={founder.id}
      className="group rounded-3xl border border-white/[0.08] bg-[#161D2F] p-6 sm:p-8"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#0A0F1D] sm:h-24 sm:w-24">
          <Image
            src={founder.imageSrc}
            alt={founder.imageAlt}
            fill
            sizes="96px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#3B82F6]">
            {founder.role}
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {founder.name}
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-[#CBD5E1] sm:text-base">
            {founder.credential}
          </p>
          <p className="mt-4 max-w-3xl leading-relaxed text-[#94A3B8]">
            {founder.bio}
          </p>
        </div>
      </div>
    </article>
  );
}

export default function AboutPage() {
  return (
    <div className="bg-[#0A0F1D] text-white">
      <JsonLd schema={ABOUT_SCHEMAS} />

      <header className="relative overflow-hidden px-4 pb-16 pt-20 sm:px-5 sm:pb-20 sm:pt-24 lg:px-6 lg:pb-24 lg:pt-32">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.38]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(147, 197, 253, 0.3) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="relative mx-auto max-w-[1400px]">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#3B82F6]">
            About ESAT Camp
          </p>
          <h1 className="mt-5 max-w-4xl font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-7xl">
            Built by students who understand the process
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-[#94A3B8] sm:text-xl">
            ESAT Camp was created by students who recently went through
            competitive UK university admissions. We are building the focused,
            practical ESAT preparation platform we wish we had.
          </p>
        </div>
      </header>

      <main>
        <section
          aria-label="ESAT Camp founders"
          className="px-4 pb-20 sm:px-5 sm:pb-24 lg:px-6"
        >
          <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
            <FounderCard founder={FOUNDERS.ewan} />
            <FounderCard founder={FOUNDERS.anson} />
          </div>
        </section>

        <section className="bg-[#161D2F]/55 px-4 py-20 sm:px-5 sm:py-24 lg:px-6">
          <div className="mx-auto max-w-[1400px]">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
              <h2 className="max-w-xl font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Why we built ESAT Camp
              </h2>
              <p className="text-lg leading-relaxed text-[#94A3B8]">
                Preparing for the ESAT can be unnecessarily confusing. Past
                papers are spread across different examinations, formats have
                changed repeatedly, and reliable guidance is difficult to find.
                We created ESAT Camp to bring practice questions, past-paper
                guidance and score tools together in one clear platform.
              </p>
            </div>

            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {PRINCIPLES.map((principle, index) => (
                <article
                  key={principle.title}
                  className="rounded-2xl border border-white/[0.07] bg-[#0A0F1D]/65 p-6 sm:p-7"
                >
                  <p className="text-xs font-bold tabular-nums tracking-[0.2em] text-[#3B82F6]">
                    0{index + 1}
                  </p>
                  <h3 className="mt-5 font-display text-2xl font-bold">
                    {principle.title}
                  </h3>
                  <p className="mt-3 leading-relaxed text-[#94A3B8]">
                    {principle.copy}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-5 sm:py-24 lg:px-6">
          <div className="mx-auto max-w-[1400px]">
            <div className="rounded-3xl bg-[#161D2F] p-7 sm:p-10 lg:flex lg:items-end lg:justify-between lg:gap-12 lg:p-12">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#3B82F6]">
                  Ready when you are
                </p>
                <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                  Start preparing with ESAT Camp
                </h2>
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:mt-0">
                <Link
                  href={APP_ROUTES.questionBank}
                  className="inline-flex items-center justify-center rounded-xl bg-[#3B82F6] px-6 py-3.5 font-bold text-white transition-colors hover:bg-[#2563EB]"
                >
                  Explore ESAT resources
                </Link>
                <Link
                  href={APP_ROUTES.scoreConverter}
                  className="inline-flex items-center justify-center rounded-xl bg-white/[0.08] px-6 py-3.5 font-bold text-white transition-colors hover:bg-white/[0.13]"
                >
                  Try the score converter
                </Link>
              </div>
            </div>

            <p className="mx-auto mt-10 max-w-4xl text-center text-sm leading-relaxed text-[#64748B]">
              ESAT Camp is an independent educational platform. It is not
              affiliated with or endorsed by Imperial College London, the
              University of Cambridge, UAT-UK or Pearson VUE.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
