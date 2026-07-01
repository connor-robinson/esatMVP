import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { CONVERTER_EXAMS, EXAM_FULL_NAME } from "@/lib/scoreConverter/esatModules";

export const metadata: Metadata = {
  title: "Score Converter — NSAA, ENGAA & TMUA raw marks to scaled score",
  description:
    "Convert raw marks from NSAA, ENGAA or TMUA past papers into an estimated scaled score (1.0–9.0) and percentile. A historical proxy for ESAT-style performance, built from official conversion data.",
  alternates: { canonical: "/tools/score-converter" },
};

const EXAM_BLURB: Record<string, string> = {
  NSAA: "Parts A–E and Section 2 sciences, mapped to ESAT modules.",
  ENGAA: "Section 1 (Maths & Physics) and Section 2, per sitting.",
  TMUA: "Paper 1 & Paper 2, with old↔new scale handling for 2024+.",
};

const EXAM_ACCENT: Record<string, string> = {
  NSAA: "text-maths",
  ENGAA: "text-advanced",
  TMUA: "text-tmua-accent",
};

export default function ScoreConverterLandingPage() {
  return (
    <Container size="md" className="py-12 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-subtle">
        Exam Tools
      </p>
      <h1 className="mt-2 text-3xl font-bold text-text">Score Converter</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-muted">
        Turn raw marks from a past paper into an estimated scaled score (1.0–9.0)
        and percentile. Pick your exam to get started — everything is derived from
        official conversion data and framed as a historical proxy for ESAT-style
        performance, not an official ESAT score.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {CONVERTER_EXAMS.map((exam) => (
          <Link
            key={exam}
            href={`/tools/score-converter/${exam.toLowerCase()}`}
            className="group flex flex-col rounded-organic-lg bg-surface-elevated p-5 shadow-modal-card transition-all duration-fast ease-signature hover:-translate-y-0.5 active:scale-[0.99]"
          >
            <span className={`text-xl font-bold ${EXAM_ACCENT[exam]}`}>{exam}</span>
            <span className="mt-0.5 text-xs font-medium text-text-subtle">
              {EXAM_FULL_NAME[exam]}
            </span>
            <span className="mt-3 flex-1 text-sm leading-relaxed text-text-muted">
              {EXAM_BLURB[exam]}
            </span>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-text">
              Convert scores
              <ArrowRight className="h-4 w-4 transition-transform duration-fast group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </Container>
  );
}
