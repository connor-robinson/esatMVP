"use client";

import Link from "next/link";
import { useState } from "react";
import { PearsonExamPlayer } from "@/components/pearson/PearsonExamPlayer";
import { PEARSON_DEMO_PAPER } from "@/lib/pearson/pearsonDemoConfig";
import type { PearsonModuleResult } from "@/lib/pearson/types";
import type { Question } from "@/types/papers";

interface PearsonDemoClientProps {
  questions: Question[];
}

export function PearsonDemoClient({ questions }: PearsonDemoClientProps) {
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<PearsonModuleResult | null>(null);

  if (done && result) {
    return (
      <main style={{ padding: 24, fontFamily: "Tahoma, sans-serif" }}>
        <h1 style={{ fontSize: 18 }}>Module complete</h1>
        <p style={{ fontSize: 13 }}>
          {PEARSON_DEMO_PAPER.examTitle} · unused time:{" "}
          {Math.round(result.unusedMs / 1000)}s
        </p>
        <Link href="/past-papers/pearson-demo" style={{ color: "#026bac" }}>
          Restart
        </Link>
        {" · "}
        <Link href="/pearson/controls" style={{ color: "#026bac" }}>
          Controls coach
        </Link>
      </main>
    );
  }

  return (
    <PearsonExamPlayer
      mode="strict-simulation"
      examTitle={PEARSON_DEMO_PAPER.examTitle}
      questions={questions}
      timeLimitSeconds={PEARSON_DEMO_PAPER.timeLimitSeconds}
      moduleTransition={{ enabled: false }}
      onModuleComplete={(r) => {
        setResult(r);
        setDone(true);
      }}
    />
  );
}
