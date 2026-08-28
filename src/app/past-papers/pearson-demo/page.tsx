"use client";

import Link from "next/link";
import { useState } from "react";
import { PearsonExamPlayer } from "@/components/pearson/PearsonExamPlayer";
import { PEARSON_DEMO_QUESTIONS } from "@/lib/pearson/demoQuestions";
import type { PearsonModuleResult } from "@/lib/pearson/types";

/**
 * Dev-only Pearson player preview with sample LaTeX questions.
 * Open at /past-papers/pearson-demo for visual checks and screenshots.
 */
export default function PearsonDemoPage() {
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<PearsonModuleResult | null>(null);

  if (done && result) {
    return (
      <main style={{ padding: 24, fontFamily: "Tahoma, sans-serif" }}>
        <h1 style={{ fontSize: 18 }}>Module complete (demo)</h1>
        <p style={{ fontSize: 13 }}>
          Unused time: {Math.round(result.unusedMs / 1000)}s
        </p>
        <Link href="/past-papers/pearson-demo" style={{ color: "#026bac" }}>
          Restart demo
        </Link>
        {" · "}
        <Link href="/past-papers/pearson-controls" style={{ color: "#026bac" }}>
          Controls coach
        </Link>
      </main>
    );
  }

  return (
    <PearsonExamPlayer
      mode="strict-simulation"
      examTitle="ESAT Mathematics 1 (demo)"
      questions={PEARSON_DEMO_QUESTIONS}
      timeLimitSeconds={40 * 60}
      moduleTransition={{ enabled: false }}
      onModuleComplete={(r) => {
        setResult(r);
        setDone(true);
      }}
    />
  );
}
