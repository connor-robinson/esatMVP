import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "katex/dist/katex.min.css";
import { EsatMockPaperView } from "@/components/esatMockTests/EsatMockPaperView";
import { findMockModule } from "@/lib/esatMockTests/catalog";
import {
  allEsatMockHtmlRouteParams,
  mockHtmlMetaDescription,
  mockHtmlMetaTitle,
  mockHtmlPageTitle,
  resolveEsatMockHtmlRoute,
} from "@/lib/esatMockTests/htmlRoutes";
import { paperIdForAdminEsatMock } from "@/lib/papers/adminEsatMocks";
import { getAdminEsatMockQuestionsForPaperId } from "@/lib/papers/adminEsatMocks.server";
import {
  breadcrumbSchema,
  buildSeoMetadata,
  SEO_ROUTES,
} from "@/lib/seo/config";
import { JsonLd } from "@/components/seo/JsonLd";

export const revalidate = 3600;

type PageParams = {
  subject: string;
  mock: string;
};

type PageProps = {
  params: Promise<PageParams>;
};

export function generateStaticParams() {
  return allEsatMockHtmlRouteParams();
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { subject, mock } = await params;
  const resolved = resolveEsatMockHtmlRoute(subject, mock);
  if (!resolved) {
    return { robots: { index: false, follow: false } };
  }

  return buildSeoMetadata({
    title: mockHtmlMetaTitle(resolved.moduleId, resolved.mockNumber),
    description: mockHtmlMetaDescription(
      resolved.moduleId,
      resolved.mockNumber,
    ),
    path: resolved.path,
  });
}

export default async function EsatMockHtmlPaperPage({ params }: PageProps) {
  const { subject, mock } = await params;
  const resolved = resolveEsatMockHtmlRoute(subject, mock);
  if (!resolved) notFound();

  const module = findMockModule(resolved.moduleId);
  const paperId = paperIdForAdminEsatMock(
    resolved.mockNumber,
    module.builderSubject,
  );
  if (paperId < 0) notFound();

  const questions = await getAdminEsatMockQuestionsForPaperId(paperId);
  if (questions.length === 0) notFound();

  return (
    <>
      <JsonLd
        schema={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "ESAT mock tests", path: SEO_ROUTES.mockTests },
          {
            name: mockHtmlPageTitle(resolved.moduleId, resolved.mockNumber),
            path: resolved.path,
          },
        ])}
      />
      <EsatMockPaperView
        moduleId={resolved.moduleId}
        mockNumber={resolved.mockNumber}
        questions={questions}
      />
    </>
  );
}
