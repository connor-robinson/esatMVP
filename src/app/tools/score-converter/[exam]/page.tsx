import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExamScoreConverterShell } from "@/components/tools/scoreConverter/ExamScoreConverterShell";
import {
  EXAM_FULL_NAME,
  isConverterExam,
  type ConverterExam,
} from "@/lib/scoreConverter/esatModules";
import { SCORE_CONVERTER_PAGE_COPY } from "@/lib/scoreConverter/scoreConverterPageCopy";
import { buildSeoMetadata } from "@/lib/seo/config";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return [{ exam: "nsaa" }, { exam: "engaa" }, { exam: "tmua" }];
}

export function generateMetadata({
  params,
}: {
  params: { exam: string };
}): Metadata {
  const raw = params.exam ?? "";
  if (!isConverterExam(raw)) {
    return { title: "Score Converter" };
  }
  const exam = raw.toUpperCase() as ConverterExam;
  const copy = SCORE_CONVERTER_PAGE_COPY[exam];
  return buildSeoMetadata({
    title: copy.title,
    description: copy.description,
    path: `/tools/score-converter/${exam.toLowerCase()}`,
    keywords: [
      `${exam} score converter`,
      `${exam} raw marks`,
      EXAM_FULL_NAME[exam],
      "ESAT score converter",
    ],
  });
}

export default async function ExamScoreConverterPage({
  params,
}: {
  params: { exam: string };
}) {
  const raw = params.exam ?? "";
  if (!isConverterExam(raw)) notFound();
  const exam = raw.toUpperCase() as ConverterExam;

  return (
    <>
      {exam === "NSAA" ? (
        <div className="pt-6">
          <NsaaConversionYearNav heading="NSAA score conversion by year" />
        </div>
      ) : null}
      <ExamScoreConverterShell initialExam={exam} />
    </>
  );
}
