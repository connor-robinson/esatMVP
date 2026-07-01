import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ScoreConverter } from "@/components/tools/scoreConverter/ScoreConverter";
import {
  EXAM_FULL_NAME,
  isConverterExam,
  type ConverterExam,
} from "@/lib/scoreConverter/esatModules";

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
  const full = EXAM_FULL_NAME[exam];
  const title = `${exam} Score Converter — raw marks to scaled score & percentile`;
  const description = `Convert your ${exam} (${full}) past-paper raw marks into an estimated scaled score (1.0–9.0) and percentile. A historical proxy for ESAT-style performance, built from official ${exam} conversion data.`;
  return {
    title,
    description,
    openGraph: { title, description },
    alternates: { canonical: `/tools/score-converter/${exam.toLowerCase()}` },
  };
}

export default function ExamScoreConverterPage({
  params,
}: {
  params: { exam: string };
}) {
  const raw = params.exam ?? "";
  if (!isConverterExam(raw)) notFound();
  const exam = raw.toUpperCase() as ConverterExam;
  return <ScoreConverter exam={exam} />;
}
