"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PearsonExamPlayer } from "@/components/pearson/PearsonExamPlayer";
import type { PearsonModuleResult } from "@/lib/pearson/types";
import type { Question } from "@/types/papers";

type PreviewMeta = {
  id: string;
  title: string;
  subject: string;
  status: string;
  questionCount: number;
  timeLimitMinutes: number;
};

export function MockPearsonPreviewClient() {
  const params = useParams();
  const mockId = String(params.mockId);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [meta, setMeta] = useState<PreviewMeta | null>(null);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(40 * 60);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const [missingSlots, setMissingSlots] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(
          `/api/admin/mock-builder/${mockId}/preview`,
          { cache: "no-store" },
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(
            payload.error || `${response.status} ${response.statusText}`,
          );
        }
        if (cancelled) return;
        setMeta(payload.mock ?? null);
        setQuestions(Array.isArray(payload.questions) ? payload.questions : []);
        setTimeLimitSeconds(
          typeof payload.timeLimitSeconds === "number"
            ? payload.timeLimitSeconds
            : 40 * 60,
        );
        setMissingSlots(Number(payload.missingSlots ?? 0));
        setLoadError(null);
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to load mock",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mockId]);

  const backHref = `/admin/mock-builder/${mockId}`;
  const examTitle = meta?.title ?? "ESAT mock preview";

  if (loading) {
    return (
      <main
        style={{ padding: 24, fontFamily: "Tahoma, sans-serif", fontSize: 13 }}
      >
        Loading Pearson preview…
      </main>
    );
  }

  if (loadError || questions.length === 0) {
    return (
      <main
        style={{ padding: 24, fontFamily: "Tahoma, sans-serif", fontSize: 13 }}
      >
        <p>Could not load this mock for Pearson preview.</p>
        {loadError ? <p style={{ color: "#b00000" }}>{loadError}</p> : null}
        {questions.length === 0 && !loadError ? (
          <p>This mock has no slotted questions yet.</p>
        ) : null}
        <Link href={backHref} style={{ color: "#026bac" }}>
          Back to mock
        </Link>
      </main>
    );
  }

  if (done) {
    return (
      <main style={{ padding: 24, fontFamily: "Tahoma, sans-serif" }}>
        <h1 style={{ fontSize: 18 }}>Preview complete</h1>
        <p style={{ fontSize: 13 }}>
          {examTitle} · {questions.length} questions
          {missingSlots > 0 ? ` · ${missingSlots} empty slot(s) skipped` : ""}
        </p>
        <p style={{ fontSize: 13, marginTop: 8 }}>
          Answers were not saved. This is an admin preview only.
        </p>
        <Link href={backHref} style={{ color: "#026bac" }}>
          Back to mock
        </Link>
        {" · "}
        <button
          type="button"
          onClick={() => {
            setDone(false);
            setRunKey((k) => k + 1);
          }}
          style={{
            color: "#026bac",
            background: "none",
            border: "none",
            padding: 0,
            font: "inherit",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          Restart preview
        </button>
      </main>
    );
  }

  return (
    <>
      {missingSlots > 0 ? (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            background: "#fff8e6",
            color: "#5c4a00",
            fontFamily: "Tahoma, sans-serif",
            fontSize: 12,
            padding: "6px 12px",
            textAlign: "center",
          }}
        >
          Admin preview · {missingSlots} empty slot(s) skipped ·{" "}
          <Link href={backHref} style={{ color: "#026bac" }}>
            Exit
          </Link>
        </div>
      ) : (
        <div
          style={{
            position: "fixed",
            top: 8,
            right: 12,
            zIndex: 50,
            fontFamily: "Tahoma, sans-serif",
            fontSize: 12,
          }}
        >
          <Link
            href={backHref}
            style={{
              color: "#026bac",
              background: "rgba(255,255,255,0.92)",
              padding: "4px 8px",
              textDecoration: "none",
            }}
          >
            Exit preview
          </Link>
        </div>
      )}
      <PearsonExamPlayer
        key={`${mockId}-preview-${runKey}`}
        mode="strict-simulation"
        examTitle={examTitle}
        questions={questions}
        timeLimitSeconds={timeLimitSeconds}
        introMode="full"
        sectionHeading={`Part A: ${meta?.subject ?? "ESAT"}`}
        moduleTransition={{ enabled: false }}
        isLastModule
        showQuestionReport={false}
        onModuleComplete={(_result: PearsonModuleResult) => {
          setDone(true);
        }}
      />
    </>
  );
}
