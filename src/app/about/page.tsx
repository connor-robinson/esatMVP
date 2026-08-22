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

const CONTENT = "mx-auto max-w-[1400px] px-4 sm:px-5 lg:px-6";

function FounderCard({
  founder,
}: {
  founder: (typeof FOUNDERS)[keyof typeof FOUNDERS];
}) {
  return (
    <article id={founder.id} className="group">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
        <div className="relative h-[100px] w-[100px] shrink-0 overflow-hidden rounded-2xl bg-[#161D2F] sm:h-[120px] sm:w-[120px]">
          <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.03]">
            <div
              className="relative h-full w-full origin-left"
              style={{ transform: `scale(${founder.imageScale ?? 1})` }}
            >
              <Image
                src={founder.imageSrc}
                alt={founder.imageAlt}
                fill
                sizes="120px"
                className="object-cover"
                style={{ objectPosition: founder.imagePosition ?? "center" }}
              />
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#3B82F6]">
            {founder.role}
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {founder.name}
          </h2>
          <p className="mt-2 text-sm font-medium leading-relaxed text-[#CBD5E1] sm:text-base">
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

      <header className="relative overflow-hidden pb-12 pt-20 sm:pb-16 sm:pt-24 lg:pb-20 lg:pt-32">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.38]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(147, 197, 253, 0.3) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className={`relative ${CONTENT}`}>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#3B82F6]">
            About ESAT Camp
          </p>
          <h1 className="mt-5 max-w-4xl font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-7xl">
            Built by students who understand the process
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-[#94A3B8] sm:text-xl">
            We created ESAT Camp having gone through competitive UK university
            admissions. We understand how hard and confusing the entire process
            can be, so we are working on building the best, most practical ESAT
            preparation platform that we wish we had.
          </p>
        </div>
      </header>

      <main className={`space-y-20 pb-20 sm:space-y-24 sm:pb-24 ${CONTENT}`}>
        <section aria-labelledby="why-we-built">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start lg:gap-16">
            <h2
              id="why-we-built"
              className="font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
            >
              Why we built ESAT Camp
            </h2>
            <p className="text-lg leading-relaxed text-[#94A3B8]">
              The ESAT is a relatively new admissions test recently adopted by
              leading universities, including Cambridge, Oxford and Imperial, for
              several highly competitive courses. Because reliable ESAT guidance
              and high-quality practice resources can be difficult to find, we
              created ESAT Camp to bring realistic practice questions,
              past-paper solutions and mental maths training together in one
              platform.
            </p>
          </div>
        </section>

        <section aria-label="ESAT Camp founders">
          <div className="mb-10">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#3B82F6]">
              The team
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Meet the founders
            </h2>
          </div>
          <div className="flex flex-col gap-14 sm:gap-16">
            <FounderCard founder={FOUNDERS.ewan} />
            <FounderCard founder={FOUNDERS.anson} />
          </div>
        </section>

        <section aria-labelledby="get-started">
          <div className="lg:flex lg:items-end lg:justify-between lg:gap-12">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#3B82F6]">
                Ready when you are
              </p>
              <h2
                id="get-started"
                className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl"
              >
                Start preparing with ESAT Camp
              </h2>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:mt-0 lg:shrink-0">
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

          <p className="mt-12 max-w-4xl text-sm leading-relaxed text-[#64748B]">
            ESAT Camp is an independent educational platform. It is not
            affiliated with or endorsed by Imperial College London, the
            University of Cambridge, UAT-UK or Pearson VUE.
          </p>
        </section>
      </main>
    </div>
  );
}
