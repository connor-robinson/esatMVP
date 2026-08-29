"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PearsonExamPlayer } from "@/components/pearson/PearsonExamPlayer";
import { PEARSON_DEMO_PAPER } from "@/lib/pearson/pearsonDemoConfig";
import {
  formatPearsonSectionHeading,
  splitQuestionsIntoSections,
} from "@/lib/pearson/splitPaperSections";
import type { PearsonModuleResult } from "@/lib/pearson/types";
import type { Question } from "@/types/papers";

interface PearsonDemoClientProps {
  initialQuestions?: Question[];
}

export function PearsonDemoClient({ initialQuestions }: PearsonDemoClientProps) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions ?? []);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialQuestions?.length);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [done, setDone] = useState(false);

  const sections = useMemo(
    () => splitQuestionsIntoSections(questions),
    [questions],
  );
  const currentSection = sections[sectionIndex] ?? null;
  const isLastSection =
    sections.length > 0 && sectionIndex >= sections.length - 1;

  useEffect(() => {
    if (initialQuestions?.length) {
      setQuestions(initialQuestions);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/past-papers/pearson-demo", {
          cache: "no-store",
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || `${response.status} ${response.statusText}`);
        }
        if (!cancelled) {
          setQuestions(Array.isArray(payload.questions) ? payload.questions : []);
          setLoadError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Failed to load paper");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialQuestions]);

  if (loading) {
    return (
      <main style={{ padding: 24, fontFamily: "Tahoma, sans-serif", fontSize: 13 }}>
        Loading {PEARSON_DEMO_PAPER.examTitle}…
      </main>
    );
  }

  if (loadError || questions.length === 0 || sections.length === 0) {
    return (
      <main style={{ padding: 24, fontFamily: "Tahoma, sans-serif", fontSize: 13 }}>
        <p>Could not load {PEARSON_DEMO_PAPER.examTitle}.</p>
        {loadError ? <p style={{ color: "#b00000" }}>{loadError}</p> : null}
        <Link href="/past-papers/pearson-demo" style={{ color: "#026bac" }}>
          Retry
        </Link>
      </main>
    );
  }

  if (done) {
    return (
      <main style={{ padding: 24, fontFamily: "Tahoma, sans-serif" }}>
        <h1 style={{ fontSize: 18 }}>Paper complete</h1>
        <p style={{ fontSize: 13 }}>
          {PEARSON_DEMO_PAPER.examTitle} · {questions.length} questions ·{" "}
          {sections.length} sections completed
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

  if (!currentSection) {
    return null;
  }

  const sectionHeading = formatPearsonSectionHeading(
    currentSection,
    PEARSON_DEMO_PAPER.examTitle,
  );

  return (
    <PearsonExamPlayer
      key={`${currentSection.sectionKey}-${sectionIndex}`}
      mode="strict-simulation"
      examTitle={PEARSON_DEMO_PAPER.examTitle}
      questions={currentSection.questions}
      timeLimitSeconds={currentSection.timeLimitSeconds}
      introMode={sectionIndex === 0 ? "full" : "section-only"}
      suppressCompleteScreen={!isLastSection}
      sectionHeading={sectionHeading}
      moduleTransition={{ enabled: false }}
      onModuleComplete={(_result: PearsonModuleResult) => {
        if (isLastSection) {
          setDone(true);
          return;
        }
        setSectionIndex((index) => index + 1);
      }}
    />
  );
}
