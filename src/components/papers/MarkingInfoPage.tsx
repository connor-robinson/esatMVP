/**
 * Marking Info Page Component - Combined completion summary and marking instructions with visual illustrations
 * Uses real session data: derived correctness, overview stats, predicted score, and sample question.
 */

"use client";

import { useMemo, useEffect, useState, useCallback } from "react";
import { usePaperSessionStore } from "@/store/paperSessionStore";
import { getConversionTable, getConversionRows, scaleScore } from "@/lib/supabase/questions";
import type { PaperSection } from "@/types/papers";
import { getSectionSubjectPillClass } from "@/config/colors";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";
import { MISTAKE_OPTIONS } from "@/types/papers";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface MarkingInfoPageProps {
  selectedSections: PaperSection[];
  onNext: () => void;
}

export function MarkingInfoPage({
  selectedSections,
  onNext,
}: MarkingInfoPageProps) {
  const {
    allSectionsQuestions,
    questions,
    answers,
    perQuestionSec,
    guessedFlags,
    correctFlags,
    questionRange,
    paperId,
    getTotalQuestions,
    sectionTimeLimits,
  } = usePaperSessionStore();

  const totalQuestions = getTotalQuestions();
  const questionNumbers = totalQuestions > 0
    ? Array.from({ length: totalQuestions }, (_, i) => questionRange.start + i)
    : [];

  // Derived correctness (same logic as mark page: compare user answer to answerLetter when correctFlags not set)
  const derivedCorrectFlags = useMemo(() => {
    return questionNumbers.map((_, i) => {
      if (correctFlags[i] !== null && correctFlags[i] !== undefined) return correctFlags[i];
      const user = (answers[i]?.choice || "").toString().toUpperCase();
      const correct = (questions[i]?.answerLetter || "").toString().toUpperCase();
      if (!correct) return null;
      if (!user) return false;
      return user === correct;
    });
  }, [questionNumbers, correctFlags, answers, questions]);

  const correctCount = useMemo(
    () => derivedCorrectFlags.filter((f) => f === true).length,
    [derivedCorrectFlags]
  );
  const scorePct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const totalTimeSec = useMemo(
    () => (perQuestionSec || []).reduce((a, b) => a + (b || 0), 0),
    [perQuestionSec]
  );
  const avgTimeFormatted =
    totalQuestions > 0 ? formatTime(totalTimeSec / totalQuestions) : "0:00";
  const guessedCount = useMemo(
    () => (guessedFlags || []).filter(Boolean).length,
    [guessedFlags]
  );

  // Section analytics (correct/total per part) for predicted score
  const sectionAnalytics = useMemo(() => {
    const analytics: Record<string, { correct: number; total: number }> = {};
    const qs = questions || [];
    const examName = (qs[0]?.examName || "").toUpperCase();
    const isNSAA2019 = examName === "NSAA" && qs[0]?.examYear === 2019;

    for (let i = 0; i < qs.length; i++) {
      const q = qs[i];
      if (!q) continue;
      let part = (q.partLetter || "").trim();
      const partName = (q.partName || "").trim();
      if (!part || part === "—" || part === "") {
        if (partName && isNSAA2019) {
          const pl = partName.toLowerCase();
          if (pl.includes("advanced mathematics") && pl.includes("advanced physics")) part = "Part E";
          else if (pl.includes("mathematics") && !pl.includes("advanced")) part = "Part A";
          else if (pl.includes("physics") && !pl.includes("advanced")) part = "Part B";
          else if (pl.includes("chemistry") || pl.includes("biology")) continue;
        }
        if (!part || part === "—") part = "Section";
      }
      const partUpper = part.toUpperCase();
      if (partUpper === "SECTION" || partUpper.startsWith("SECTION ")) continue;
      if (isNSAA2019) {
        const valid = ["PART A", "PART B", "PART E", "A", "B", "E"];
        const ok = valid.some(
          (v) => partUpper === v || partUpper === `PART ${v}` || (partUpper.includes(v) && !partUpper.includes("SECTION"))
        );
        const isPartE = partName.toLowerCase().includes("advanced mathematics") && partName.toLowerCase().includes("advanced physics");
        if (!ok && !isPartE) continue;
      }
      const key = part || "Section";
      if (!analytics[key]) analytics[key] = { correct: 0, total: 0 };
      analytics[key].total++;
      if (derivedCorrectFlags[i] === true) analytics[key].correct++;
    }
    return analytics;
  }, [questions, derivedCorrectFlags]);

  const resolveConversionPartName = useCallback(
    (examName: string, partLetterRaw: string, partName: string | undefined, rows: any[]): { name: string } => {
      const raw = (partLetterRaw || "").toString().trim().toUpperCase();
      const letter = raw.length === 1 && /[A-Z]/.test(raw) ? raw : (raw.match(/\b([A-Z])\b/)?.[1] || "");
      const candidateNames: string[] = [];
      if (examName === "TMUA") {
        if (partName?.toLowerCase().includes("paper 1")) candidateNames.push("Paper 1");
        if (partName?.toLowerCase().includes("paper 2")) candidateNames.push("Paper 2");
        if (letter === "A" || letter === "1") candidateNames.push("Paper 1");
        if (letter === "B" || letter === "2") candidateNames.push("Paper 2");
      }
      if (examName === "ENGAA") {
        if (/A/.test(letter)) candidateNames.push("Section 1A");
        else if (/B/.test(letter)) candidateNames.push("Section 1B");
        else if (/2/.test(letter)) candidateNames.push("Section 2");
      }
      if (examName === "NSAA") {
        if (letter === "A") candidateNames.push("Part A");
        if (letter === "B") candidateNames.push("Part B");
        if (letter === "C") candidateNames.push("Part C");
        if (letter === "D") candidateNames.push("Part D");
        if (letter === "E") candidateNames.push("Part E");
        if (partName?.toLowerCase().includes("math") && !partName.includes("advanced")) candidateNames.push("Part A");
        if (partName?.toLowerCase().includes("phys") && !partName.includes("advanced")) candidateNames.push("Part B");
        if (partName?.toLowerCase().includes("chem")) candidateNames.push("Part C");
        if (partName?.toLowerCase().includes("biol")) candidateNames.push("Part D");
        if (partName?.toLowerCase().includes("advanced")) candidateNames.push("Part E");
      }
      if (letter) candidateNames.push(`Part ${letter}`);
      if (raw) candidateNames.push(raw);
      if (partName) candidateNames.push(partName);
      const rowsLower = rows.map((r: any) => (r.partName || "").toString().toLowerCase());
      const match = candidateNames.find((n) => rowsLower.includes(n.toLowerCase()));
      return { name: match || candidateNames[0] || partName || letter || "Section" };
    },
    []
  );

  const [predictedScore, setPredictedScore] = useState<number | null | "loading">("loading");
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!paperId || questions.length === 0) {
        if (mounted) setPredictedScore(null);
        return;
      }
      try {
        const table = await getConversionTable(paperId);
        if (!mounted) return;
        if (!table) {
          setPredictedScore(null);
          return;
        }
        const rows = await getConversionRows(table.id);
        if (!mounted) return;
        if (!rows || rows.length === 0) {
          setPredictedScore(null);
          return;
        }
        const examName = (questions[0]?.examName || "").toUpperCase();
        const entries = Object.entries(sectionAnalytics);
        let weightedSum = 0;
        let totalWeight = 0;
        for (const [section, data] of entries) {
          const sectionUpper = section.toUpperCase();
          if (sectionUpper === "SECTION" || sectionUpper.startsWith("SECTION ")) continue;
          const match = questions.find((q) => (q.partLetter || "").trim() === section);
          const partLetterRaw = (match?.partLetter || section).toString().toUpperCase();
          const { name: convPartName } = resolveConversionPartName(examName, partLetterRaw, match?.partName, rows);
          const scaled = scaleScore(rows as any, convPartName as any, data.correct, "nearest");
          if (typeof scaled === "number") {
            weightedSum += scaled * data.total;
            totalWeight += data.total;
          }
        }
        if (mounted) {
          setPredictedScore(totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : null);
        }
      } catch {
        if (mounted) setPredictedScore(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [paperId, questions, sectionAnalytics, resolveConversionPartName]);

  const wrongCount = useMemo(
    () => derivedCorrectFlags.filter((f) => f === false).length,
    [derivedCorrectFlags]
  );

  // Map sections to part info
  const sectionPartInfo = useMemo(() => {
    const info: Array<{ section: PaperSection; partLetter: string; partName: string }> = [];
    
    selectedSections.forEach((section, index) => {
      // Try to get from allSectionsQuestions first (most reliable)
      let firstQuestion = null;
      if (allSectionsQuestions.length > index && allSectionsQuestions[index]?.length > 0) {
        firstQuestion = allSectionsQuestions[index][0];
      } else if (questions.length > 0) {
        // Fallback: find first question that matches this section
        // For now, just use first question as fallback
        firstQuestion = questions[0];
      }
      
      // Extract part info
      let partLetter: string = section;
      let partName: string = section;
      
      if (firstQuestion) {
        const letter = (firstQuestion.partLetter || '').toString().trim();
        const name = (firstQuestion.partName || '').toString().trim();
        if (letter) partLetter = letter;
        if (name) partName = name;
      }
      
      // Format part letter (ensure "Part " prefix if not present)
      if (!partLetter.toLowerCase().startsWith('part ')) {
        partLetter = `Part ${partLetter}`;
      }
      
      info.push({ section, partLetter, partName });
    });
    
    return info;
  }, [selectedSections, allSectionsQuestions, questions]);

  const hasData = questions.length > 0 && totalQuestions > 0;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg space-y-8 rounded-organic-xl border border-border bg-surface-elevated p-8 shadow-bar-floating">
        <header className="space-y-2 text-center sm:text-left">
          <h1 className="text-2xl font-bold text-text">You have completed:</h1>
          <p className="text-sm text-text-muted">
            Next step: Review your answer and analyse your performance
          </p>
        </header>

        <ul className="divide-y divide-border-subtle rounded-organic-md border border-border-subtle bg-surface-mid/40">
          {sectionPartInfo.map(({ section, partLetter, partName }, index) => {
            const limit = sectionTimeLimits?.[index];
            const showClock = typeof limit === "number" && limit > 0;
            return (
              <li
                key={`${partLetter}-${index}`}
                className="flex items-center justify-between gap-3 px-4 py-3.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
                      getSectionSubjectPillClass(section)
                    )}
                  >
                    {partLetter}
                  </span>
                  <span className="truncate text-sm text-text">{partName}</span>
                </div>
                {showClock ? (
                  <Clock className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
                ) : null}
              </li>
            );
          })}
        </ul>

        {hasData ? (
          <div className="grid grid-cols-2 gap-2 rounded-organic-md border border-border-subtle bg-surface-mid/30 p-3">
            <div className="rounded-organic-sm border border-border-subtle bg-surface-elevated p-3 text-center">
              <div className="text-2xl font-bold text-text">{scorePct}%</div>
              <div className="text-[10px] text-text-muted">
                {correctCount}/{totalQuestions} correct
              </div>
            </div>
            <div className="rounded-organic-sm border border-border-subtle bg-surface-elevated p-3 text-center">
              <div className="text-2xl font-bold text-text">
                {predictedScore === "loading" ? "…" : predictedScore ?? "—"}
              </div>
              <div className="text-[10px] text-text-muted">Predicted score</div>
            </div>
            <div className="rounded-organic-sm border border-border-subtle bg-surface-elevated p-3 text-center">
              <div className="text-lg font-semibold text-text">{avgTimeFormatted}</div>
              <div className="text-[10px] text-text-muted">Avg / question</div>
            </div>
            <div className="rounded-organic-sm border border-border-subtle bg-surface-elevated p-3 text-center">
              <div className="text-lg font-semibold text-text">
                {guessedCount}/{totalQuestions}
              </div>
              <div className="text-[10px] text-text-muted">Guessed</div>
            </div>
            <div className="col-span-2 rounded-organic-sm border border-border-subtle bg-surface-elevated px-3 py-2 text-center">
              <div className="text-xs text-text-muted">
                {wrongCount === 1
                  ? "1 question flagged for review"
                  : `${wrongCount} questions flagged for review`}
              </div>
              <div className="mt-1 flex flex-wrap justify-center gap-1.5">
                {MISTAKE_OPTIONS.slice(1, 5).map((tag) => (
                  <span
                    key={tag}
                    className="rounded px-2 py-0.5 text-[10px] bg-surface-subtle text-text-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <Button type="button" variant="wide" size="lg" onClick={onNext}>
          Continue To Mark
          <span aria-hidden className="font-mono">
            →
          </span>
        </Button>
      </div>
    </div>
  );
}

