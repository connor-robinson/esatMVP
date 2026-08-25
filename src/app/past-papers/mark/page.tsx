/**
 * Papers Mark page - Marking and review interface
 */

"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef, Fragment } from "react";
import { Info } from "lucide-react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PaperBadge } from "@/components/papers/PaperBadge";
import { ChoicePill } from "@/components/papers/ChoicePill";
import { TimeScatterChart } from "@/components/papers/TimeScatterChart";
import { MarkSessionMistakesSection } from "@/components/papers/mark/MarkSessionMistakesSection";
import { MathContent } from "@/components/shared/MathContent";
import { EsatCampMockReviewPanel } from "@/components/papers/esatCampMocks/EsatCampMockReviewPanel";
import { PastPaperTextQuestion } from "@/components/papers/PastPaperTextQuestion";
import { shouldRenderPastPaperAsText } from "@/lib/papers/pastPaperTextMode";
import {
  ESAT_CAMP_MOCK_DISCLOSURE,
  isEsatCampMockExamType,
} from "@/lib/papers/esatCampMocks";
import {
  predictEsatCampOverallScore,
  predictEsatCampSectionScore,
} from "@/lib/papers/esatCampMockPredictedScore";
import { usePaperSessionStore } from "@/store/paperSessionStore";
import {
  cssVar,
  getMarkAnswerBadgeClass,
  getMarkReviewToggleActiveClass,
  getMarkSessionPartHeaderClass,
  getSectionBarTrackClass,
  getSectionSubjectPillClass,
  ON_SOLID_SUBJECT_TEXT,
} from "@/config/colors";
import { cn } from "@/lib/utils";
import {
  buildPercentileTableArgs,
  computePredictedScore,
  computeScaledScore,
  findQuestionForSection,
  resolveTmuaPercentileTableKey,
} from "@/lib/papers/markScoring";
import { mapPartToSection, mapTmuaPaperNameToSection } from "@/lib/papers/sectionMapping";
import {
  formatMarkPartDisplay,
  formatSessionVariantLabel,
  formatSolutionTextForDisplay,
  getSessionQuestionNumber,
  resolveMarkPartKey,
} from "@/lib/papers/markQuestionUtils";
import { MISTAKE_OPTIONS } from "@/types/papers";
import {
  findFallbackConversionTable,
  getConversionRows,
  getConversionTable,
  loadConversionRowsByPaperIds,
} from "@/lib/supabase/questions";
import { fetchEsatTable, interpolatePercentile, interpolateScore, mapSectionToTable, averageEsatDistributionTables, type EsatRow } from "@/lib/esat/percentiles";
import { cropImageToContent } from "@/lib/utils/imageCrop";
import type { ConversionRow, ExamName, Letter, MistakeTag } from "@/types/papers";
import type { QuestionStats } from "@/types/questionStats";
import { MarkSectionNav,
  type MarkSection,
} from "@/components/papers/mark/MarkSectionNav";
import { PercentileMiniChart } from "@/components/papers/mark/PercentileMiniChart";
import { DrillUpgradeBanner } from "@/components/builder/DrillUpgradeBanner";
import { useSubscription } from "@/hooks/useSubscription";

const LETTERS: Letter[] = ["A", "B", "C", "D", "E", "F", "G", "H"];

