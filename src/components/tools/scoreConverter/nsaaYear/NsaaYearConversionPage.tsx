import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { JsonLd } from "@/components/seo/JsonLd";
import { NsaaYearConversionTables } from "@/components/tools/scoreConverter/nsaaYear/NsaaYearConversionTables";
import { NsaaYearQuickConverter } from "@/components/tools/scoreConverter/nsaaYear/NsaaYearQuickConverter";
import {
  buildNsaaYearPageCopy,
  getNsaaPastPaperLinks,
  type NsaaYearPageData,
} from "@/lib/scoreConverter/nsaaYearConversion";
import {
  getAdjacentNsaaYears,
  getNsaaConversionYears,
  nsaaYearPagePath,
} from "@/lib/scoreConverter/nsaaYearConversion.shared";
import {
  APP_ROUTES,
  SITE_URL,
  buildCanonicalUrl,
} from "@/lib/seo/config";

type Props = {
  data: NsaaYearPageData;
};

function breadcrumbSchema(year: number, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Score converter",
        item: buildCanonicalUrl(APP_ROUTES.scoreConverter),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "NSAA",
        item: buildCanonicalUrl("/tools/score-converter/nsaa"),
      },
      {
        "@type": "ListItem",
        position: 4,
        name: `NSAA ${year}`,
        item: buildCanonicalUrl(path),
      },
    ],
  };
}

export function NsaaYearConversionPage({ data }: Props) {
  const copy = buildNsaaYearPageCopy(data);
  const { previous, next } = getAdjacentNsaaYears(data.year);
  const papers = getNsaaPastPaperLinks(data.year);
  const allYears = getNsaaConversionYears();

  return (
    <>
      <JsonLd schema={breadcrumbSchema(data.year, data.path)} />

      <Container size="md" className="space-y-8 py-8 sm:py-10">
        <header className="space-y-3">
          <nav aria-label="Breadcrumb" className="text-sm text-text-muted">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link href="/" className="hover:text-text hover:underline">
                  Home
                </Link>
              </li>
              <li aria-hidden className="text-text-subtle">
                /
              </li>
              <li>
                <Link
                  href={APP_ROUTES.scoreConverter}
                  className="hover:text-text hover:underline"
                >
                  Score converter
                </Link>
              </li>
              <li aria-hidden className="text-text-subtle">
                /
              </li>
              <li>
                <Link
                  href="/tools/score-converter/nsaa"
                  className="hover:text-text hover:underline"
                >
                  NSAA
                </Link>
              </li>
              <li aria-hidden className="text-text-subtle">
                /
              </li>
              <li className="font-medium text-text" aria-current="page">
                {data.year}
              </li>
            </ol>
          </nav>

          <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
            {copy.h1}
          </h1>
        </header>

        <NsaaYearQuickConverter data={data} />

        <NsaaYearConversionTables data={data} />

        <details className="group rounded-organic-lg bg-surface-elevated px-4 py-3 open:pb-4">
          <summary className="cursor-pointer list-none text-base font-semibold text-text marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-3">
              <span>About the NSAA {data.year} tables</span>
              <span
                aria-hidden
                className="text-text-muted transition-transform group-open:rotate-180"
              >
                ▾
              </span>
            </span>
          </summary>

          <div className="mt-4 space-y-4 text-sm leading-relaxed text-text-muted">
            <p>{copy.whatItRepresents}</p>
            <p>{copy.howToUse}</p>
            <p>{copy.sectionsAvailable}</p>

            {(papers.questionPaperUrl || papers.answerKeyUrl) && (
              <p>
                NSAA {data.year} on ESAT CAMP:{" "}
                {papers.questionPaperUrl ? (
                  <a
                    href={papers.questionPaperUrl}
                    className="font-semibold text-secondary hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    question paper
                  </a>
                ) : null}
                {papers.questionPaperUrl && papers.answerKeyUrl ? " · " : null}
                {papers.answerKeyUrl ? (
                  <a
                    href={papers.answerKeyUrl}
                    className="font-semibold text-secondary hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    mark scheme
                  </a>
                ) : null}
                {" · "}
                <Link
                  href={papers.seoPastPapersHref}
                  className="font-semibold text-secondary hover:underline"
                >
                  past papers guide
                </Link>
              </p>
            )}

            <nav
              aria-label="Nearby NSAA conversion years"
              className="flex flex-wrap gap-x-4 gap-y-2"
            >
              {previous != null ? (
                <Link
                  href={nsaaYearPagePath(previous)}
                  className="font-semibold text-secondary hover:underline"
                >
                  Previous: NSAA {previous}
                </Link>
              ) : (
                <span className="text-text-subtle">No earlier year</span>
              )}
              {next != null ? (
                <Link
                  href={nsaaYearPagePath(next)}
                  className="font-semibold text-secondary hover:underline"
                >
                  Next: NSAA {next}
                </Link>
              ) : (
                <span className="text-text-subtle">No later year</span>
              )}
            </nav>

            <p>
              <Link
                href="/tools/score-converter/nsaa"
                className="font-semibold text-secondary hover:underline"
              >
                NSAA converter hub
              </Link>
              {" · "}
              <Link
                href={APP_ROUTES.scoreConverter}
                className="font-semibold text-secondary hover:underline"
              >
                Main score converter
              </Link>
            </p>

            <p>
              All NSAA conversion years:{" "}
              {allYears.map((year, index) => (
                <span key={year}>
                  {index > 0 ? ", " : null}
                  {year === data.year ? (
                    <span className="font-semibold text-text">{year}</span>
                  ) : (
                    <Link
                      href={nsaaYearPagePath(year)}
                      className="font-semibold text-secondary hover:underline"
                    >
                      {year}
                    </Link>
                  )}
                </span>
              ))}
            </p>
          </div>
        </details>
      </Container>
    </>
  );
}
