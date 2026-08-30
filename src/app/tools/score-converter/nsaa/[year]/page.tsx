import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NsaaYearConversionPage } from "@/components/tools/scoreConverter/nsaaYear/NsaaYearConversionPage";
import {
  buildNsaaYearPageCopy,
  getNsaaConversionYears,
  isNsaaConversionYear,
  loadNsaaYearPageData,
} from "@/lib/scoreConverter/nsaaYearConversion";
import { buildNoIndexMetadata } from "@/lib/seo/noIndex";

export const dynamic = "force-static";

export function generateStaticParams() {
  return getNsaaConversionYears().map((year) => ({ year: String(year) }));
}

export function generateMetadata({
  params,
}: {
  params: { year: string };
}): Metadata {
  const year = Number(params.year);
  if (!Number.isFinite(year) || !isNsaaConversionYear(year)) {
    return { title: "NSAA Score Conversion" };
  }
  const data = loadNsaaYearPageData(year);
  if (!data) return { title: "NSAA Score Conversion" };
  const copy = buildNsaaYearPageCopy(data);
  return buildNoIndexMetadata({
    title: copy.title,
    description: copy.description,
  });
}

export default function NsaaYearScoreConverterPage({
  params,
}: {
  params: { year: string };
}) {
  const year = Number(params.year);
  if (!Number.isFinite(year) || !isNsaaConversionYear(year)) notFound();
  const data = loadNsaaYearPageData(year);
  if (!data) notFound();

  return <NsaaYearConversionPage data={data} />;
}