export default function PapersMarkPage() {
  const router = useRouter();
  // Change this width to adjust left spacing for Overview, Part headers, and Qn labels together
  const LEFT_LABEL_WIDTH_PX = 7;
  // Adjustable width of the left column (question list)
  const LEFT_COLUMN_WIDTH_PX = 270; // increase/decrease to change overall left pane width
  // For symmetry with the right-side scrollbar gutter, add equivalent left padding
  const SCROLLBAR_GUTTER_PX = 14;
  // Scale factor for inline images in the right panel (non-fullscreen)
  const RIGHT_PANEL_IMAGE_SCALE = 0.7; // 70%
  const {
    sessionId,
    paperId,
    paperName,
    paperVariant,
    sessionName,
    questionRange,
    answers,
    perQuestionSec,
    correctFlags,
    guessedFlags,
    mistakeTags,
    notes,
    startedAt,
    endedAt,
    timeLimitMinutes,
    setCorrectChoice,
    setAddToDrill,
    setCorrectFlag,
    setGuessedFlag,
    setMistakeTag,
    setNotes,
    getTotalQuestions,
    getCorrectCount,
    isMarkingInfo,
    questions,
    selectedPartIds,
  } = usePaperSessionStore();
  const { hasFullAccess, isLoading: subscriptionLoading } = useSubscription();
  const treatAsFullAccess = subscriptionLoading || hasFullAccess;
  
  const [markSection, setMarkSection] = useState<MarkSection>("overview");
  const [reviewReturnSection, setReviewReturnSection] = useState<MarkSection | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<'question' | 'solution' | null>(null);
  const [drillSelection, setDrillSelection] = useState<number[]>([]);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [conversionRows, setConversionRows] = useState<ConversionRow[]>([]);
  const [conversionRowsByPaperId, setConversionRowsByPaperId] = useState<
    Map<number, ConversionRow[]>
  >(new Map());
  const [hasConversion, setHasConversion] = useState(false);
  const [croppedQuestionImage, setCroppedQuestionImage] = useState<string | null>(null);
  const [croppedAnswerImage, setCroppedAnswerImage] = useState<string | null>(null);
  // Session notes saving UX
  const [sessionNoteStatus, setSessionNoteStatus] = useState<'idle' | 'typing' | 'saved'>('idle');
  const sessionNoteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Section percentiles state - for all exams
  const [sectionPercentiles, setSectionPercentiles] = useState<Record<string, { percentile: number | null; score: number | null; table: string | null; label: string; oldPercentile?: number | null; newEquivalentScore?: number | null }>>({});
  const [percentileTables, setPercentileTables] = useState<Record<string, { score: number; cumulativePct: number }[]>>({});
  const [selectedPercentileSection, setSelectedPercentileSection] = useState<string>("");
  // NSAA: averaged percentile across all subjects
  const [nsaaAveragedPercentile, setNsaaAveragedPercentile] = useState<number | null>(null);
  const [nsaaAveragedScore, setNsaaAveragedScore] = useState<number | null>(null);
  const [nsaaAveragedChartRows, setNsaaAveragedChartRows] = useState<EsatRow[]>([]);
  // Community stats state
  const [questionStats, setQuestionStats] = useState<Record<number, QuestionStats>>({});
  const [statsLoading, setStatsLoading] = useState(false);
  
  // Compute values needed for hooks (with safe defaults if no session)
  const totalQuestions = sessionId
    ? questions.length > 0
      ? questions.length
      : getTotalQuestions()
    : 0;
  const correctCount = sessionId ? getCorrectCount() : 0;
  const maxQuestionNumber = sessionId && totalQuestions > 0
    ? Math.max(
        ...questions.map((q, i) => getSessionQuestionNumber(questions, i, questionRange)),
      )
    : 0;
  const maxDigits = Math.max(1, String(maxQuestionNumber).length);
  const QUESTION_LABEL_WIDTH_PX = maxDigits >= 3 ? 36 : 28;
  const questionNumbers = useMemo(() => {
    if (!sessionId || questions.length === 0) return [];
    return questions.map((_, i) =>
      getSessionQuestionNumber(questions, i, questionRange),
    );
  }, [sessionId, questions, questionRange]);
  
  // All hooks must be called before any early returns
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const qs = usePaperSessionStore.getState().questions;
        const currentExamName = (qs?.[0]?.examName || "").toUpperCase();
        const paperIdsFromQuestions = [
          ...new Set(
            (qs || [])
              .map((q) => q.paperId)
              .filter((id): id is number => typeof id === "number" && id > 0),
          ),
        ];
        const idsToLoad =
          paperIdsFromQuestions.length > 0
            ? paperIdsFromQuestions
            : paperId
              ? [paperId]
              : [];

        if (idsToLoad.length === 0) return;

        let rowsByPaper = await loadConversionRowsByPaperIds(idsToLoad);

        if (rowsByPaper.size === 0 && paperId) {
          const table = await getConversionTable(paperId as number);
          if (table) {
            const rows = await getConversionRows(table.id);
            if (rows.length > 0) {
              rowsByPaper = new Map([[paperId, rows]]);
            }
          }
        }

        if (rowsByPaper.size === 0 && qs?.[0]?.examName && qs?.[0]?.examYear) {
          const examType = qs[0].examType as any;
          const fallback = await findFallbackConversionTable(
            qs[0].examName as ExamName,
            qs[0].examYear,
            examType,
          );
          if (fallback) {
            const rows = await getConversionRows(fallback.id);
            if (rows.length > 0) {
              rowsByPaper = new Map([[fallback.paperId, rows]]);
            }
          }
        }

        if (!mounted) return;

        if (currentExamName && qs?.length) {
          const mismatched = [...rowsByPaper.entries()].filter(([pid]) => {
            const sample = qs.find((q) => q.paperId === pid);
            return (
              sample &&
              (sample.examName || "").toUpperCase() !== currentExamName
            );
          });
          if (mismatched.length > 0) {
            rowsByPaper = new Map();
          }
        }

        const merged = Array.from(rowsByPaper.values()).flat();
        setConversionRowsByPaperId(rowsByPaper);
        setConversionRows(merged);
        setHasConversion(merged.length > 0);
      } catch {
        if (!mounted) return;
        setConversionRowsByPaperId(new Map());
        setConversionRows([]);
        setHasConversion(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [paperId, questions]);

  // Fetch community stats for all questions in session
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!treatAsFullAccess || !sessionId || totalQuestions === 0) return;
        
        const qs = usePaperSessionStore.getState().questions;
        const questionIds = qs.map((q) => q.id).filter((id) => id != null);
        
        if (questionIds.length === 0) return;
        
        setStatsLoading(true);
        const response = await fetch("/api/past-papers/questions/stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionIds }),
        });
        
        if (!mounted) return;
        
        if (!response.ok) {
          return;
        }
        
        const data = await response.json();
        if (!mounted) return;
        
        // Create a map by question ID
        const statsMap: Record<number, QuestionStats> = {};
        (data.stats || []).forEach((stat: QuestionStats) => {
          statsMap[stat.questionId] = stat;
        });
        
        setQuestionStats(statsMap);
      } catch (error) {
      } finally {
        if (mounted) {
          setStatsLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [treatAsFullAccess, sessionId, totalQuestions]);
  
  // Shared bubble utility (analytics-style)
  const bubbleClass =
    "rounded-organic-lg border border-border-subtle bg-surface-elevated p-4 shadow-bar-floating";
  
  const pinnedInsights = useMemo(() => {
    return answers
      .map((answer, index) => {
        if (!answer?.addToDrill || !answer.explanation.trim()) return null;
        return {
          questionNumber: questionNumbers[index],
          explanation: answer.explanation,
        };
      })
      .filter(Boolean);
  }, [answers, questionNumbers]);
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Section breakdown (conversion by section placeholder: raw correct/total per section)
  const sectionBreakdown = useMemo(() => {
    const bySection: Record<string, { correct: number; total: number }> = {};
    const qs = usePaperSessionStore.getState().questions;
    if (!qs || qs.length === 0) return bySection;
    for (let i = 0; i < qs.length; i++) {
      let part = (qs[i]?.partLetter || "").trim();
      
      if (part.toUpperCase() === "SECTION") {
        continue;
      }
      
      const key = resolveMarkPartKey(
        { partLetter: qs[i]?.partLetter, partName: qs[i]?.partName },
        paperName as ExamName,
      );
      if (!bySection[key]) bySection[key] = { correct: 0, total: 0 };
      if (correctFlags[i] === true) bySection[key].correct += 1;
      bySection[key].total += 1;
    }
    return bySection;
  }, [correctFlags]);

  // Auto-derive correctness if not manually set
  const derivedCorrectFlags = useMemo(() => {
    return questionNumbers.map((_, i) => {
      if (correctFlags[i] !== null && correctFlags[i] !== undefined) return correctFlags[i];
      const user = (answers[i]?.choice || "").toString().toUpperCase();
      const correct = (questions[i]?.answerLetter || "").toString().toUpperCase();
      if (!correct) return null;
      if (!user) return false; // unanswered counts as incorrect
      return user === correct;
    });
  }, [questionNumbers, correctFlags, answers, questions]);

  const correctCountDerived = useMemo(() => derivedCorrectFlags.filter(f => f === true).length, [derivedCorrectFlags]);

  // Group questions by part (letter) for left list
  const partGroups = useMemo(() => {
    const qs = usePaperSessionStore.getState().questions;
    const groups: Array<{
      partLetter: string;
      sectionName: string;
      headerClass: string;
      indexes: number[];
    }> = [];
    const map: Record<string, number> = {};

    if (!qs || qs.length === 0) return groups;
    for (let i = 0; i < qs.length; i++) {
      if ((qs[i]?.partLetter ?? "").trim().toUpperCase() === "SECTION") continue;

      const pl = resolveMarkPartKey(
        { partLetter: qs[i]?.partLetter, partName: qs[i]?.partName },
        paperName as ExamName,
      );

      if (map[pl] === undefined) {
        const section = mapPartToSection(
          { partLetter: qs[i]?.partLetter, partName: qs[i]?.partName },
          paperName as ExamName,
        );
        const headerClass = getMarkSessionPartHeaderClass(section);
        map[pl] = groups.length;
        groups.push({ partLetter: pl, sectionName: section, headerClass, indexes: [i] });
      } else {
        groups[map[pl]].indexes.push(i);
      }
    }
    return groups;
  }, [paperName, questions.length]);

  // Derived meta for header pills
  const sessionYear = useMemo(() => {
    const q0 = usePaperSessionStore.getState().questions?.[0];
    return q0?.examYear || null;
  }, []);
  const sectionPills = useMemo(() => {
    const qs = usePaperSessionStore.getState().questions || [];
    const names = new Set<string>();
    qs.forEach(q => {
      const n = (q.partName || q.partLetter || "").toString().trim();
      if (n) names.add(n);
    });
    return Array.from(names);
  }, []);

  // Human-readable variant without duplicated year and hyphens
  const variantDisplay = useMemo(() => {
    return formatSessionVariantLabel({
      partIds: selectedPartIds,
      paperVariant,
      examType: questions[0]?.examType ?? null,
    });
  }, [selectedPartIds, paperVariant, questions]);

  const sectionBreakdownDerived = useMemo(() => {
    const bySection: Record<string, { correct: number; total: number }> = {};
    const qs = usePaperSessionStore.getState().questions;
    if (!qs || qs.length === 0) return bySection;
    for (let i = 0; i < qs.length; i++) {
      let part = (qs[i]?.partLetter || "").trim();
      if (part.toUpperCase() === "SECTION") continue;

      const key = resolveMarkPartKey(
        { partLetter: qs[i]?.partLetter, partName: qs[i]?.partName },
        paperName as ExamName,
      );
      if (!bySection[key]) bySection[key] = { correct: 0, total: 0 };
      if (derivedCorrectFlags[i] === true) bySection[key].correct += 1;
      bySection[key].total += 1;
    }
    return bySection;
  }, [derivedCorrectFlags]);

  // Session duration
  const sessionDuration = useMemo(() => {
    if (!startedAt) return 0;
    const endTime = endedAt || Date.now();
    return Math.floor((endTime - startedAt) / 1000); // in seconds
  }, [startedAt, endedAt]);

  // Time distribution (fast <1min, medium 1-3min, slow >3min)
  const timeDistribution = useMemo(() => {
    let fast = 0, medium = 0, slow = 0;
    perQuestionSec.forEach((sec) => {
      const minutes = sec / 60;
      if (minutes < 1) fast++;
      else if (minutes <= 3) medium++;
      else slow++;
    });
    return { fast, medium, slow, total: fast + medium + slow };
  }, [perQuestionSec]);

  // Average time per question
  const avgTimePerQuestion = useMemo(() => {
    const total = perQuestionSec.reduce((a, b) => a + b, 0);
    return totalQuestions > 0 ? total / totalQuestions : 0;
  }, [perQuestionSec, totalQuestions]);

  // Pacing analysis (early vs late)
  const pacingAnalysis = useMemo(() => {
    const third = Math.floor(totalQuestions / 3);
    const early = perQuestionSec.slice(0, third);
    const late = perQuestionSec.slice(-third);
    const earlyAvg = early.length > 0 ? early.reduce((a, b) => a + b, 0) / early.length : 0;
    const lateAvg = late.length > 0 ? late.reduce((a, b) => a + b, 0) / late.length : 0;
    return { earlyAvg, lateAvg, trend: earlyAvg > lateAvg ? 'faster' : earlyAvg < lateAvg ? 'slower' : 'steady' };
  }, [perQuestionSec, totalQuestions]);

  // Time efficiency (time on correct vs incorrect)
  const timeEfficiency = useMemo(() => {
    let correctTime = 0, incorrectTime = 0;
    derivedCorrectFlags.forEach((correct, i) => {
      const time = perQuestionSec[i] || 0;
      if (correct === true) correctTime += time;
      else if (correct === false) incorrectTime += time;
    });
    return { correctTime, incorrectTime };
  }, [derivedCorrectFlags, perQuestionSec]);

  // Guessing metrics
  const guessStats = useMemo(() => {
    const qs = usePaperSessionStore.getState().questions;
    const actualQuestionCount = qs?.length || 0;
    let count = 0;
    let timeTotal = 0;
    let correctGuesses = 0;
    for (let i = 0; i < actualQuestionCount; i++) {
      if (guessedFlags[i]) {
        count += 1;
        timeTotal += perQuestionSec[i] || 0;
        if (derivedCorrectFlags[i] === true) correctGuesses += 1;
      }
    }
    const avgTime = count > 0 ? timeTotal / count : 0;
    const accuracy = count > 0 ? (correctGuesses / count) * 100 : 0;
    // Non-guess average for comparison
    let ngCount = 0; let ngTime = 0;
    for (let i = 0; i < actualQuestionCount; i++) {
      if (!guessedFlags[i] && (derivedCorrectFlags[i] !== null)) {
        ngCount += 1;
        ngTime += perQuestionSec[i] || 0;
      }
    }
    const avgNonGuess = ngCount > 0 ? ngTime / ngCount : 0;
    return { count, timeTotal, avgTime, correctGuesses, accuracy, avgNonGuess };
  }, [guessedFlags, perQuestionSec, derivedCorrectFlags, totalQuestions]);

  // Fastest and slowest questions
  const fastestSlowest = useMemo(() => {
    const withTime = questionNumbers.map((qNum, i) => ({
      questionNumber: qNum,
      timeSec: perQuestionSec[i] || 0,
      index: i
    })).filter(item => item.timeSec > 0);
    
    if (withTime.length === 0) return { fastest: [], slowest: [] };
    
    const sorted = [...withTime].sort((a, b) => a.timeSec - b.timeSec);
    const fastest = sorted.slice(0, 3);
    const slowest = sorted.slice(-3).reverse();
    return { fastest, slowest };
  }, [questionNumbers, perQuestionSec]);

  // Streaks
  const streaks = useMemo(() => {
    let longestCorrect = 0;
    let longestIncorrect = 0;
    let currentCorrect = 0;
    let currentIncorrect = 0;
    
    derivedCorrectFlags.forEach((flag) => {
      if (flag === true) {
        currentCorrect++;
        currentIncorrect = 0;
        longestCorrect = Math.max(longestCorrect, currentCorrect);
      } else if (flag === false) {
        currentIncorrect++;
        currentCorrect = 0;
        longestIncorrect = Math.max(longestIncorrect, currentIncorrect);
      } else {
        currentCorrect = 0;
        currentIncorrect = 0;
      }
    });
    
    return { longestCorrect, longestIncorrect };
  }, [derivedCorrectFlags]);

  // Performance by section (detailed)
  const sectionAnalytics = useMemo(() => {
    const analytics: Record<string, {
      correct: number;
      total: number;
      avgTime: number;
      totalTime: number;
      guessed: number;
    }> = {};
    
    const qs = questions;
    const examName = (qs?.[0]?.examName || '').toUpperCase();
    const examYear = qs?.[0]?.examYear;
    const isNSAA2019 = examName === 'NSAA' && examYear === 2019;
    const isTMUA = examName === 'TMUA';
    
    if (!qs || qs.length === 0) {
      return analytics;
    }
    
    for (let i = 0; i < totalQuestions; i++) {
      const question = qs[i];
      if (!question) {
        continue;
      }
      
      let part = (question.partLetter || "").trim();
      const partName = (question.partName || "").trim();

      // TMUA: group by paper (Paper 1 / Paper 2), not question parts
      if (isTMUA) {
        const paperSection = mapTmuaPaperNameToSection(question.paperName) ?? "Paper 1";
        if (!analytics[paperSection]) {
          analytics[paperSection] = { correct: 0, total: 0, avgTime: 0, totalTime: 0, guessed: 0 };
        }
        analytics[paperSection].total++;
        if (derivedCorrectFlags[i] === true) analytics[paperSection].correct++;
        if (guessedFlags[i]) analytics[paperSection].guessed++;
        analytics[paperSection].totalTime += perQuestionSec[i] || 0;
        continue;
      }
      
      if (part.toUpperCase() === "SECTION") {
        continue;
      }

      const key = resolveMarkPartKey(question, paperName as ExamName);

      if (isNSAA2019) {
        const partNameLower = partName.toLowerCase();
        const allowed =
          key === "Part A" ||
          key === "Part B" ||
          key === "Part E" ||
          (partNameLower.includes("advanced mathematics") &&
            partNameLower.includes("advanced physics"));
        if (!allowed) {
          continue;
        }
      }

      if (!analytics[key]) {
        analytics[key] = { correct: 0, total: 0, avgTime: 0, totalTime: 0, guessed: 0 };
      }
      analytics[key].total++;
      if (derivedCorrectFlags[i] === true) analytics[key].correct++;
      if (guessedFlags[i]) analytics[key].guessed++;
      analytics[key].totalTime += perQuestionSec[i] || 0;
    }
    
    // Calculate averages
    Object.keys(analytics).forEach(key => {
      if (analytics[key].total > 0) {
        analytics[key].avgTime = analytics[key].totalTime / analytics[key].total;
      }
    });
    
    return analytics;
  }, [questions, totalQuestions, correctFlags, derivedCorrectFlags, guessedFlags, perQuestionSec]);

  const validSectionEntries = useMemo(() => {
    return Object.entries(sectionAnalytics).filter(
      ([section]) => section.toUpperCase() !== "SECTION",
    );
  }, [sectionAnalytics]);

  // Accuracy patterns
  const accuracyPatterns = useMemo(() => {
    const correct = derivedCorrectFlags.filter(f => f === true).length;
    const incorrect = derivedCorrectFlags.filter(f => f === false).length;
    const unanswered = derivedCorrectFlags.filter(f => f === null || f === undefined).length;
    const guessed = guessedFlags.filter(f => f).length;
    const confident = totalQuestions - guessed - unanswered;
    
    return { correct, incorrect, unanswered, guessed, confident };
  }, [derivedCorrectFlags, guessedFlags, totalQuestions]);

  // Early vs late accuracy
  const performanceTrend = useMemo(() => {
    const third = Math.floor(totalQuestions / 3);
    const early = derivedCorrectFlags.slice(0, third);
    const late = derivedCorrectFlags.slice(-third);
    const earlyCorrect = early.filter(f => f === true).length;
    const lateCorrect = late.filter(f => f === true).length;
    const earlyAccuracy = early.length > 0 ? (earlyCorrect / early.length) * 100 : 0;
    const lateAccuracy = late.length > 0 ? (lateCorrect / late.length) * 100 : 0;
    return { earlyAccuracy, lateAccuracy, trend: lateAccuracy > earlyAccuracy ? 'improving' : lateAccuracy < earlyAccuracy ? 'declining' : 'steady' };
  }, [derivedCorrectFlags, totalQuestions]);

  const wrongQuestions = useMemo(() => {
    return questionNumbers
      .map((qn, index) => {
        if ((derivedCorrectFlags[index] ?? correctFlags[index]) !== false) {
          return null;
        }
        const q = questions[index];
        const partLetterRaw = (q?.partLetter || "").trim();
        const partNameFull = (q?.partName || "").trim();
        const sectionName = mapPartToSection(
          { partLetter: partLetterRaw, partName: partNameFull },
          paperName as ExamName,
        );
        const rawTags = mistakeTags[index];
        const tags = Array.isArray(rawTags)
          ? (rawTags as string[])
          : typeof rawTags === "string"
            ? rawTags.split(",").map((t) => t.trim()).filter(Boolean)
            : [];
        return {
          index,
          questionNumber: qn,
          sectionName,
          yourAnswer: answers[index]?.choice ?? null,
          correctAnswer: (q?.answerLetter as Letter) ?? null,
          timeSec: perQuestionSec[index] || 0,
          tags,
          previewStem: q?.questionStem ?? null,
          previewImage: q?.questionImage ?? null,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  }, [
    questionNumbers,
    derivedCorrectFlags,
    correctFlags,
    questions,
    paperName,
    mistakeTags,
    answers,
    perQuestionSec,
  ]);

  // Session insights (auto-generated, substantial)
  type Insight = { title: string; detail?: string; tone: 'positive' | 'negative' | 'neutral' };

  // Helpers for time stats
  const getMedian = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  };

  const timeSplits = useMemo(() => {
    const times = perQuestionSec.map(v => v || 0);
    const correctTimes: number[] = [];
    const wrongTimes: number[] = [];
    derivedCorrectFlags.forEach((f, i) => {
      const t = times[i] || 0;
      if (f === true) correctTimes.push(t);
      else if (f === false) wrongTimes.push(t);
    });
    const totalTime = times.reduce((a, b) => a + b, 0);
    const correctTime = correctTimes.reduce((a, b) => a + b, 0);
    const wrongTime = wrongTimes.reduce((a, b) => a + b, 0);
    const median = getMedian(times);
    const p75 = times.length ? [...times].sort((a,b)=>a-b)[Math.floor(0.75 * (times.length - 1))] : 0;
    return { totalTime, correctTime, wrongTime, median, p75, correctTimes, wrongTimes };
  }, [perQuestionSec, derivedCorrectFlags]);

  const guessExtended = useMemo(() => {
    const guessedIdx: number[] = [];
    for (let i = 0; i < guessedFlags.length; i++) if (guessedFlags[i]) guessedIdx.push(i);
    const count = guessedIdx.length;
    const correctGuesses = guessedIdx.filter(i => (derivedCorrectFlags[i] ?? correctFlags[i]) === true).length;
    const wrongGuesses = guessedIdx.filter(i => (derivedCorrectFlags[i] ?? correctFlags[i]) === false).length;
    const timeOnGuessed = guessedIdx.reduce((sum, i) => sum + (perQuestionSec[i] || 0), 0);
    const medianBeforeGuess = getMedian(guessedIdx.map(i => perQuestionSec[i] || 0));
    const accuracy = count > 0 ? Math.round((correctGuesses / count) * 100) : 0;
    const shareOfTotalTime = timeSplits.totalTime > 0 ? Math.round((timeOnGuessed / timeSplits.totalTime) * 100) : 0;
    // Non-guessed performance
    const nonGuessedIdx: number[] = [];
    for (let i = 0; i < guessedFlags.length; i++) if (!guessedFlags[i]) nonGuessedIdx.push(i);
    const nonGuessedCorrect = nonGuessedIdx.filter(i => (derivedCorrectFlags[i] ?? correctFlags[i]) === true).length;
    const nonGuessedAccuracy = nonGuessedIdx.length > 0 ? Math.round((nonGuessedCorrect / nonGuessedIdx.length) * 100) : 0;
    // Time on correct vs wrong guesses
    const correctGuessTimes = guessedIdx.filter(i => (derivedCorrectFlags[i] ?? correctFlags[i]) === true).map(i => perQuestionSec[i] || 0);
    const wrongGuessTimes = guessedIdx.filter(i => (derivedCorrectFlags[i] ?? correctFlags[i]) === false).map(i => perQuestionSec[i] || 0);
    const avgTimeCorrectGuess = correctGuessTimes.length > 0 ? correctGuessTimes.reduce((a, b) => a + b, 0) / correctGuessTimes.length : 0;
    const avgTimeWrongGuess = wrongGuessTimes.length > 0 ? wrongGuessTimes.reduce((a, b) => a + b, 0) / wrongGuessTimes.length : 0;
    // Guess distribution (early vs late)
    const third = Math.floor(totalQuestions / 3);
    const earlyGuesses = guessedIdx.filter(i => i < third).length;
    const middleGuesses = guessedIdx.filter(i => i >= third && i < 2 * third).length;
    const lateGuesses = guessedIdx.filter(i => i >= 2 * third).length;
    return { count, correctGuesses, wrongGuesses, accuracy, timeOnGuessed, medianBeforeGuess, shareOfTotalTime, nonGuessedAccuracy, avgTimeCorrectGuess, avgTimeWrongGuess, earlyGuesses, middleGuesses, lateGuesses };
  }, [guessedFlags, derivedCorrectFlags, correctFlags, perQuestionSec, timeSplits.totalTime, totalQuestions]);

  // Session insights (auto-generated, substantial)
  // Key insights removed per product direction

  // Get exam name for determining scoring method
  const examName = useMemo(() => {
    const qs = usePaperSessionStore.getState().questions;
    return (qs?.[0]?.examName || '').toUpperCase();
  }, []);

  const displayExamLabel = useMemo(
    () => (examName === "ENGAA" || examName === "NSAA" ? "ESAT" : examName),
    [examName],
  );

  const paperExamYear = useMemo(() => {
    return questions?.[0]?.examYear ?? null;
  }, [questions]);

  const selectedPercentileMeta = useMemo(() => {
    if (validSectionEntries.length === 0 || !selectedPercentileSection) return null;
    if (selectedPercentileSection === "__average__") {
      return { isAverage: true as const, subject: null };
    }
    const match = findQuestionForSection(questions, selectedPercentileSection, examName);
    const subject = mapPartToSection(
      {
        partLetter: (match?.partLetter || selectedPercentileSection).toString(),
        partName: match?.partName || "",
      },
      (paperName as any),
    );
    return { isAverage: false as const, subject };
  }, [
    validSectionEntries,
    selectedPercentileSection,
    questions,
    examName,
    paperName,
  ]);

  const percentileInfoText = useMemo(() => {
    const yearLabel = paperExamYear ? `${paperExamYear} ` : "";
    return `We use official ${yearLabel}${displayExamLabel} score distributions from that exam year. The curve shows how candidates actually scored. This is real data, not an estimate. Your dot is your result; Top% is the share of candidates you would have beaten that year.`;
  }, [paperExamYear, displayExamLabel]);

  useEffect(() => {
    if (validSectionEntries.length === 0) return;
    const keys = validSectionEntries.map(([section]) => section);
    const hasAverageOption =
      examName === "NSAA" &&
      validSectionEntries.length > 1 &&
      nsaaAveragedPercentile !== null;
    const validKeys = hasAverageOption ? ["__average__", ...keys] : keys;
    if (!selectedPercentileSection || !validKeys.includes(selectedPercentileSection)) {
      setSelectedPercentileSection(validKeys[0]);
    }
  }, [validSectionEntries, selectedPercentileSection, examName, nsaaAveragedPercentile]);

  // Predicted overall score (weighted by section totals) - exam-specific
  const isEsatCampSession = isEsatCampMockExamType(questions[0]?.examType);
  const predictedScore = useMemo(() => {
    if (isEsatCampSession) {
      const qs = usePaperSessionStore.getState().questions;
      return predictEsatCampOverallScore(
        validSectionEntries.map(([section, data]) => {
          const match = findQuestionForSection(qs, section, examName);
          return {
            section: match?.partName || section,
            correct: data.correct,
            total: data.total,
          };
        }),
      );
    }
    if (!hasConversion || (conversionRows as any[])?.length === 0) return null;
    const qs = usePaperSessionStore.getState().questions;
    return computePredictedScore(
      sectionAnalytics,
      examName,
      qs,
      conversionRows,
      paperName,
      conversionRowsByPaperId,
    );
  }, [
    isEsatCampSession,
    hasConversion,
    conversionRows,
    conversionRowsByPaperId,
    sectionAnalytics,
    validSectionEntries,
    examName,
    paperName,
  ]);

  useEffect(() => {
    // Calculate percentiles for all exams that have percentile tables
    (async () => {
      try {
        const qs = usePaperSessionStore.getState().questions;
        const entries = Object.entries(sectionAnalytics);
        if (entries.length === 0) return;
        
        // Get exam year for TMUA handling
        const examYear = qs?.[0]?.examYear as number | undefined;
        const isNSAA = examName === 'NSAA';
        const isTMUA = examName === 'TMUA';
        const isENGAA = examName === 'ENGAA';
        
        // Compute per section and decide table keys
        const needed: Record<string, { score: number | null; tableKey: string | null; label: string } > = {};
        for (const [section, data] of entries) {
          // CRITICAL: Skip "SECTION" entries - they're invalid
          const sectionUpper = section.toUpperCase();
          if (sectionUpper === "SECTION") {
            continue;
          }
          
          const match = findQuestionForSection(qs, section, examName);
          const { scaled: score } = computeScaledScore(
            examName,
            section,
            data.correct,
            qs,
            conversionRows,
            paperName,
            conversionRowsByPaperId,
          );
          let { key: tableKey, label } = mapSectionToTable(buildPercentileTableArgs(examName, section, qs));
          
          // For TMUA, determine which table to use based on year
          if (isTMUA && tableKey === 'tmua_paper') {
            tableKey = resolveTmuaPercentileTableKey(examYear);
          }
          
          needed[section] = { score, tableKey, label };
        }
        
        // For TMUA <=2023, we also need the new table for reverse interpolation
        const tmuaNeedsNewTable = isTMUA && examYear && examYear <= 2023;
        const newTableKey = 'tmua_post_change_cumulative_2024_2025';
        
        // Fetch unique percentile tables (for exams that have them)
        const uniqueKeys = Array.from(new Set(Object.values(needed).map(v => v.tableKey).filter(Boolean))) as string[];
        if (tmuaNeedsNewTable && !uniqueKeys.includes(newTableKey)) {
          uniqueKeys.push(newTableKey);
        }
        
        const keyToRows: Record<string, any[]> = {};
        await Promise.all(uniqueKeys.map(async (k) => {
          try {
            keyToRows[k] = await fetchEsatTable(k);
          } catch (e) {
            // Table doesn't exist for this exam/section - that's okay, we'll handle it gracefully
          }
        }));
        
        const out: Record<string, { percentile: number | null; score: number | null; table: string | null; label: string; oldPercentile?: number | null; newEquivalentScore?: number | null }> = {};
        const nsaaPercentiles: number[] = [];
        
        // Determine the display exam name for labels (ENGAA/NSAA -> ESAT, TMUA -> TMUA)
        const displayExamName = (isNSAA || isENGAA) ? 'ESAT' : examName;
        
        for (const [section, info] of Object.entries(needed)) {
          // Always include the score
          if (info.score == null) {
            out[section] = { percentile: null, score: null, table: info.tableKey, label: info.label || `${displayExamName} Score` };
            continue;
          }
          
          // If we have a percentile table and it loaded successfully, calculate percentile
          if (info.tableKey && keyToRows[info.tableKey] && keyToRows[info.tableKey].length > 0) {
            const p = interpolatePercentile(keyToRows[info.tableKey], info.score);
            const clamped = Math.max(0, Math.min(100, p));
            
            // For TMUA <=2023, also calculate equivalent new score
            if (isTMUA && examYear && examYear <= 2023 && keyToRows[newTableKey] && keyToRows[newTableKey].length > 0) {
              const newEquivalentScore = interpolateScore(keyToRows[newTableKey], clamped);
              out[section] = { 
                percentile: clamped, 
                score: info.score, 
                table: info.tableKey, 
                label: info.label,
                oldPercentile: clamped,
                newEquivalentScore: Number.isFinite(newEquivalentScore) ? Math.round(newEquivalentScore * 10) / 10 : null
              };
            } else {
              out[section] = { percentile: clamped, score: info.score, table: info.tableKey, label: info.label };
            }
            
            // Collect NSAA percentiles for averaging
            if (isNSAA && Number.isFinite(clamped)) {
              nsaaPercentiles.push(clamped);
            }
          } else {
            // No percentile table available, but still show the score
            out[section] = { percentile: null, score: info.score, table: info.tableKey, label: info.label || `${displayExamName} Score` };
          }
        }
        
        // Calculate NSAA averaged percentile
        if (isNSAA && nsaaPercentiles.length > 0) {
          const avg = nsaaPercentiles.reduce((sum, p) => sum + p, 0) / nsaaPercentiles.length;
          setNsaaAveragedPercentile(Math.max(0, Math.min(100, avg)));

          const scores = Object.values(out)
            .map((o) => o.score)
            .filter((s): s is number => typeof s === "number" && Number.isFinite(s));
          setNsaaAveragedScore(
            scores.length > 0
              ? scores.reduce((sum, s) => sum + s, 0) / scores.length
              : null,
          );

          const sectionTables = Object.values(out)
            .map((o) => (o.table ? keyToRows[o.table] : null))
            .filter((t): t is EsatRow[] => Array.isArray(t) && t.length > 0);
          setNsaaAveragedChartRows(averageEsatDistributionTables(sectionTables));
        } else {
          setNsaaAveragedPercentile(null);
          setNsaaAveragedScore(null);
          setNsaaAveragedChartRows([]);
        }
        
        setSectionPercentiles(out);
        setPercentileTables(keyToRows as any);
      } catch (e) {
        // fail-soft
      }
    })();
  }, [
    sectionAnalytics,
    hasConversion,
    conversionRows,
    conversionRowsByPaperId,
    examName,
    paperName,
  ]);

  // Crop images for TMUA (when both question and answer are images)
  useEffect(() => {
    if (selectedIndex === -1) {
      setCroppedQuestionImage(null);
      setCroppedAnswerImage(null);
      return;
    }

    const question = usePaperSessionStore.getState().questions[selectedIndex];
    if (!question) return;

    const isTMUA = question.questionImage && question.solutionImage && !question.solutionText;

    if (isTMUA) {
      // Crop question image (no footer removal, just trim whitespace)
      if (question.questionImage) {
        cropImageToContent(question.questionImage, { paddingBottom: 60 })
          .then(cropped => setCroppedQuestionImage(cropped))
          .catch(() => setCroppedQuestionImage(question.questionImage || null));
      }

      // Crop answer image (remove footer 6.5%, then trim whitespace)
      if (question.solutionImage) {
        cropImageToContent(question.solutionImage as string, { removeFooterPercent: 6.5, paddingBottom: 60 })
          .then(cropped => setCroppedAnswerImage(cropped))
          .catch(() => setCroppedAnswerImage(question.solutionImage as string || null));
      }
    } else {
      setCroppedQuestionImage(null);
      setCroppedAnswerImage(null);
    }
  }, [selectedIndex]);

  // Format duration helper
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Extract tip from solution text
  const currentTip = useMemo(() => {
    if (selectedIndex === -1) return null;
    const solutionText = usePaperSessionStore.getState().questions[selectedIndex]?.solutionText || '';
    if (!solutionText) return null;
    
    // Extract content from <tip>...</tip> tags
    const tipMatch = solutionText.match(/<tip>(.*?)<\/tip>/s);
    if (tipMatch && tipMatch[1]) {
      let tipContent = tipMatch[1].trim();
      // Remove redundant "tip:" or "Tip:" prefix if present
      tipContent = tipContent.replace(/^[Tt]ip:\s*/i, '');
      return tipContent;
    }
    return null;
  }, [selectedIndex]);

  // Extract question title from solution text
  const currentQuestionTitle = useMemo(() => {
    if (selectedIndex === -1) return null;
    const solutionText = usePaperSessionStore.getState().questions[selectedIndex]?.solutionText || '';
    if (!solutionText) return null;
    const titleMatch = solutionText.match(/<question_title>([\s\S]*?)<\/question_title>/i);
    if (titleMatch && titleMatch[1]) {
      return titleMatch[1].trim();
    }
    return null;
  }, [selectedIndex]);

  useEffect(() => {
    if (!sessionId) {
      router.replace("/past-papers/library");
    }
  }, [sessionId, router]);

  if (!sessionId) {
    return null;
  }

  const selectMarkSection = (section: MarkSection) => {
    setMarkSection(section);
    if (section !== "review") {
      setReviewReturnSection(null);
    }
    if (section === "review" && selectedIndex < 0) {
      setSelectedIndex(0);
    }
  };

  const openQuestionInReview = (
    index: number,
    returnTo: MarkSection | null = null,
  ) => {
    setReviewReturnSection(returnTo);
    setMarkSection("review");
    setSelectedIndex(index);
  };

  return (
    <Fragment>
      <div
        className={cn(
          "relative flex min-h-0 flex-col overflow-hidden bg-background",
          isMarkingInfo ? "h-[calc(100dvh-3rem)]" : "h-[calc(100dvh-4.0625rem)]",
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-3 py-3 sm:px-4 sm:py-4">
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden lg:flex-row">
            <MarkSectionNav active={markSection} onSelect={selectMarkSection} />

            <Card className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border border-border bg-surface p-0">

              {markSection === "overview" && (
                <div className="h-full min-h-0 overflow-y-auto p-4 sm:p-6" style={{ scrollbarGutter: "stable" }}>
                  <div className="space-y-6">
                    {/* Compact Header: type, year, section pills, date */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-lg font-semibold text-neutral-100">
                            {paperName} {sessionYear ?? ''}{variantDisplay ? `, ${variantDisplay}` : ''}
                          </div>
                          {sectionPills.map((s) => (
                            <span
                              key={s}
                              className={cn(
                                "rounded-full px-3 py-1.5 text-xs font-medium",
                                getSectionSubjectPillClass(s),
                              )}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          {startedAt && (
                            <div className="text-xs text-neutral-500">{new Date(startedAt).toLocaleDateString()}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Overview pills - single row */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {(() => {
                        const scoreLabel = isEsatCampSession
                          ? "Predicted /9"
                          : examName === "ENGAA" || examName === "NSAA"
                            ? "Predicted ESAT"
                            : examName === "TMUA"
                              ? "TMUA score"
                              : "Predicted score";
                        const generalAccuracy = Math.round(
                          (correctCountDerived / Math.max(totalQuestions, 1)) * 100,
                        );
                        return (
                          <>
                            <div className="flex min-h-[104px] flex-col items-center justify-center rounded-organic-lg bg-maths px-3 py-4 text-neutral-900 dark:text-white sm:px-4 sm:py-5">
                              <div className="text-5xl font-bold leading-none tracking-tight sm:text-6xl">
                                {predictedScore !== null && predictedScore !== undefined
                                  ? predictedScore.toFixed(1)
                                  : "-"}
                              </div>
                              <div className="mt-2 text-xs font-medium uppercase tracking-wide opacity-90">
                                {scoreLabel}
                              </div>
                            </div>
                            <div className={`${bubbleClass} flex min-h-[104px] flex-col items-center justify-center`}>
                              <div className="text-3xl font-bold leading-tight text-neutral-100 sm:text-4xl">
                                {generalAccuracy}%
                              </div>
                              <div className="mt-1 text-xs text-neutral-400">
                                {correctCountDerived}/{totalQuestions} correct
                              </div>
                            </div>
                            <div className={`${bubbleClass} flex min-h-[104px] flex-col items-center justify-center`}>
                              <div className="text-2xl font-bold leading-tight text-neutral-100 sm:text-3xl">
                                {formatTime(Math.round(avgTimePerQuestion))}
                              </div>
                              <div className="mt-1 text-xs text-neutral-400">Avg per question</div>
                            </div>
                            <div className={`${bubbleClass} flex min-h-[104px] flex-col items-center justify-center`}>
                              <div className="text-2xl font-bold leading-tight text-neutral-100 sm:text-3xl">
                                {accuracyPatterns.guessed}/{totalQuestions}
                              </div>
                              <div className="mt-1 text-xs text-neutral-400">Guessed</div>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                      {/* Combined Guess Distribution moved into Guessing Behavior */}

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                      {/* Section Performance - compact list */}
                      <div className={`${bubbleClass} space-y-3 lg:col-span-2`}>
                        <div className="text-base font-semibold text-neutral-100">Section Performance</div>
                        {!hasConversion && isEsatCampSession ? (
                          <p className="text-xs leading-relaxed text-neutral-400">
                            {ESAT_CAMP_MOCK_DISCLOSURE} Predicted scores use
                            NSAA and ENGAA conversion curves by percentage, not
                            an official ESAT raw-to-scaled table.
                          </p>
                        ) : null}
                        <div className="divide-y divide-border-subtle">
                          {validSectionEntries.map(([section, data]) => {
                            const accuracy = data.total > 0 ? (data.correct / data.total) * 100 : 0;
                            let scaledScore: number | null = null;
                            let convMatched = false;
                            let convUsedAverage = false;
                            const qs = usePaperSessionStore.getState().questions;
                            if (isEsatCampSession) {
                              const match = findQuestionForSection(qs, section, examName);
                              scaledScore = predictEsatCampSectionScore({
                                section: match?.partName || section,
                                correct: data.correct,
                                total: data.total,
                              });
                              convMatched = scaledScore != null;
                            } else if (hasConversion && conversionRows.length > 0) {
                              const sectionExamName = (qs?.[0]?.examName || "").toUpperCase();
                              const { scaled, matched, usedAverage } = computeScaledScore(
                                sectionExamName,
                                section,
                                data.correct,
                                qs,
                                conversionRows,
                                paperName,
                                conversionRowsByPaperId,
                              );
                              scaledScore = scaled;
                              convMatched = matched;
                              convUsedAverage = usedAverage;
                            }
                            const qsForPill = qs;
                            const matchForPill = findQuestionForSection(qsForPill, section, examName);
                            const sectionNameForColor = mapPartToSection(
                              {
                                partLetter: (matchForPill?.partLetter || section).toString(),
                                partName: matchForPill?.partName || "",
                              },
                              (usePaperSessionStore.getState().questions?.[0]?.examName as any),
                            );
                            const conversionHint = convMatched
                              ? "Conversion table found for this section"
                              : convUsedAverage
                                ? "Using average conversion table for this section"
                                : "No conversion table found for this section";
                            return (
                              <div key={section} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                                  <div className="flex items-center gap-2">
                                    {sectionNameForColor && (
                                      <span
                                        className={cn(
                                          "shrink-0 rounded-organic-sm px-2 py-0.5 text-[11px] font-medium",
                                          getSectionSubjectPillClass(sectionNameForColor),
                                        )}
                                      >
                                        {sectionNameForColor}
                                      </span>
                                    )}
                                    <span className="truncate text-xs text-neutral-400">{section}</span>
                                    {hasConversion || isEsatCampSession ? (
                                      <div className="group relative shrink-0">
                                        <button
                                          type="button"
                                          className="flex h-5 w-5 items-center justify-center rounded-full text-text-muted transition-colors hover:text-maths"
                                          aria-label="Conversion table info"
                                        >
                                          <Info className="h-3.5 w-3.5" />
                                        </button>
                                        <div className="absolute left-0 top-full z-20 mt-1 hidden w-52 rounded-organic-md border border-border bg-surface-elevated p-2 text-[11px] text-text-muted shadow-bar-floating group-hover:block">
                                          {isEsatCampSession
                                            ? "Estimated from NSAA/ENGAA tables using your percentage correct"
                                            : conversionHint}
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                  <div className="space-y-1.5">
                                    <div className="flex items-baseline justify-between gap-2">
                                      <span className="text-sm font-semibold tabular-nums text-neutral-100">
                                        {data.correct}/{data.total}
                                      </span>
                                      <span className="text-xs font-medium tabular-nums text-neutral-400">
                                        {Math.round(accuracy)}%
                                      </span>
                                    </div>
                                    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-surface-mid">
                                      <div
                                        className={cn(
                                          "absolute inset-y-0 left-0 w-full origin-left rounded-full transition-transform duration-500 ease-out",
                                          getSectionBarTrackClass(sectionNameForColor),
                                        )}
                                        style={{
                                          transform: `scaleX(${Math.min(1, Math.max(0, accuracy / 100))})`,
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <div className="min-h-4">
                                    {data.guessed > 0 && (
                                      <div className="text-[11px] text-neutral-500">
                                        {data.guessed} guessed
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="shrink-0 text-right">
                                  <div className="text-[10px] uppercase tracking-wide text-neutral-500">
                                    {displayExamLabel}
                                  </div>
                                  <div className="text-lg font-semibold tabular-nums text-neutral-100">
                                    {scaledScore !== null && scaledScore !== undefined
                                      ? scaledScore.toFixed(1)
                                      : "-"}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Section Percentiles - focused view with part selector */}
                      <div className={`${bubbleClass} space-y-4 lg:col-span-3`}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-base font-semibold text-neutral-100">
                              Section Percentiles
                            </div>
                            {selectedPercentileMeta?.isAverage ? (
                              <span className="rounded-organic-sm bg-maths/15 px-2.5 py-1 text-xs font-medium text-maths">
                                Average (all subjects)
                              </span>
                            ) : selectedPercentileMeta?.subject ? (
                              <span
                                className={cn(
                                  "rounded-organic-sm px-2.5 py-1 text-xs font-medium",
                                  getSectionSubjectPillClass(selectedPercentileMeta.subject),
                                )}
                              >
                                {selectedPercentileMeta.subject}
                              </span>
                            ) : null}
                            <div className="group relative">
                              <button
                                type="button"
                                className="flex h-6 w-6 items-center justify-center rounded-full text-text-muted transition-colors hover:text-maths"
                                aria-label="How percentiles are calculated"
                              >
                                <Info className="h-4 w-4" />
                              </button>
                              <div className="absolute left-0 top-full z-10 mt-1 hidden w-72 rounded-organic-md border border-border bg-surface-elevated p-2.5 text-[11px] leading-relaxed text-text-muted shadow-bar-floating group-hover:block">
                                {percentileInfoText}
                              </div>
                            </div>
                          </div>
                          {validSectionEntries.length > 0 && (
                            <select
                              value={selectedPercentileSection}
                              onChange={(e) => setSelectedPercentileSection(e.target.value)}
                              className="h-9 min-w-[12rem] cursor-pointer appearance-none rounded-organic-md border-0 bg-surface-mid px-3 text-sm text-neutral-200 outline-none focus:outline-none focus:ring-0"
                            >
                              {examName === "NSAA" &&
                                validSectionEntries.length > 1 &&
                                nsaaAveragedPercentile !== null && (
                                  <option value="__average__">Average (all subjects)</option>
                                )}
                              {validSectionEntries.map(([section]) => {
                                const qs = usePaperSessionStore.getState().questions;
                                const match = findQuestionForSection(qs, section, examName);
                                const subject = mapPartToSection(
                                  {
                                    partLetter: (match?.partLetter || section).toString(),
                                    partName: match?.partName || "",
                                  },
                                  (paperName as any),
                                );
                                return (
                                  <option key={section} value={section}>
                                    {subject ? `${subject} · ${section}` : section}
                                  </option>
                                );
                              })}
                            </select>
                          )}
                        </div>

                        {(() => {
                          if (validSectionEntries.length === 0) {
                            return (
                              <div className="text-sm text-neutral-400">No section data available.</div>
                            );
                          }

                          const isAverage = selectedPercentileSection === "__average__";
                          const section = isAverage ? null : selectedPercentileSection;
                          const sp = section ? sectionPercentiles[section] : null;
                          const pct = isAverage ? nsaaAveragedPercentile : sp?.percentile;
                          const score = isAverage ? nsaaAveragedScore : sp?.score;
                          const qs = usePaperSessionStore.getState().questions;
                          const examYear = qs?.[0]?.examYear as number | undefined;
                          const isTmuAPre2024 =
                            !isAverage && examName === "TMUA" && examYear && examYear <= 2023;
                          const chartRows = isAverage
                            ? nsaaAveragedChartRows
                            : sp?.table
                              ? percentileTables[sp.table]
                              : undefined;

                          return (
                            <div className="space-y-4">
                              {typeof score === "number" && (
                                <div className="text-xs text-neutral-400">
                                  {displayExamLabel} score: {score.toFixed(1)}
                                  {isAverage ? " (average across subjects)" : ""}
                                </div>
                              )}

                              <div className="text-center text-4xl font-bold tracking-tight text-neutral-100 sm:text-5xl">
                                {Number.isFinite(pct as number)
                                  ? `TOP ${(Math.max(0, 100 - (pct as number))).toFixed(1)}%`
                                  : "-"}
                              </div>

                              {isTmuAPre2024 &&
                                sp?.oldPercentile !== null &&
                                sp?.oldPercentile !== undefined &&
                                sp?.newEquivalentScore !== null &&
                                sp?.newEquivalentScore !== undefined && (
                                  <div className="rounded-organic-md border border-border-subtle bg-surface-mid/50 p-3 text-xs text-neutral-400">
                                    Pre-2024 TMUA scoring. Equivalent 2024–25 score:{" "}
                                    <span className="font-medium text-neutral-200">
                                      {sp.newEquivalentScore.toFixed(1)}
                                    </span>
                                  </div>
                                )}

                              {(chartRows?.length ?? 0) >= 2 && (
                                <PercentileMiniChart
                                  rows={chartRows ?? []}
                                  score={score}
                                  percentile={pct}
                                  xLabel={displayExamLabel}
                                  className="w-full"
                                />
                              )}

                              <p className="text-center text-xs text-neutral-400">
                                {Number.isFinite(pct as number)
                                  ? isAverage
                                    ? `If you sat the NSAA today, ${(100 - (pct as number)).toFixed(1)}% of test-takers would outperform you on average across all subjects.`
                                    : `If you sat the ${displayExamLabel} today, ${(100 - (pct as number)).toFixed(1)}% of test-takers would outperform you in ${section}.`
                                  : `Your ${displayExamLabel} score: ${typeof score === "number" ? score.toFixed(1) : "-"}`}
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {markSection === "stats" && (
                <div className="h-full min-h-0 overflow-y-auto p-4 sm:p-6" style={{ scrollbarGutter: "stable" }}>
                  <div className="relative">
                  <div
                    className={cn(
                      "space-y-6",
                      !treatAsFullAccess &&
                        "pointer-events-none select-none blur-[1.5px] opacity-75 saturate-[0.85]",
                    )}
                    aria-hidden={!treatAsFullAccess}
                  >

                    {/* Pacing Profile */}
                    <div className={`${bubbleClass}`}>
                      <div className="text-base font-semibold text-neutral-100 mb-4">Pacing Profile</div>
                      <TimeScatterChart
                        questionNumbers={questionNumbers}
                        perQuestionSec={perQuestionSec}
                        correctFlags={derivedCorrectFlags}
                        guessedFlags={guessedFlags}
                      />
                    </div>

                  {/* Main Content Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Time Management Analysis */}
                      <div className={`${bubbleClass} space-y-4 md:col-span-2`}>
                      <div className="text-base font-semibold text-neutral-100">Time Management</div>

                      {/* KPI Row */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center p-2 rounded bg-neutral-900">
                          <div className="text-[11px] text-neutral-400">Median per Q</div>
                          <div className="text-sm font-semibold text-neutral-200">{formatTime(Math.round(timeSplits.median))}</div>
                        </div>
                        <div className="text-center p-2 rounded bg-neutral-900">
                          <div className="text-[11px] text-neutral-400">75th percentile</div>
                          <div className="text-sm font-semibold text-neutral-200">{formatTime(Math.round(timeSplits.p75))}</div>
                        </div>
                        <div className="text-center p-2 rounded bg-neutral-900">
                          <div className="text-[11px] text-neutral-400">Avg per Q</div>
                          <div className="text-sm font-semibold text-neutral-200">{formatTime(Math.round(avgTimePerQuestion))}</div>
                        </div>
                      </div>

                      {/* Time Used Split */}
                      <div>
                        <div className="text-xs text-neutral-400 mb-2">Time Allocation</div>
                        <div className="w-full h-2 bg-neutral-700 rounded-full overflow-hidden">
                          {(() => {
                            const total = Math.max(1, timeSplits.totalTime);
                            const correctPct = Math.min(100, Math.round((timeSplits.correctTime / total) * 100));
                            const wrongPct = Math.max(0, 100 - correctPct);
                            return (
                              <div className="flex h-full w-full">
                                <div className="h-full bg-primary/90" style={{ width: `${correctPct}%` }} />
                                <div className="h-full bg-error/85" style={{ width: `${wrongPct}%` }} />
                              </div>
                            );
                          })()}
                        </div>
                        <div className="flex justify-between text-[11px] text-neutral-400 mt-1">
                          <span>Correct {Math.round((timeSplits.correctTime/Math.max(1,timeSplits.totalTime))*100)}%</span>
                          <span>Wrong {Math.round((timeSplits.wrongTime/Math.max(1,timeSplits.totalTime))*100)}%</span>
                        </div>
                      </div>

                      {/* (Removed) Time & Accuracy Split to reduce confusion; moved to Guessing Behavior */}

                      {/* Fastest/Slowest Compact */}
                      {fastestSlowest.fastest.length > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs text-neutral-400 mb-1">Fastest</div>
                            <div className="space-y-1">
                              {fastestSlowest.fastest.map(item => (
                                <div key={item.questionNumber} className="text-xs text-neutral-300">Q{item.questionNumber}: {formatTime(item.timeSec)}</div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-neutral-400 mb-1">Slowest</div>
                            <div className="space-y-1">
                              {fastestSlowest.slowest.map(item => (
                                <div key={item.questionNumber} className="text-xs text-neutral-300">Q{item.questionNumber}: {formatTime(item.timeSec)}</div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                  {/* Guessing Behavior + Accuracy Patterns */}
                  <div className="grid grid-cols-1 gap-4 md:col-span-2 md:grid-cols-2">
                  <div className={`${bubbleClass} space-y-3`}>
                    <div className="text-base font-semibold text-neutral-100">Guessing Behavior</div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-2 rounded bg-neutral-900">
                        <div className="text-[11px] text-neutral-400">Guessed</div>
                        <div className="text-sm font-semibold text-neutral-200">{guessExtended.count}</div>
                      </div>
                      <div className="p-2 rounded bg-neutral-900">
                        <div className="text-[11px] text-neutral-400">Correct guesses</div>
                        <div className="text-sm font-semibold text-neutral-200">{guessExtended.correctGuesses}</div>
                      </div>
                      <div className="p-2 rounded bg-neutral-900">
                        <div className="text-[11px] text-neutral-400">Guess accuracy</div>
                        <div className="text-sm font-semibold text-neutral-200">{guessExtended.accuracy}%</div>
                      </div>
                      <div className="p-2 rounded bg-neutral-900">
                        <div className="text-[11px] text-neutral-400">Time on guesses</div>
                        <div className="text-sm font-semibold text-neutral-200">{guessExtended.shareOfTotalTime}%</div>
                      </div>
                    </div>
                    {/* Guess Outcomes: time spent on correct vs wrong guesses */}
                    {guessExtended.count > 0 && (() => {
                      const correctCount = guessExtended.correctGuesses;
                      const wrongCount = Math.max(0, guessExtended.count - correctCount);
                      const correctTime = correctCount * Math.max(0, guessExtended.avgTimeCorrectGuess);
                      const wrongTime = wrongCount * Math.max(0, guessExtended.avgTimeWrongGuess);
                      const totalGuessTime = Math.max(1e-6, correctTime + wrongTime);
                      const correctPct = Math.round((correctTime / totalGuessTime) * 100);
                      const wrongPct = Math.max(0, 100 - correctPct);
                      return (
                    <div>
                          <div className="text-xs text-neutral-400 mb-2">Guess time split: correct vs wrong</div>
                          <div className="h-6 w-full overflow-hidden rounded-full border border-border-subtle bg-surface-mid">
                            <div className="flex w-full h-full">
                              <div
                                className={cn(
                                  "flex h-full items-center justify-center bg-primary/85 text-[11px] font-medium",
                                  ON_SOLID_SUBJECT_TEXT,
                                )}
                                style={{ width: `${correctPct}%` }}
                                title={`Correct guesses • ${correctPct}% of guess time`}
                              >
                                {correctPct >= 12 ? `${correctPct}%` : ''}
                          </div>
                              <div
                                className={cn(
                                  "flex h-full items-center justify-center bg-error/80 text-[11px] font-medium",
                                  ON_SOLID_SUBJECT_TEXT,
                                )}
                                style={{ width: `${wrongPct}%` }}
                                title={`Wrong guesses • ${wrongPct}% of guess time`}
                              >
                                {wrongPct >= 12 ? `${wrongPct}%` : ''}
                          </div>
                        </div>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-400">
                            <div className="flex items-center gap-2">
                              <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                              <span>Correct • {correctCount} qns • avg {formatTime(Math.round(guessExtended.avgTimeCorrectGuess))}</span>
                          </div>
                            <div className="flex items-center gap-2">
                              <span className="inline-block h-2 w-2 rounded-full bg-error" />
                              <span>Wrong • {wrongCount} qns • avg {formatTime(Math.round(guessExtended.avgTimeWrongGuess))}</span>
                        </div>
                      </div>
                    </div>
                      );
                    })()}
                    {/* Combined Guess Distribution: line + timeline */}
                    <div className="">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-semibold text-neutral-200">Guess Distribution</div>
                        <div className="text-[11px] text-neutral-400">Guesses through Q{questionNumbers[0]}–Q{questionNumbers[questionNumbers.length-1]}</div>
                            </div>
                      {(() => {
                        const w = Math.max(420, questionNumbers.length * 14 + 16);
                        const h = 96; const pad = 12; const stripH = 16; const plotH = h - stripH - pad*3;
                        const windowSize = 2;
                        const vals = questionNumbers.map((_, i) => {
                          let s = 0; let c = 0;
                          for (let j = Math.max(0, i-windowSize); j <= Math.min(questionNumbers.length-1, i+windowSize); j++) { c++; s += (guessedFlags[j] ? 1 : 0); }
                          return s / Math.max(1, c);
                        });
                        const toX = (i:number) => pad + (i/(Math.max(1, vals.length-1))) * (w-2*pad);
                        const toY = (v:number) => pad + (plotH - v * plotH);
                        const path = vals.map((v,i) => `${i===0?'M':'L'} ${toX(i)},${toY(v)}`).join(' ');
                        const area = `M ${toX(0)},${toY(0)} ` + vals.map((v,i)=>`L ${toX(i)},${toY(v)}`).join(' ') + ` L ${toX(vals.length-1)},${toY(0)} Z`;
                        const guessColor = cssVar.warning;
                        const correctBorder = cssVar.primary;
                        const wrongBorder = cssVar.error;
                        // Precompute band step so blocks never exceed inner width; avoids right-edge clamping overlap
                        const len = Math.max(1, questionNumbers.length);
                        const innerW = w - 2*pad;
                        const step = innerW / len; // band step per item
                        const desiredBlockW = step - 2; // keep small gap between cards
                        const blockW = Math.max(10, desiredBlockW);
                        const blockInset = Math.max(1, (step - (blockW - 2)) / 2);
                        return (
                          <div className="overflow-x-auto flex justify-center">
                            <svg width={w} height={h} className="block">
                              <path d={area} fill="color-mix(in srgb, var(--color-warning) 22%, transparent)" />
                              <path d={path} stroke={guessColor} strokeWidth={2} fill="none" />
                              {/* Guess timeline blocks */}
                      {questionNumbers.map((qn, idx) => {
                                // Center each block inside its band: [pad + idx*step, pad + (idx+1)*step)
                                const bandStart = pad + idx * step;
                                const rectX = bandStart + blockInset;
                                const guessed = guessedFlags[idx] === true;
                                const corr = derivedCorrectFlags[idx];
                                const fill = guessed ? guessColor : cssVar.surfaceMid;
                                const border = corr === true ? correctBorder : (corr === false ? wrongBorder : cssVar.border);
                        return (
                                  <g key={qn}>
                                    <title>{`Q${qn}${guessed ? ' • Guessed' : ''}${corr===true?' • Correct':(corr===false?' • Wrong':'')}`}</title>
                                    <rect x={rectX} y={h - pad - stripH} width={blockW - 2} height={stripH} rx={4} ry={4} fill={fill} stroke={border} strokeWidth={1} />
                                  </g>
                        );
                      })}
                            </svg>
                    </div>
                        );
                      })()}
                            </div>
                    {/* Removed separate time bars to reduce duplication; combined above */}
                  </div>

                    {/* Accuracy Patterns */}
                    <div className={`${bubbleClass} space-y-4`}>
                      <div className="text-base font-semibold text-neutral-100">Accuracy Patterns</div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-organic-md border border-border-subtle bg-surface-mid/60 p-3 text-center">
                          <div className="mb-1 text-xs text-text-muted">Correct</div>
                          <div className="text-2xl font-bold text-primary">
                            {accuracyPatterns.correct}
                          </div>
                          <div className="text-xs text-neutral-500 mt-1">
                            {Math.round((accuracyPatterns.correct / totalQuestions) * 100)}%
                          </div>
                        </div>
                        <div className="rounded-organic-md border border-border-subtle bg-surface-mid/60 p-3 text-center">
                          <div className="mb-1 text-xs text-text-muted">Incorrect</div>
                          <div className="text-2xl font-bold text-error">
                            {accuracyPatterns.incorrect}
                          </div>
                          <div className="text-xs text-neutral-500 mt-1">
                            {Math.round((accuracyPatterns.incorrect / totalQuestions) * 100)}%
                          </div>
                        </div>
                        <div className="rounded-organic-md border border-border-subtle bg-surface-mid/60 p-3 text-center">
                          <div className="mb-1 text-xs text-text-muted">Guessed</div>
                          <div className="text-2xl font-bold text-warning">
                            {accuracyPatterns.guessed}
                      </div>
                          <div className="text-xs text-neutral-500 mt-1">
                            {Math.round((accuracyPatterns.guessed / totalQuestions) * 100)}%
                          </div>
                          </div>
                      </div>

                      {/* Guessing Performance (sentence style) */}
                      <div className="rounded-organic-md border border-border-subtle bg-surface-mid/60 p-4 text-center">
                        <div className="text-sm text-text-muted">Your guessing accuracy was:</div>
                        <div className="text-2xl font-bold leading-tight text-text">
                          {Math.round(guessStats.accuracy)}%
                    </div>
                        <div className="text-xs text-neutral-400 mt-1">
                          You guessed {guessStats.correctGuesses} correct out of {guessStats.count}
                    </div>
                  </div>

                      {/* Answer Confidence removed */}

                      <div>
                        <div className="text-xs text-neutral-400 mb-2">Streaks</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-organic-md border border-border-subtle bg-surface-mid/60 p-2 text-center">
                            <div className="text-xs text-text-muted">Longest Correct</div>
                            <div className="text-lg font-semibold text-primary">
                              {streaks.longestCorrect}
                            </div>
                          </div>
                          <div className="rounded-organic-md border border-border-subtle bg-surface-mid/60 p-2 text-center">
                            <div className="text-xs text-text-muted">Longest Incorrect</div>
                            <div className="text-lg font-semibold text-error">
                              {streaks.longestIncorrect}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-neutral-400 mb-2">Performance Trend</div>
                        <div className="space-y-2">
                          {(() => {
                            const total = totalQuestions;
                            const w = 320; // svg width
                            const h = 64;  // svg height
                            const pad = 8;
                            const windowSize = Math.max(3, Math.floor(total / 10));

                            // 1) Rolling accuracy values (0-100)
                            const accValues: number[] = [];
                            for (let i = 0; i < total; i++) {
                              let hits = 0, seen = 0;
                              for (let j = Math.max(0, i - windowSize + 1); j <= i; j++) {
                                const v = derivedCorrectFlags[j];
                                if (v !== null && v !== undefined) {
                                  seen += 1;
                                  if (v === true) hits += 1;
                                }
                              }
                              const pct = seen > 0 ? (hits / seen) * 100 : (accValues.length > 0 ? accValues[accValues.length - 1] : 0);
                              accValues.push(pct);
                            }

                            // 2) Rolling speed values (normalize so faster -> higher)
                            const speedValuesRaw: number[] = [];
                            for (let i = 0; i < total; i++) {
                              let sum = 0, seen = 0;
                              for (let j = Math.max(0, i - windowSize + 1); j <= i; j++) {
                                const t = perQuestionSec[j];
                                if (typeof t === 'number') { sum += t; seen += 1; }
                              }
                              const avg = seen > 0 ? sum / seen : (speedValuesRaw.length > 0 ? speedValuesRaw[speedValuesRaw.length - 1] : 0);
                              speedValuesRaw.push(avg);
                            }
                            const minT = Math.min(...speedValuesRaw.filter(n => isFinite(n)));
                            const maxT = Math.max(...speedValuesRaw.filter(n => isFinite(n)));
                            const speedValues = speedValuesRaw.map(v => {
                              if (!isFinite(v) || maxT === minT) return 50;
                              const norm = 1 - (v - minT) / (maxT - minT); // faster (lower time) -> higher
                              return Math.max(0, Math.min(1, norm)) * 100;
                            });

                            // Helpers to create a smooth path
                            const stepX = (w - pad * 2) / Math.max(1, total - 1);
                            const toY = (v: number) => h - pad - (v / 100) * (h - pad * 2);
                            const toPoint = (i: number, v: number) => ({ x: pad + i * stepX, y: toY(v) });

                            function buildSmoothPath(values: number[]) {
                              if (values.length === 0) return '';
                              const pts = values.map((v, i) => toPoint(i, v));
                              if (pts.length < 2) return `M ${pts[0].x} ${pts[0].y}`;
                              let d = `M ${pts[0].x} ${pts[0].y}`;
                              for (let i = 1; i < pts.length; i++) {
                                const p0 = pts[i - 1];
                                const p1 = pts[i];
                                const cp1x = p0.x + (stepX * 0.5);
                                const cp1y = p0.y;
                                const cp2x = p1.x - (stepX * 0.5);
                                const cp2y = p1.y;
                                d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
                              }
                              return d;
                            }

                            const accStroke =
                              performanceTrend.trend === 'improving'
                                ? cssVar.primary
                                : performanceTrend.trend === 'declining'
                                  ? cssVar.error
                                  : cssVar.textMuted;
                            const speedStroke = cssVar.maths;

                            const accPath = buildSmoothPath(accValues);
                            const speedPath = buildSmoothPath(speedValues);

                            const msg = performanceTrend.trend === 'improving'
                              ? 'Accuracy improved as the session progressed.'
                              : performanceTrend.trend === 'declining'
                                ? 'Accuracy declined towards the end of the session.'
                                : 'Accuracy remained relatively steady throughout the session.';

                            return (
                              <div className="space-y-2">
                                <div className="flex justify-center rounded-organic-md border border-border-subtle bg-surface-mid/50 p-2">
                                  <svg width={w} height={h} className="block h-16 w-[320px]">
                                    <path d={speedPath} stroke={speedStroke} strokeWidth={2} fill="none" />
                                    <path d={accPath} stroke={accStroke} strokeWidth={2} fill="none" />
                                  </svg>
                          </div>
                                <div className="flex items-center justify-center gap-4 text-[11px] text-text-muted">
                                  <div className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-maths" />Speed</div>
                                  <div className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: accStroke }} />Accuracy</div>
                          </div>
                                <div className="text-[11px] text-neutral-400 text-center">{msg}</div>
                          </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Time vs Question Chart - Full Width (already placed above). Duplicate removed. */}

                  </div>
                  </div>

                  {!treatAsFullAccess ? (
                    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center px-3 pt-16 sm:pt-24">
                      <div className="pointer-events-auto w-full max-w-xl">
                        <DrillUpgradeBanner
                          variant="panel"
                          density="compact"
                          className="bg-surface-elevated/80 shadow-md"
                          headline="Unlock detailed session stats"
                          subtext="Upgrade for pacing profiles, time management analysis, guessing behaviour, and accuracy trends."
                          ctaLabel="View plans"
                        />
                      </div>
                    </div>
                  ) : null}
                  </div>
                </div>
              )}
              {markSection === "review" && (
          <div
            className="grid h-full min-h-0 grid-cols-1 lg:[grid-template-columns:var(--left-col)_minmax(0,1fr)]"
            style={{ ["--left-col" as string]: `${LEFT_COLUMN_WIDTH_PX}px` }}
          >
            {/* Left column: list (narrow, scrolls) */}
            <div className="h-full overflow-y-auto border-b border-border-subtle pt-3 pl-0 pr-1 lg:border-b-0 lg:border-r" style={{ scrollbarGutter: 'stable', paddingLeft: SCROLLBAR_GUTTER_PX }}>
              <div className="space-y-1">
                {partGroups.map((group, gi) => {
                  // Compute group score
                  const gCorrect = group.indexes.reduce((a, i) => a + (derivedCorrectFlags[i] === true ? 1 : 0), 0);
                  const gTotal = group.indexes.length;
                  const partDisplay = formatMarkPartDisplay(group.partLetter);
                  return (
                    <div key={gi} className="rounded-md">
                      <details className="group" open>
                        <summary className="list-none cursor-pointer">
                          <div
                              className={cn(
                              "w-full rounded-md py-2 pl-0 pr-3 group-open:rounded-b-none group-open:rounded-t-md",
                              group.headerClass,
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="inline-block" style={{ width: LEFT_LABEL_WIDTH_PX }} />
                                <div className="text-sm font-semibold">{partDisplay}</div>
              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-[11px] opacity-90">{gCorrect}/{gTotal}</div>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-90 transition-transform duration-200 -rotate-90 group-open:rotate-0">
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
            </div>
          </div>
          </div>
                        </summary>
                        <div className="mt-1 space-y-1 rounded-md bg-surface-elevated px-0.5 pb-1 transition-all duration-200 group-open:rounded-b-md group-open:rounded-t-none">
                        {group.indexes.map((index) => {
                          const qNumber = questionNumbers[index];
              const answer = answers[index];
                          const correct = derivedCorrectFlags[index];
              const guessed = guessedFlags[index];
              const timeSpent = perQuestionSec[index] || 0;
                          const q = usePaperSessionStore.getState().questions[index];
                          const partKey = resolveMarkPartKey(
                            { partLetter: q?.partLetter, partName: q?.partName },
                            paperName as ExamName,
                          );
                          const sectionName = mapPartToSection(
                            { partLetter: q?.partLetter, partName: q?.partName },
                            paperName as ExamName,
                          );
              return (
                            <button
                              key={qNumber}
                              type="button"
                              className={cn(
                                "relative w-full overflow-hidden rounded-md py-2 pl-0 pr-3 text-left transition-colors",
                                selectedIndex === index
                                  ? "bg-surface-neutral"
                                  : "bg-surface-elevated hover:bg-surface-mid",
                              )}
                              onClick={() => openQuestionInReview(index)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex min-w-0 flex-nowrap items-center gap-2 pl-0">
                                {/* Left spacer controls alignment for Overview/Part headers and Q labels consistently */}
                                <span className="inline-block" style={{ width: LEFT_LABEL_WIDTH_PX }} />
                                {/* Fixed-width question label so Part pill aligns vertically across rows */}
                                <span className="text-sm text-neutral-200 inline-block text-left" style={{ width: QUESTION_LABEL_WIDTH_PX }}>Q{qNumber}</span>
                                  {/* Part pill with section color (showing Part X) */}
                                  <div
                                    className={cn(
                                      "shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium leading-none",
                                      getSectionSubjectPillClass(sectionName),
                                    )}
                                  >
                                    {formatMarkPartDisplay(partKey)}
                    </div>
                                  {guessed && (
                                    <div
                                      className={cn(
                                        "shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium leading-none",
                                        getMarkAnswerBadgeClass("guess"),
                                      )}
                                    >
                                      Guess
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-[11px] text-text-muted">{formatTime(timeSpent)}</div>
                                  {correct === true && (
                                    <div
                                      className={cn(
                                        "flex items-center justify-center rounded-full px-1.5 py-0.5",
                                        getMarkAnswerBadgeClass("correct"),
                                      )}
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                    </div>
                                  )}
                                  {correct === false && (
                                    <div
                                      className={cn(
                                        "flex items-center justify-center rounded-full px-1.5 py-0.5",
                                        getMarkAnswerBadgeClass("incorrect"),
                                      )}
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {answer?.other && (
                                <details className="mt-1">
                                  <summary className="text-[11px] text-neutral-400 cursor-pointer">View notes</summary>
                                  <div className="mt-1 text-[12px] text-neutral-300">{answer.other}</div>
                                </details>
                              )}
                            </button>
                          );
                        })}
                        </div>
                      </details>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right column: question detail */}
            <div className="h-full min-h-0 overflow-y-auto rounded-2xl p-4" style={{ scrollbarGutter: "stable" }}>
              {selectedIndex >= 0 ? (
              <div className="space-y-4">
              {reviewReturnSection && (
                <button
                  type="button"
                  onClick={() => selectMarkSection(reviewReturnSection)}
                  className="inline-flex items-center gap-1.5 rounded-organic-md bg-surface-elevated px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-surface-mid hover:text-text"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Back to {reviewReturnSection === "mistakes" ? "Mistakes" : reviewReturnSection}
                </button>
              )}

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="text-base font-semibold text-neutral-200">Question</div>
                  <div className="text-base font-semibold text-neutral-200">{questionNumbers[selectedIndex]}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className={cn(
                      "flex items-center gap-1 rounded-organic-sm px-2 py-1 text-xs ring-1 transition ring-border",
                      (derivedCorrectFlags[selectedIndex] ?? correctFlags[selectedIndex]) === true
                        ? getMarkReviewToggleActiveClass("correct")
                        : "bg-surface-mid text-text-muted hover:bg-surface-neutral",
                    )}
                    onClick={() => setCorrectFlag(selectedIndex, correctFlags[selectedIndex] === true ? null : true)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    Correct
                    </button>
                    <button
                      type="button"
                      className={cn(
                      "flex items-center gap-1 rounded-organic-sm px-2 py-1 text-xs ring-1 transition ring-border",
                      (derivedCorrectFlags[selectedIndex] ?? correctFlags[selectedIndex]) === false
                        ? getMarkReviewToggleActiveClass("incorrect")
                        : "bg-surface-mid text-text-muted hover:bg-surface-neutral",
                      )}
                    onClick={() => setCorrectFlag(selectedIndex, correctFlags[selectedIndex] === false ? null : false)}
                    >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    Wrong
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "flex items-center gap-1 rounded-organic-sm px-2 py-1 text-xs ring-1 transition ring-border",
                        guessedFlags[selectedIndex]
                          ? getMarkReviewToggleActiveClass("guess")
                          : "bg-surface-mid text-text-muted hover:bg-surface-neutral",
                      )}
                      onClick={() => setGuessedFlag(selectedIndex, !guessedFlags[selectedIndex])}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="8.5" />
                        <path d="M9.25 9.9c.35-1.2 1.5-2 2.75-2 1.6 0 2.9 1.2 2.9 2.7 0 1.9-1.9 2.2-2.6 3.3" />
                        <path d="M12 16.9h.01" />
                      </svg>
                      Guess
                    </button>
                </div>
                  </div>

              {/* Answers summary */}
              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <div className="text-xs text-text-muted">Your answer</div>
                  <div className="mt-1.5 inline-flex min-h-[1.75rem] min-w-[2.25rem] items-center justify-center rounded-full bg-surface-mid px-3 py-1 text-sm font-medium tabular-nums text-text">
                    {answers[selectedIndex]?.choice ?? "-"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-muted">Correct answer</div>
                  <div className="mt-1.5 inline-flex min-h-[1.75rem] min-w-[2.25rem] items-center justify-center rounded-full bg-surface-mid px-3 py-1 text-sm font-medium tabular-nums text-text">
                    {(
                      usePaperSessionStore.getState().questions[selectedIndex]
                        ?.answerLetter || ""
                    ).toUpperCase() || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-muted">Time taken</div>
                  <div className="mt-1.5 inline-flex min-h-[1.75rem] items-center justify-center rounded-full bg-surface-mid px-3 py-1 text-sm font-medium tabular-nums text-text">
                    {formatTime(perQuestionSec[selectedIndex] || 0)}
                  </div>
                </div>
              </div>

              {/* Community Stats */}
              {!treatAsFullAccess && (
                <div className="mb-4">
                  <DrillUpgradeBanner
                    variant="panel"
                    headline="Unlock community stats"
                    subtext="See how other candidates answered each question: average time and answer distribution."
                    ctaLabel="View plans"
                  />
                </div>
              )}
              {treatAsFullAccess && (() => {
                const question = usePaperSessionStore.getState().questions[selectedIndex];
                const stats = question ? questionStats[question.id] : null;
                
                if (!stats) {
                  if (statsLoading) {
                    return (
                      <div className="mb-4 py-3">
                        <div className="text-xs text-neutral-500">Loading community stats...</div>
                      </div>
                    );
                  }
                  return null;
                }

                return (
                  <div className="mb-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium text-neutral-300 uppercase tracking-wider">Community Stats</div>
                      <div className="text-xs text-neutral-500">{stats.attempts} attempts</div>
                    </div>
                    
                    {!stats.hasSufficientData ? (
                      <div className="text-xs text-neutral-500 py-2">Not enough data yet</div>
                    ) : (
                      <>
                        {/* Average Time */}
                        <div className="flex items-center justify-between py-2">
                          <div className="text-xs text-neutral-400">Average time</div>
                          <div className="text-sm text-neutral-200 font-medium">
                            {formatTime(Math.round(stats.avgTimeSeconds))}
                          </div>
                        </div>
                        
                        {/* Answer Distribution */}
                        <div className="space-y-2">
                          <div className="text-xs text-neutral-400 mb-2">Answer distribution</div>
                          <div className="space-y-1.5">
                            {LETTERS.map((letter) => {
                              const percentage = stats.optionPercentages[letter] || 0;
                              const isCorrect = letter === (question?.answerLetter || "").toUpperCase();
                              const isUserChoice = letter === (answers[selectedIndex]?.choice || "").toUpperCase();
                              
                              // Only show options that have some percentage or are the correct/user choice
                              if (percentage === 0 && !isCorrect && !isUserChoice) {
                                return null;
                              }
                              
                              return (
                                <div key={letter} className="flex items-center gap-3">
                                  <div className="w-5 text-xs text-neutral-300 font-medium">{letter}</div>
                                  <div className="flex-1 h-1.5 bg-neutral-800/50 rounded-full overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full rounded-full transition-all duration-300",
                                        isCorrect ? "bg-primary" : isUserChoice ? "bg-warning" : "bg-text-muted",
                                      )}
                                      style={{ width: `${Math.max(percentage, 0.5)}%` }}
                                    />
                                  </div>
                                  <div className="w-10 text-xs text-neutral-400 text-right">
                                    {percentage > 0 ? `${percentage.toFixed(0)}%` : "-"}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Question and Answer - Side by Side (normal) or Stacked (TMUA) */}
              {(() => {
                const question = usePaperSessionStore.getState().questions[selectedIndex];
                const isTMUA = question?.questionImage && question?.solutionImage && !question?.solutionText;
                const questionImgSrc = (isTMUA && croppedQuestionImage) ? croppedQuestionImage : question?.questionImage;
                const useTextQuestion =
                  question && shouldRenderPastPaperAsText(question);

                if (useTextQuestion) {
                  return (
                    <div className={`grid gap-4 transition-all duration-300 grid-cols-1`}>
                      <div
                        className="relative w-full overflow-y-auto rounded-organic-lg transition-all duration-300"
                        style={{ height: "60vh", backgroundColor: cssVar.background }}
                      >
                        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
                          <PastPaperTextQuestion
                            question={question}
                            questionNumber={questionNumbers[selectedIndex]}
                            showStem
                            showOptionsBelow
                            selectedChoice={
                              (answers[selectedIndex]?.choice as Letter | null) ??
                              null
                            }
                            className="px-0 py-0"
                          />
                        </div>
                      </div>

                      {!treatAsFullAccess && (
                        <DrillUpgradeBanner
                          variant="panel"
                          headline="Unlock Written Solutions"
                          subtext="Upgrade to view official solutions and worked answers for every question."
                          ctaLabel="View plans"
                        />
                      )}
                      {treatAsFullAccess && question?.solutionText && (
                        <div className="rounded-lg bg-neutral-800 p-4 overflow-y-auto transition-all duration-300" style={{ maxHeight: "72vh" }}>
                          <div className="mb-3 text-[15px] font-semibold text-accent">
                            Suggested Answer
                          </div>
                          <MathContent
                            content={formatSolutionTextForDisplay(
                              question.solutionText || "",
                            )}
                            className="text-sm leading-relaxed text-text"
                          />
                        </div>
                      )}
                    </div>
                  );
                }
                
                return (
                  <div className={`grid gap-4 transition-all duration-300 grid-cols-1`}>
                    {/* Question image */}
                    <div className="relative w-full rounded-organic-lg transition-all duration-300" style={{ height: '60vh', backgroundColor: cssVar.background }}>
                      <div 
                        className="absolute inset-0 overflow-y-auto overflow-x-hidden rounded-organic-lg scrollbar-hide transition-colors duration-300 ease-in-out"
                        style={{ backgroundColor: cssVar.background }}
                      >
                        <div className="flex flex-col items-center justify-center min-h-full pt-12 pb-12 px-8">
                          <div className="relative flex w-full justify-center" style={{ isolation: 'isolate' }}>
                            <div
                              className="relative inline-block"
                              style={{
                                width: 'min(72%, 1100px)',
                                maxWidth: '1100px',
                                lineHeight: 0,
                                transition: 'background-color 300ms ease-in-out'
                              }}
                            >
                              <div
                                style={{
                                  position: 'relative',
                                  display: 'inline-block',
                                  lineHeight: 0,
                                  backgroundColor: isDarkMode ? cssVar.text : 'transparent'
                                }}
                              >
                                <img
                                  src={questionImgSrc}
                                  alt={`Question ${questionNumbers[selectedIndex]}`}
                                  className={cn(
                                    "block h-auto w-full transition-opacity duration-300 ease-in-out",
                                    isDarkMode && "mix-blend-difference",
                                  )}
                                  style={{
                                    display: 'block',
                                    height: 'auto',
                                    width: '100%',
                                    imageRendering: 'auto',
                                    borderRadius: 0,
                                    margin: 0,
                                    padding: 0,
                                    verticalAlign: 'bottom',
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Fixed overlay for buttons - positioned as sibling of scrollable container */}
                      <div className="absolute inset-0 pointer-events-none z-50">
                        {/* Fullscreen Button - Top Left */}
                        <div className="absolute top-6 left-6 pointer-events-auto">
                          <button
                            onClick={() => {
                              setIsFullscreen(true);
                              setFullscreenImage('question');
                            }}
                            className="
                              flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200
                              backdrop-blur-sm shadow-sm bg-black/40 text-white/70 hover:bg-black/50 hover:text-white/90
                            "
                            title="Enter fullscreen mode"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                          </button>
                        </div>
                        {/* Dark Mode Toggle - Top Right */}
                        <div className="absolute top-6 right-6 pointer-events-auto">
                          <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className="
                              flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200
                              backdrop-blur-sm shadow-sm bg-black/40 text-white/70 hover:bg-black/50 hover:text-white/90
                            "
                            title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
                          >
                            {isDarkMode ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Answer/Solution section */}
                    {!treatAsFullAccess && (
                      <DrillUpgradeBanner
                        variant="panel"
                        headline="Unlock Written Solutions"
                        subtext="Upgrade to view official solutions and worked answers for every question."
                        ctaLabel="View plans"
                      />
                    )}
                    {treatAsFullAccess && (() => {
                      const question = usePaperSessionStore.getState().questions[selectedIndex];
                      const isTMUA = question?.questionImage && question?.solutionImage && !question?.solutionText;
                      const answerImgSrc = (isTMUA && croppedAnswerImage) ? croppedAnswerImage : question?.solutionImage;
                      
                      if (isTMUA) {
                        // TMUA: Answer image below question with solution label
                        return (
                          <div className="relative w-full rounded-organic-lg border-2 border-primary/30 transition-all duration-300" style={{ height: '60vh', backgroundColor: cssVar.background }}>
                            <div 
                              className="absolute inset-0 overflow-y-auto overflow-x-hidden rounded-organic-lg scrollbar-hide transition-colors duration-300 ease-in-out"
                              style={{ backgroundColor: cssVar.background }}
                            >
                              <div className="flex flex-col items-center justify-center min-h-full pt-12 pb-12 px-8">
                                <div className="relative flex w-full justify-center" style={{ isolation: 'isolate' }}>
                                  <div
                                    className="relative inline-block"
                                    style={{
                                      width: 'min(72%, 1100px)',
                                      maxWidth: '1100px',
                                      lineHeight: 0,
                                      transition: 'background-color 300ms ease-in-out'
                                    }}
                                  >
                                    <div
                                      style={{
                                        position: 'relative',
                                        display: 'inline-block',
                                        lineHeight: 0,
                                        backgroundColor: isDarkMode ? cssVar.text : 'transparent'
                                      }}
                                    >
                                      <img
                                        src={answerImgSrc as string}
                                        alt="Solution"
                                        className={cn(
                                          "block h-auto w-full transition-opacity duration-300 ease-in-out",
                                          isDarkMode && "mix-blend-difference",
                                        )}
                                        style={{
                                          display: 'block',
                                          height: 'auto',
                                          width: '100%',
                                          imageRendering: 'auto',
                                          borderRadius: 0,
                                          margin: 0,
                                          padding: 0,
                                          verticalAlign: 'bottom',
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Solution Header - Fixed overlay */}
                            <div className="absolute top-6 left-6 z-10 px-3 py-1.5 rounded-md backdrop-blur-md border shadow-sm bg-black/30 border-white/10 text-white/80 pointer-events-auto">
                              <div className="text-sm font-normal" style={{ fontFamily: 'Garamond, serif' }}>Official Solution</div>
                            </div>
                            
                            {/* Fixed overlay for buttons */}
                            <div className="absolute inset-0 pointer-events-none z-50">
                              {/* Fullscreen Button - Top Left */}
                              <div className="absolute top-6 right-6 pointer-events-auto">
                                <button
                                  onClick={() => {
                                    setIsFullscreen(true);
                                    setFullscreenImage('solution');
                                  }}
                                  className="
                                    flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200
                                    backdrop-blur-sm shadow-sm bg-black/40 text-white/70 hover:bg-black/50 hover:text-white/90
                                  "
                                  title="Enter fullscreen mode"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                  </svg>
                                </button>
                              </div>
                              {/* Dark Mode Toggle - Top Right (below fullscreen) */}
                              <div className="absolute top-20 right-6 pointer-events-auto">
                                <button
                                  onClick={() => setIsDarkMode(!isDarkMode)}
                                  className="
                                    flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200
                                    backdrop-blur-sm shadow-sm bg-black/40 text-white/70 hover:bg-black/50 hover:text-white/90
                                  "
                                  title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
                                >
                                  {isDarkMode ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                  ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            </div>
                      </div>
                        );
                      }
                      
                      // Normal: Side-by-side layout
                      return (
                        <div className="rounded-lg p-4 bg-neutral-800 overflow-y-auto transition-all duration-300" style={{ maxHeight: '72vh' }}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-[15px] font-semibold text-accent">Suggested Answer</div>
                            {currentQuestionTitle && (
                              <div className="ml-3 rounded-full bg-surface-mid px-2 py-0.5 text-xs font-medium text-text-muted">
                                {currentQuestionTitle}
                              </div>
                            )}
                          </div>
                          <div className="space-y-3">
                            {question?.solutionText && (
                              <MathContent
                                content={formatSolutionTextForDisplay(
                                  question.solutionText || "",
                                )}
                                className="text-sm leading-relaxed text-text"
                              />
                            )}
                            {question?.solutionImage && (
                              <div className="relative flex justify-center">
                                <div
                                  className="inline-block"
                                  style={{
                                    lineHeight: 0,
                                    backgroundColor: isDarkMode ? cssVar.text : "transparent",
                                  }}
                                >
                                  <img
                                    src={answerImgSrc as string}
                                    alt="Solution"
                                    className={cn(
                                      "mx-auto h-auto rounded-md object-contain",
                                      isDarkMode && "mix-blend-difference",
                                    )}
                                    style={{
                                      maxWidth: `${RIGHT_PANEL_IMAGE_SCALE * 100}%`,
                                    }}
                                  />
                                </div>
                                <div className="absolute bottom-4 right-4 pointer-events-auto">
                        <button
                                    onClick={() => {
                                      setIsFullscreen(true);
                                      setFullscreenImage('solution');
                                    }}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-normal transition-all duration-200 backdrop-blur-sm border shadow-sm bg-black/40 border-white/15 text-white/70 hover:bg-black/50 hover:text-white/90 hover:border-white/25"
                                    title="View solution in fullscreen"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                    </svg>
                                    <span className="hidden sm:inline">Fullscreen</span>
                        </button>
                      </div>
                    </div>
                  )}
                            {!question?.solutionText && !question?.solutionImage && (
                              <div className="text-sm text-text-muted">No solution available</div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}

              {/* Tip Section - Full Width Below Question/Answer */}
              {!treatAsFullAccess && currentTip && (
                <div className="mt-4">
                  <DrillUpgradeBanner
                    variant="panel"
                    headline="Unlock question tips"
                    subtext="Upgrade for expert tips and shortcuts on tricky past-paper questions."
                    ctaLabel="View plans"
                  />
                </div>
              )}
              {treatAsFullAccess && currentTip && (
                <div className="mt-4 rounded-lg bg-neutral-800 p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-accent" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div className="text-[15px] font-semibold text-accent">Tip</div>
                    </div>
                    <MathContent content={currentTip} className="text-sm leading-relaxed text-text" />
                  </div>
                </div>
              )}
              {treatAsFullAccess &&
                selectedIndex >= 0 &&
                questions[selectedIndex] && (
                <EsatCampMockReviewPanel
                  question={questions[selectedIndex]!}
                  userChoice={
                    (answers[selectedIndex]?.choice as Letter | null) ?? null
                  }
                />
              )}
              </div>
              ) : (
                <div className="flex h-full min-h-48 items-center justify-center text-sm text-text-muted">
                  Select a question from the list.
                </div>
              )}
              
              {/* Fullscreen overlay */}
              {selectedIndex !== -1 && isFullscreen && createPortal(
                <div className="fixed inset-0 z-[99999] bg-black">
                  <div className="absolute top-6 right-6 z-[100001] pointer-events-auto">
                    <button
                      onClick={() => {
                        setIsFullscreen(false);
                        setFullscreenImage(null);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-normal transition-all duration-200 backdrop-blur-sm border shadow-sm bg-black/40 border-white/15 text-white/70 hover:bg-black/50 hover:text-white/90 hover:border-white/25"
                      title="Exit fullscreen mode"
                    >
                      <span className="hidden sm:inline">Exit Fullscreen</span>
                    </button>
                  </div>
                  <div className="absolute bottom-8 right-8 z-[100001] pointer-events-auto">
                    <button
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-normal transition-all duration-200 backdrop-blur-sm border shadow-sm bg-black/40 border-white/15 text-white/70 hover:bg-black/50 hover:text-white/90 hover:border-white/25"
                      title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
                    >
                      {isDarkMode ? (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          <span className="hidden sm:inline">Light</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                          </svg>
                          <span className="hidden sm:inline">Dark</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="absolute inset-0 z-[100000] flex items-center justify-center p-6">
                    {(() => {
                      const question = usePaperSessionStore.getState().questions[selectedIndex];
                      const isSolution = fullscreenImage === 'solution';
                      const imgSrc = isSolution 
                        ? (croppedAnswerImage || question?.solutionImage)
                        : (croppedQuestionImage || question?.questionImage);
                      const imgAlt = isSolution ? 'Solution' : `Question ${questionNumbers[selectedIndex]}`;
                      return (
                        <div
                          className="inline-block"
                          style={{
                            lineHeight: 0,
                            backgroundColor: isDarkMode ? cssVar.text : "transparent",
                          }}
                        >
                          <img
                            src={imgSrc as string}
                            alt={imgAlt}
                            className={cn(
                              "max-h-full max-w-full rounded-md object-contain",
                              isDarkMode && "mix-blend-difference",
                            )}
                          />
                        </div>
                      );
                    })()}
                  </div>
                </div>,
                document.body
              )}
            </div>
          </div>
              )}
              {markSection === "mistakes" && (
              <div className="h-full min-h-0 overflow-y-auto p-4 sm:p-6">
                {!treatAsFullAccess ? (
                  <DrillUpgradeBanner
                    variant="panel"
                    headline="Unlock mistake analysis"
                    subtext="Upgrade to tag mistakes, review patterns, and build a personalised fix list for your next paper."
                    ctaLabel="View plans"
                  />
                ) : (
                <MarkSessionMistakesSection
                  mistakeTags={mistakeTags}
                  wrongQuestions={wrongQuestions}
                  onTagChange={(index, tags) => {
                    setMistakeTag(index, tags as unknown as MistakeTag);
                  }}
                  onOpenQuestion={(index) =>
                    openQuestionInReview(index, "mistakes")
                  }
                />
                )}
              </div>
              )}
              {markSection === "notes" && (
              <div className="h-full min-h-0 overflow-y-auto p-4 sm:p-6">
        {/* Session Notes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
            <div className="text-lg font-semibold text-neutral-100">Session Notes</div>
                {/* Tooltip icon (same style as elsewhere) */}
                <div className="relative group">
                  <button className="w-5 h-5 rounded-full bg-neutral-800 text-neutral-300 flex items-center justify-center" title="Notes info">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <circle cx="12" cy="8" r="1" />
                    </svg>
                  </button>
                  <div className="absolute left-0 z-10 hidden group-hover:block bg-surface-elevated text-[11px] text-neutral-300 p-2 rounded-md border border-border w-64 shadow-lg">
                    These notes are private. They are autosaved and available in the Papers archive.
                  </div>
              </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-[11px] text-neutral-400">Private to you</div>
                <div className={cn('rounded-md px-2 py-0.5 text-[11px]', sessionNoteStatus === 'saved' ? 'bg-primary/15 text-primary' : 'bg-transparent text-text-muted')}>
                  {sessionNoteStatus === 'typing' ? 'Saving…' : 'Saved'}
                </div>
              </div>
            </div>
            <div className="text-sm text-neutral-300">Summarise your key mistakes and strategies for next time. You’ll be able to review these before your next paper. Notes save automatically and are available in the Papers archive.</div>
            <textarea
              value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setSessionNoteStatus('typing');
                  if (sessionNoteDebounceRef.current) clearTimeout(sessionNoteDebounceRef.current);
                  sessionNoteDebounceRef.current = setTimeout(() => setSessionNoteStatus('saved'), 700);
                }}
                placeholder="Summarise mistakes, patterns, and specific actions to improve next time."
                className="w-full px-4 py-3 text-neutral-100 rounded-lg bg-white/5 text-sm resize-none placeholder:text-neutral-400 outline-none focus:outline-none focus:ring-0 ring-0 border-0"
                rows={5}
              />
              {/* Footer row removed per design - saved chip shown in header */}
            </div>
              </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </Fragment>
  );
}

