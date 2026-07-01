import type { Metadata } from "next";
import { ScoreConverter } from "@/components/tools/scoreConverter/ScoreConverter";

export const metadata: Metadata = {
  title: "Score Converter — NSAA, ENGAA & TMUA",
  description:
    "Convert past-paper raw marks into scaled score (1.0–9.0) and percentile. NSAA, ENGAA and TMUA.",
  alternates: { canonical: "/tools/score-converter" },
};

export default function ScoreConverterPage() {
  return <ScoreConverter />;
}
