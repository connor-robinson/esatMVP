/**
 * Papers Mark page - Marking and review interface
 */

"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Container } from "@/components/layout/Container";
import { PaperBadge } from "@/components/papers/PaperBadge";
import { ChoicePill } from "@/components/papers/ChoicePill";
import { MistakeChart } from "@/components/papers/MistakeChart";
import { MistakeSelect } from "@/components/papers/MistakeSelect";
import { TimeScatterChart } from "@/components/papers/TimeScatterChart";
import { MathContent } from "@/components/shared/MathContent";
import { usePaperSessionStore } from "@/store/paperSessionStore";
import { PAPER_COLORS, getSectionColor } from "@/config/colors";
import { mapPartToSection } from "@/lib/papers/sectionMapping";
import { MISTAKE_OPTIONS } from "@/types/papers";
import { getConversionTable, getConversionRows, scaleScore, findFallbackConversionTable } from "@/lib/supabase/questions";
import { supabase } from "@/lib/supabase/client";
import { fetchEsatTable, interpolatePercentile, mapSectionToTable } from "@/lib/esat/percentiles";
import { cropImageToContent } from "@/lib/utils/imageCrop";
import type { Letter, MistakeTag } from "@/types/papers";
import { PageHeader } from "@/components/shared/PageHeader";

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
    setExplanation,
    setAddToDrill,
    setCorrectFlag,
    setGuessedFlag,
    setMistakeTag,
    setNotes,
    getTotalQuestions,
    getCorrectCount,
    persistSessionToServer,
  } = usePaperSessionStore();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Redirect if no active session
  if (!sessionId) {
    router.push("/papers/plan");
    return null;
  }
  
  const totalQuestions = getTotalQuestions();
  const correctCount = getCorrectCount();
  // Fixed width for the question label so the Part pill aligns across rows
  const maxQuestionNumber = (questionRange.start + totalQuestions - 1);
  const maxDigits = Math.max(1, String(maxQuestionNumber).length);
  // Tighter widths so spacing to the Part pill is reduced while still fitting the longest label
  const QUESTION_LABEL_WIDTH_PX = maxDigits >= 3 ? 36 : 28;
  const questionNumbers = Array.from({ length: totalQuestions }, (_, i) => questionRange.start + i);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<'question' | 'solution' | null>(null);
  const [showAnswer, setShowAnswer] = useState(true);
  const [showNotesBox, setShowNotesBox] = useState(false);
  const [drillSelection, setDrillSelection] = useState<number[]>([]);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [conversionRows, setConversionRows] = useState<any[]>([]);
  const [hasConversion, setHasConversion] = useState(false);
  const [croppedQuestionImage, setCroppedQuestionImage] = useState<string | null>(null);
  const [croppedAnswerImage, setCroppedAnswerImage] = useState<string | null>(null);
  // Notes saving UX state
  const [noteStatus, setNoteStatus] = useState<'idle' | 'typing' | 'saved'>('idle');
  const noteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Session notes saving UX
  const [sessionNoteStatus, setSessionNoteStatus] = useState<'idle' | 'typing' | 'saved'>('idle');
  const sessionNoteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!paperId) return;
        const qs = usePaperSessionStore.getState().questions;
        const currentExamName = (qs?.[0]?.examName || '').toUpperCase();
        const currentPaperName = paperName;
        console.log('[mark] Loading conversion for paperId', paperId, { examName: currentExamName, paperName: currentPaperName });
        
        // Verify paperId matches expected exam
        const { data: paperCheck } = await supabase
          .from('papers')
          .select('id, exam_name, exam_year, paper_name, exam_type')
          .eq('id', paperId)
          .single();
        
        if (paperCheck) {
          const paperExamName = ((paperCheck as any).exam_name || '').toUpperCase();
          if (paperExamName !== currentExamName) {
            console.error('[mark] CRITICAL: Paper ID mismatch!', {
              paperId,
              paperExamName,
              expectedExamName: currentExamName,
              paperData: paperCheck
            });
            // Still continue but log the error
          } else {
            console.log('[mark] Paper ID verified', { paperId, examName: paperExamName, paperName: (paperCheck as any).paper_name, examType: (paperCheck as any).exam_type });
          }
        }
        
        const table = await getConversionTable(paperId as any);
        if (!mounted) return;
        if (table) {
          // Double-check: verify the conversion table's paper belongs to the correct exam
          const { data: tablePaperCheck } = await supabase
            .from('papers')
            .select('exam_name, exam_year, paper_name, exam_type')
            .eq('id', table.paperId)
            .single();
          
          if (tablePaperCheck) {
            const tableExamName = ((tablePaperCheck as any).exam_name || '').toUpperCase();
            if (tableExamName !== currentExamName) {
              console.error('[mark] CRITICAL: Conversion table belongs to wrong exam!', {
                tableId: table.id,
                tablePaperId: table.paperId,
                tableExamName,
                expectedExamName: currentExamName,
                paperCheck: tablePaperCheck
              });
              // Don't use this table - it's for the wrong exam!
              setConversionRows([]);
              setHasConversion(false);
              return;
            }
          }
          
          const rows = await getConversionRows(table.id);
          if (!mounted) return;
          console.log('[mark] Primary table found and verified', { 
            tableId: table.id, 
            tablePaperId: table.paperId,
            rowCount: rows.length, 
            examName: currentExamName, 
            paperName: currentPaperName,
            samplePartNames: rows.slice(0, 5).map((r: any) => r.partName),
            allPartNames: [...new Set(rows.map((r: any) => r.partName))]
          });
          if (rows.length > 0) {
            setConversionRows(rows);
            setHasConversion(true);
            return;
          }
        }
        // Fallback: try sibling paper's conversion table for same exam/year/examType
        const examName = qs?.[0]?.examName as any;
        const year = qs?.[0]?.examYear as number | undefined;
        const examType = (paperCheck as any)?.exam_type as any;
        console.log('[mark] Trying fallback lookup', { examName, year, examType, paperName: currentPaperName });
        if (examName && year) {
          const fallback = await findFallbackConversionTable(examName as any, year, examType);
          console.log('[mark] Fallback table', { tableId: fallback?.id, examName, year, examType });
          if (fallback) {
            const rows = await getConversionRows(fallback.id);
            if (!mounted) return;
            console.log('[mark] Fallback rows loaded', { rowCount: rows.length, examName, year, examType, samplePartNames: rows.slice(0, 5).map(r => r.partName) });
          setConversionRows(rows);
          setHasConversion(rows.length > 0);
            return;
          }
        }
        // No conversion found
        console.log('[mark] No conversion rows found (primary or fallback)');
          setConversionRows([]);
          setHasConversion(false);
      } catch {
        if (!mounted) return;
        console.warn('[mark] Conversion load failed, falling back to none');
        setConversionRows([]);
        setHasConversion(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [paperId]);
  
  // Shared bubble utility (analytics-style)
  const bubbleClass = "rounded-xl bg-[#121418] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_20px_rgba(0,0,0,0.25)] p-4";
  
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
  
  const handleSaveAndContinue = async () => {
    setIsSubmitting(true);
    
    try {
      await persistSessionToServer({ immediate: true });
      router.push("/papers/archive");
    } catch (error) {
      console.error("Failed to save session:", error);
      alert("Failed to save session. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Section breakdown (conversion by section placeholder: raw correct/total per section)
  const sectionBreakdown = useMemo(() => {
    const bySection: Record<string, { correct: number; total: number }> = {};
    for (let i = 0; i < totalQuestions; i++) {
      const part = (usePaperSessionStore.getState().questions[i]?.partLetter || "").trim();
      const key = part || "Section";
      if (!bySection[key]) bySection[key] = { correct: 0, total: 0 };
      if (correctFlags[i] === true) bySection[key].correct += 1;
      bySection[key].total += 1;
    }
    return bySection;
  }, [totalQuestions, correctFlags]);

  // Auto-derive correctness if not manually set
  const derivedCorrectFlags = useMemo(() => {
    const qs = usePaperSessionStore.getState().questions;
    return questionNumbers.map((_, i) => {
      if (correctFlags[i] !== null && correctFlags[i] !== undefined) return correctFlags[i];
      const user = (answers[i]?.choice || "").toString().toUpperCase();
      const correct = (qs[i]?.answerLetter || "").toString().toUpperCase();
      if (!correct) return null;
      if (!user) return false; // unanswered counts as incorrect
      return user === correct;
    });
  }, [questionNumbers, correctFlags, answers]);

  const correctCountDerived = useMemo(() => derivedCorrectFlags.filter(f => f === true).length, [derivedCorrectFlags]);

  // Group questions by part (letter) for left list
  const partGroups = useMemo(() => {
    const qs = usePaperSessionStore.getState().questions;
    const groups: Array<{
      partLetter: string;
      sectionName: string;
      color: string;
      indexes: number[];
    }> = [];
    const map: Record<string, number> = {};
    for (let i = 0; i < totalQuestions; i++) {
      const pl = (qs[i]?.partLetter || '').trim() || '—';
      if (map[pl] === undefined) {
        const section = mapPartToSection({ partLetter: pl, partName: qs[i]?.partName || '' }, paperName as any);
        const color = getSectionColor(section);
        map[pl] = groups.length;
        groups.push({ partLetter: pl, sectionName: section, color, indexes: [i] });
      } else {
        groups[map[pl]].indexes.push(i);
      }
    }
    return groups;
  }, [totalQuestions, paperName, questionNumbers]);

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
    const v = (paperVariant || '').trim();
    if (!v) return '';
    const yearStr = sessionYear ? String(sessionYear) : '';
    const parts = v.split('-').map(s => s.trim()).filter(Boolean);
    const filtered = parts.filter((p, idx) => !(idx === 0 && yearStr && p === yearStr));
    return filtered.join(' ');
  }, [paperVariant, sessionYear]);

  const sectionBreakdownDerived = useMemo(() => {
    const bySection: Record<string, { correct: number; total: number }> = {};
    const qs = usePaperSessionStore.getState().questions;
    for (let i = 0; i < totalQuestions; i++) {
      const part = (qs[i]?.partLetter || "").trim();
      const key = part || "Section";
      if (!bySection[key]) bySection[key] = { correct: 0, total: 0 };
      if (derivedCorrectFlags[i] === true) bySection[key].correct += 1;
      bySection[key].total += 1;
    }
    return bySection;
  }, [totalQuestions, derivedCorrectFlags]);

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
    let count = 0;
    let timeTotal = 0;
    let correctGuesses = 0;
    for (let i = 0; i < totalQuestions; i++) {
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
    for (let i = 0; i < totalQuestions; i++) {
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
    
    const qs = usePaperSessionStore.getState().questions;
    for (let i = 0; i < totalQuestions; i++) {
      const part = (qs[i]?.partLetter || "").trim();
      const key = part || "Section";
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
  }, [totalQuestions, derivedCorrectFlags, guessedFlags, perQuestionSec]);

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

  // Top mistakes (parses arrays and comma-separated tags, mirrors MistakeChart logic)
  const topMistakes = useMemo(() => {
    const counts: Record<string, number> = {};
    const add = (label: string) => {
      const key = (label || '').trim();
      if (!key) return;
      if (/^none$/i.test(key)) return;
      counts[key] = (counts[key] || 0) + 1;
    };
    mistakeTags.forEach((tag: any) => {
      if (Array.isArray(tag)) {
        tag.forEach((t) => {
          if (typeof t === 'string') t.split(',').forEach(add);
        });
      } else if (typeof tag === 'string') {
        tag.split(',').forEach(add);
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [mistakeTags]);

  // Mistakes by section
  const mistakesBySection = useMemo(() => {
    const bySection: Record<string, Record<string, number>> = {};
    const qs = usePaperSessionStore.getState().questions;
    
    mistakeTags.forEach((tag, i) => {
      if (tag && tag !== "None") {
        const part = (qs[i]?.partLetter || "").trim() || "Section";
        if (!bySection[part]) bySection[part] = {};
        bySection[part][tag] = (bySection[part][tag] || 0) + 1;
      }
    });
    
    return bySection;
  }, [mistakeTags]);

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

  // Resolve the canonical conversion table part name for a given exam and part
  const resolveConversionPartName = useCallback((examName: string, partLetterRaw: string, partName: string | undefined, rows: any[]): { name: string; matched: boolean } => {
    console.log('[mark:resolve] Resolving conversion part name', { examName, partLetterRaw, partName, availableRows: rows.map(r => ({ partName: r.partName })) });
    const raw = (partLetterRaw || '').toString().trim();
    const upperRaw = raw.toUpperCase();
    // Extract a single part letter if present (handles 'A' or 'PART A')
    const letter = (upperRaw.length === 1 && /[A-Z]/.test(upperRaw))
      ? upperRaw
      : (upperRaw.match(/\b([A-Z])\b/)?.[1] || '');
    const candidateNames: string[] = [];
    // Highest priority: exam-specific rules
    if (examName === 'TMUA') {
      // TMUA typically uses "Paper 1" and "Paper 2" as part names
      if (partName) {
        // Check if partName contains "Paper 1" or "Paper 2"
        const partLower = partName.toLowerCase();
        if (partLower.includes('paper 1') || partLower.includes('paper1')) candidateNames.push('Paper 1');
        if (partLower.includes('paper 2') || partLower.includes('paper2')) candidateNames.push('Paper 2');
      }
      // Also check letter-based mapping for TMUA (sometimes Paper 1 = A, Paper 2 = B)
      if (letter === 'A' || letter === '1') candidateNames.push('Paper 1');
      if (letter === 'B' || letter === '2') candidateNames.push('Paper 2');
      // Add raw part name if it matches paper pattern
      const rawLower = raw.toLowerCase();
      if (rawLower.includes('paper 1') || rawLower.includes('paper1')) candidateNames.push('Paper 1');
      if (rawLower.includes('paper 2') || rawLower.includes('paper2')) candidateNames.push('Paper 2');
    }
    if (examName === 'ENGAA') {
      if (/A/.test(letter)) candidateNames.push('Section 1A');
      else if (/B/.test(letter)) candidateNames.push('Section 1B');
      else if (/2/.test(letter)) candidateNames.push('Section 2');
    }
    // Generic patterns commonly used in tables
    if (letter) candidateNames.push(`Part ${letter}`);
    if (raw) candidateNames.push(raw); // e.g., 'PART A' or 'Part A'
    if (partName) candidateNames.push(partName);

    const rowsLower = rows.map((r: any) => (r.partName || '').toString().toLowerCase());
    const match = candidateNames.find(n => rowsLower.includes(n.toLowerCase()));
    if (match) return { name: match, matched: true };
    // Fallback to first candidate
    return { name: candidateNames[0] || (partName || letter || 'Section'), matched: false };
  }, []);

  // Get exam name for determining scoring method
  const examName = useMemo(() => {
    const qs = usePaperSessionStore.getState().questions;
    return (qs?.[0]?.examName || '').toUpperCase();
  }, []);

  // Predicted overall score (weighted by section totals) - exam-specific
  const predictedScore = useMemo(() => {
    if (!hasConversion || (conversionRows as any[])?.length === 0) return null;
    const entries = Object.entries(sectionAnalytics);
    if (entries.length === 0) return null;
    const qs = usePaperSessionStore.getState().questions;
    let weightedSum = 0;
    let totalWeight = 0;
    for (const [section, data] of entries) {
      const match = qs.find(q => (q.partLetter || '').trim() === section);
      const partLetterRaw = (match?.partLetter || section).toString().toUpperCase();
      const { name: convPartName } = resolveConversionPartName(examName, partLetterRaw, match?.partName, conversionRows as any[]);
      const scaled = scaleScore(conversionRows as any, convPartName as any, (data as any).correct, 'nearest');
      if (typeof scaled === 'number') {
        weightedSum += (scaled as number) * (data as any).total;
        totalWeight += (data as any).total;
      }
    }
    if (totalWeight === 0) return null;
    return Math.round((weightedSum / totalWeight) * 10) / 10;
  }, [hasConversion, conversionRows, sectionAnalytics, examName]);

  // Section percentiles state - only for ESAT
  const [sectionPercentiles, setSectionPercentiles] = useState<Record<string, { percentile: number | null; score: number | null; table: string | null; label: string }>>({});
  const [percentileTables, setPercentileTables] = useState<Record<string, { score: number; cumulativePct: number }[]>>({});

  useEffect(() => {
    // Only calculate percentiles for ESAT papers (which use ESAT percentile tables)
    if (examName !== 'ESAT') {
      // For non-ESAT exams, just show the converted scores without percentiles
      const qs = usePaperSessionStore.getState().questions;
      const entries = Object.entries(sectionAnalytics);
      const out: Record<string, { percentile: null; score: number | null; table: null; label: string }> = {};
      for (const [section, data] of entries) {
        const match = qs.find(q => (q.partLetter || '').trim() === section);
        const partLetterRaw = (match?.partLetter || section).toString().toUpperCase();
        const resolved = resolveConversionPartName(examName, partLetterRaw, match?.partName, conversionRows as any[]);
        const convPartName = resolved.name;
        const scaled = hasConversion ? scaleScore(conversionRows as any, convPartName as any, data.correct, 'nearest') : null;
        const score = typeof scaled === 'number' ? Math.round((scaled as number) * 10) / 10 : null;
        out[section] = { percentile: null, score, table: null, label: `${examName} Score` };
      }
      setSectionPercentiles(out);
      setPercentileTables({});
      return;
    }

    // ESAT-specific percentile calculation
    (async () => {
      try {
        const qs = usePaperSessionStore.getState().questions;
        const entries = Object.entries(sectionAnalytics);
        if (entries.length === 0) return;
        // Compute ESAT per section and decide table keys
        const needed: Record<string, { score: number | null; tableKey: string | null; label: string } > = {};
        for (const [section, data] of entries) {
          const match = qs.find(q => (q.partLetter || '').trim() === section);
          const partLetterRaw = (match?.partLetter || section).toString().toUpperCase();
          const resolved = resolveConversionPartName(examName, partLetterRaw, match?.partName, conversionRows as any[]);
          const convPartName = resolved.name;
          const scaled = hasConversion ? scaleScore(conversionRows as any, convPartName as any, data.correct, 'nearest') : null;
          const score = typeof scaled === 'number' ? Math.round((scaled as number) * 10) / 10 : null;
          const { key: tableKey, label } = mapSectionToTable({ examName, sectionLetter: partLetterRaw, sectionName: match?.partName });
          needed[section] = { score, tableKey, label };
        }
        // Fetch unique tables (only for ESAT)
        const uniqueKeys = Array.from(new Set(Object.values(needed).map(v => v.tableKey).filter(Boolean))) as string[];
        const keyToRows: Record<string, any[]> = {};
        await Promise.all(uniqueKeys.map(async (k) => {
          keyToRows[k] = await fetchEsatTable(k);
        }));
        const out: Record<string, { percentile: number | null; score: number | null; table: string | null; label: string }> = {};
        for (const [section, info] of Object.entries(needed)) {
          if (!info.score || !info.tableKey || !keyToRows[info.tableKey]) {
            out[section] = { percentile: null, score: info.score, table: info.tableKey, label: info.label };
            continue;
          }
          const p = interpolatePercentile(keyToRows[info.tableKey], info.score);
          const clamped = Math.max(0, Math.min(100, p));
          out[section] = { percentile: clamped, score: info.score, table: info.tableKey, label: info.label };
        }
        setSectionPercentiles(out);
        setPercentileTables(keyToRows as any);
      } catch (e) {
        // fail-soft
      }
    })();
  }, [sectionAnalytics, hasConversion, JSON.stringify(conversionRows), examName]);

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
  
  return (
    <Container size="lg">
      <div className="space-y-8">
        {/* Header */}
        <PageHeader title="Mark Session" description="Review answers, mark correctness, and study solutions." />

        {/* Main two-column layout - connected container with equal height */}
        <Card className="p-0 bg-neutral-900 border-0 overflow-hidden lg:h-[120vh]">
          <div
            className="grid grid-cols-1 lg:[grid-template-columns:var(--left-col)_minmax(0,1fr)] h-full"
            style={{ ['--left-col' as any]: `${LEFT_COLUMN_WIDTH_PX}px` }}
          >
            {/* Left column: list (narrow, scrolls) */}
            <div className="pt-3 pl-0 pr-1 border-b lg:border-b-0 lg:border-r border-white/10 h-full overflow-y-auto" style={{ scrollbarGutter: 'stable', paddingLeft: SCROLLBAR_GUTTER_PX }}>
              <div className="space-y-1">
                {/* Overview entry */}
                <button
                  className={`relative w-full text-left pr-3 pl-0 py-2 rounded-md overflow-hidden transition ${
                    selectedIndex === -1 ? "bg-[#1a1f27]" : "bg-[#0f1114] hover:bg-[#121418]"
                  }`}
                  style={selectedIndex === -1 ? { boxShadow: 'inset 4px 0 0 0 rgba(255,255,255,0.22)' } : undefined}
                  onClick={() => setSelectedIndex(-1)}
                >
          <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 pl-0">
                      <span className="inline-block" style={{ width: LEFT_LABEL_WIDTH_PX }} />
                      <div className="text-sm font-semibold">Overview</div>
            </div>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                      {Math.round((correctCountDerived / Math.max(totalQuestions, 1)) * 100)}%
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-90">
                        <polyline points="9 6 15 12 9 18" />
                      </svg>
                    </div>
              </div>
                </button>
                {partGroups.map((group, gi) => {
                  // Compute group score
                  const gCorrect = group.indexes.reduce((a, i) => a + (derivedCorrectFlags[i] === true ? 1 : 0), 0);
                  const gTotal = group.indexes.length;
                  const partDisplay = /^part/i.test(group.partLetter) ? group.partLetter : `Part ${group.partLetter}`;
                  return (
                    <div key={gi} className="rounded-md">
                      <details className="group" open>
                        <summary className="list-none cursor-pointer">
                          <div className="w-full pr-3 pl-0 py-2 rounded-md group-open:rounded-t-md group-open:rounded-b-none text-white" style={{ backgroundColor: group.color }}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="inline-block" style={{ width: LEFT_LABEL_WIDTH_PX }} />
                                <div className="text-sm font-semibold">{partDisplay}</div>
              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-[11px] opacity-90">{gCorrect}/{gTotal}</div>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-90">
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
            </div>
          </div>
          </div>
                        </summary>
                        <div className="mt-1 space-y-1 px-0.5 pb-1 bg-[#0f1114] rounded-md group-open:rounded-b-md group-open:rounded-t-none">
                        {group.indexes.map((index) => {
                          const qNumber = questionNumbers[index];
              const answer = answers[index];
                          const correct = derivedCorrectFlags[index];
              const guessed = guessedFlags[index];
              const timeSpent = perQuestionSec[index] || 0;
                          const q = usePaperSessionStore.getState().questions[index];
                          const partLetterRaw = (q?.partLetter || "").trim();
                          const partNameFull = (q?.partName || "").trim();
                          const sectionName = mapPartToSection({ partLetter: partLetterRaw, partName: partNameFull }, (paperName as any));
                          const partLetter = (partLetterRaw.replace(/^part\s*/i, '').trim() || partLetterRaw || '—').replace(/^Part\s*/,'');
                          const indicatorColor = guessed
                            ? PAPER_COLORS.advanced
                            : (correct === true
                                ? PAPER_COLORS.biology
                                : (correct === false ? PAPER_COLORS.chemistry : PAPER_COLORS.mathematics));
              return (
                            <button
                              key={qNumber}
                              className={`relative w-full text-left pr-3 pl-0 py-2 rounded-md overflow-hidden transition ${
                                selectedIndex === index ? "bg-[#161a1f]" : "bg-[#0f1114] hover:bg-[#121418]"
                              }`}
                              style={selectedIndex === index ? { boxShadow: `inset 4px 0 0 0 ${indicatorColor}` } : undefined}
                              onClick={() => setSelectedIndex(index)}
                            >
                  <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 pl-0">
                                {/* Left spacer controls alignment for Overview/Part headers and Q labels consistently */}
                                <span className="inline-block" style={{ width: LEFT_LABEL_WIDTH_PX }} />
                                {/* Fixed-width question label so Part pill aligns vertically across rows */}
                                <span className="text-sm text-neutral-200 inline-block text-left" style={{ width: QUESTION_LABEL_WIDTH_PX }}>Q{qNumber}</span>
                                  {/* Part pill with section color (showing Part X) */}
                                  <div className="text-[11px] px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: getSectionColor(sectionName) }}>
                                    {partLetter ? `Part ${partLetter}` : '—'}
                    </div>
                                  {/* Guess pill if guessed */}
                                  {guessed && (
                                    <div className="px-2 py-0.5 rounded-full text-white text-[11px]" style={{ backgroundColor: PAPER_COLORS.advanced }}>
                                      Guess
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-[11px] text-neutral-500">{formatTime(timeSpent)}</div>
                                  {correct === true && (
                                    <div className="px-1.5 py-0.5 rounded-full text-white flex items-center justify-center" style={{ backgroundColor: PAPER_COLORS.biology }}>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                    </div>
                                  )}
                                  {correct === false && (
                                    <div className="px-1.5 py-0.5 rounded-full text-white flex items-center justify-center" style={{ backgroundColor: PAPER_COLORS.chemistry }}>
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

            {/* Right column: detail view (fills, scrolls) */}
            <div className="p-4 h-full overflow-y-auto rounded-2xl" style={{ scrollbarGutter: 'stable' }}>
              {selectedIndex === -1 ? (
                <div className="space-y-6">
                  {/* Hero Section */}
                  <div className="space-y-4">
                    {/* Compact Header: type, year, section pills, date */}
                    <div className="flex items-start justify-between">
                  <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-lg font-semibold text-neutral-100">
                            {paperName} {sessionYear ?? ''}{variantDisplay ? `, ${variantDisplay}` : ''}
                          </div>
                          {/* Section pills */}
                          {sectionPills.map((s) => (
                            <span
                              key={s}
                              className="text-xs px-3 py-1.5 rounded-full font-medium"
                              style={{ backgroundColor: getSectionColor(s), color: '#ffffff' }}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          {startedAt && (
                            <div className="text-xs text-neutral-500">{new Date(startedAt).toLocaleDateString()}</div>
                          )}
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full ${hasConversion ? 'bg-[rgba(80,97,65,0.25)] text-neutral-200' : 'bg-neutral-800 text-neutral-400'}`}
                            title={hasConversion ? 'Conversion table found' : 'No conversion table'}
                          >
                            {hasConversion ? 'Conversion: Found' : 'Conversion: None'}
                          </span>
            </div>
                    </div>
                  </div>

                    {/* Overview Pills */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {/* Score */}
                      <div className={`${bubbleClass} flex flex-col items-center justify-center min-h-[96px]`}>
                        <div className="text-4xl font-bold text-neutral-100 leading-tight">{Math.round((correctCountDerived / Math.max(totalQuestions, 1)) * 100)}%</div>
                        <div className="text-xs text-neutral-400">{correctCountDerived}/{totalQuestions} correct</div>
                      </div>
                      {/* Predicted Score (exam-specific) */}
                      <div className={`${bubbleClass} flex flex-col items-center justify-center min-h-[96px]`}>
                        <div className="text-4xl font-bold text-neutral-100 leading-tight">{predictedScore !== null && predictedScore !== undefined ? predictedScore.toFixed(1) : '—'}</div>
                        <div className="text-xs text-neutral-400">Predicted {examName || 'score'}</div>
                      </div>
                      {/* Avg per Question */}
                      <div className={`${bubbleClass} flex flex-col items-center justify-center min-h-[96px]`}>
                        <div className="text-xs text-neutral-400">Avg per Question</div>
                        <div className="text-lg font-semibold text-neutral-200 leading-tight">{formatTime(Math.round(avgTimePerQuestion))}</div>
                      </div>
                      {/* Guessed */}
                      <div className={`${bubbleClass} flex flex-col items-center justify-center min-h-[96px]`}>
                        <div className="text-xs text-neutral-400">Guessed</div>
                        <div className="text-lg font-semibold text-neutral-200 leading-tight">{accuracyPatterns.guessed}/{totalQuestions}</div>
                      </div>
                    </div>

                      {/* Combined Guess Distribution moved into Guessing Behavior */}

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
                  </div>

                  {/* Main Content Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Time Management Analysis */}
                      <div className={`${bubbleClass} space-y-4 md:col-start-1 md:row-start-1`}>
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
                              <div className="flex w-full h-full">
                                <div style={{ width: `${correctPct}%`, backgroundColor: PAPER_COLORS.biology }} />
                                <div style={{ width: `${wrongPct}%`, backgroundColor: PAPER_COLORS.chemistry }} />
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

                    {/* Section Performance & Score Conversion (moved up next to Time Management) */}
                    <div className={`${bubbleClass} space-y-4 md:col-start-2 md:row-start-1`}>
                      <div className="text-base font-semibold text-neutral-100">Section Performance</div>
                      {/* Global conversion rows (all sections) */}
                      {hasConversion && (
                        <details>
                          <summary className="cursor-pointer text-[11px] text-neutral-400">View conversion rows</summary>
                          <div className="mt-2 text-[11px] text-neutral-300 space-y-1 max-h-48 overflow-y-auto">
                            {(() => {
                              const rows = (conversionRows as any[]).slice().sort((a,b) => {
                                if (a.partName === b.partName) return a.rawScore - b.rawScore;
                                return a.partName.localeCompare(b.partName);
                              });
                              if (rows.length === 0) return <div className="text-neutral-500">No conversion rows found</div>;
                              return rows.map((r, idx) => (
                                <div key={idx} className="flex items-center justify-between">
                                  <span>{r.partName} • Raw {r.rawScore}</span>
                                  <span>→ {examName} {r.scaledScore !== undefined && r.scaledScore !== null ? Number(r.scaledScore).toFixed(1) : '—'}</span>
                                </div>
                              ));
                            })()}
                          </div>
                        </details>
                      )}
                      <div className="space-y-3">
                        {Object.entries(sectionAnalytics).map(([section, data]) => {
                          const accuracy = data.total > 0 ? (data.correct / data.total) * 100 : 0;
                          let scaledScore: number | null = null;
                          if (hasConversion && conversionRows.length > 0) {
                            const qs = usePaperSessionStore.getState().questions;
                          const match = qs.find(q => (q.partLetter || '').trim() === section);
                          const sectionExamName = (qs?.[0]?.examName || '').toUpperCase();
                          const partLetterRaw = (match?.partLetter || section).toString().toUpperCase();
                          const resolved = resolveConversionPartName(sectionExamName, partLetterRaw, match?.partName, conversionRows as any[]);
                          const convPartName = resolved.name;
                          const scaled = scaleScore(conversionRows as any, convPartName as any, data.correct, 'nearest');
                            scaledScore = typeof scaled === 'number' ? Math.round((scaled as number) * 10) / 10 : null;
                            console.log('[mark:section] Section score conversion', { 
                              section, 
                              sectionExamName, 
                              partLetterRaw, 
                              partName: match?.partName, 
                              convPartName, 
                              rawCorrect: data.correct, 
                              scaledScore, 
                              matched: resolved.matched,
                              availablePartNames: [...new Set(conversionRows.map((r: any) => r.partName))]
                            });
                            (data as any).__convPartName = convPartName;
                          (data as any).__convRowsFound = (conversionRows as any[]).some(r => (r.partName || '').toString().toLowerCase() === convPartName.toLowerCase());
                          }
                          const qsForPill = usePaperSessionStore.getState().questions;
                          const matchForPill = qsForPill.find(q => (q.partLetter || '').trim() === section);
                          const sectionNameForColor = mapPartToSection({ partLetter: (matchForPill?.partLetter || section).toString(), partName: matchForPill?.partName || '' }, (usePaperSessionStore.getState().questions?.[0]?.examName as any));
                          return (
                            <div key={section} className="p-3 rounded-md bg-neutral-900">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                  <div className="text-sm font-medium text-neutral-200">{section}</div>
                                    {sectionNameForColor && (
                                      <span className="text-[10px] px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: getSectionColor(sectionNameForColor) }}>
                                        {sectionNameForColor}
                                      </span>
                                    )}
                                  </div>
                                  {hasConversion && (
                                    <div className="mt-1 flex items-center gap-2">
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${ (data as any).__convRowsFound ? 'bg-[rgba(80,97,65,0.25)] text-neutral-200' : 'bg-[rgba(239,68,68,0.2)] text-neutral-300' }`}>
                                        {(data as any).__convRowsFound ? 'Mapped' : 'Not mapped'}{(data as any).__convPartName ? ` • ${(data as any).__convPartName}` : ''}
                                      </span>
                                      <span className="text-[10px] text-neutral-500">{data.correct}/{data.total} raw</span>
                                    </div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="text-xs text-neutral-400">{examName}</div>
                                  <div className="text-xl font-semibold text-neutral-100">{scaledScore !== null && scaledScore !== undefined ? scaledScore.toFixed(1) : '—'}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="flex-1 h-2 bg-neutral-700 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${accuracy}%`, backgroundColor: accuracy >= 80 ? PAPER_COLORS.biology : accuracy >= 60 ? PAPER_COLORS.advanced : PAPER_COLORS.chemistry }} />
                                </div>
                                <div className="text-xs font-semibold text-neutral-300">{Math.round(accuracy)}%</div>
                              </div>
                              <div className="flex items-center justify-between text-xs text-neutral-400">
                                <span>Avg: {formatTime(Math.round(data.avgTime))}</span>
                                {data.guessed > 0 && <span>{data.guessed} guessed</span>}
                              </div>
                              {/* per-section conversion rows removed; shown globally above */}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  

                  {/* Section Percentiles (only for ESAT) or Section Scores (for other exams) */}
                  {examName === 'ESAT' ? (
                  <div className={`${bubbleClass} space-y-3 md:col-span-2`}>
                    <div className="text-base font-semibold text-neutral-100">Section Percentiles</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(() => {
                        const entries = Object.entries(sectionAnalytics);
                        return entries.map(([section, data], idx) => {
                          const isLastSingle = entries.length % 2 === 1 && idx === entries.length - 1;
                        const sp = sectionPercentiles[section];
                        const pct = sp?.percentile;
                        const score = sp?.score;
                        const label = sp?.label || '—';
                        const percentile = sp?.percentile;
                        const qs = usePaperSessionStore.getState().questions;
                        const match = qs.find(q => (q.partLetter || '').trim() === section);
                        const partLetterRaw = (match?.partLetter || section).toString();
                        const partNameFull = match?.partName || '';
                        const sectionNameForColor = mapPartToSection({ partLetter: partLetterRaw, partName: partNameFull }, (paperName as any));
                        return (
                          <div key={section} className={`p-3 rounded-md bg-neutral-900 ${isLastSingle ? 'md:col-span-2 md:max-w-[560px] md:mx-auto' : ''}`}>
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-white px-2 py-0.5 rounded-full" style={{ backgroundColor: getSectionColor(sectionNameForColor) }}>
                                    {section}
                                  </span>
                                </div>
                                <div className="text-xs text-neutral-400">
                                  {examName === 'ESAT' 
                                    ? `from ESAT ${typeof score === 'number' ? score.toFixed(1) : '—'}`
                                    : `${examName} score: ${typeof score === 'number' ? score.toFixed(1) : '—'}`}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300">Table: {label}</span>
                                {/* Tooltip for methodology */}
                                <div className="relative group">
                                  <button className="w-5 h-5 rounded-full bg-neutral-800 text-neutral-300 flex items-center justify-center" title="How this is calculated">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <circle cx="12" cy="12" r="9" />
                                      <line x1="12" y1="16" x2="12" y2="12" />
                                      <circle cx="12" cy="8" r="1" />
                                    </svg>
                                  </button>
                                  <div className="absolute right-0 z-10 hidden group-hover:block bg-[#0f1114] text-[11px] text-neutral-300 p-2 rounded-md border border-white/10 w-64 shadow-lg">
                                    {examName === 'ESAT' 
                                      ? "We use the section's cumulative distribution: locate your ESAT score on the table and linearly interpolate between scores to estimate % of candidates at or below you. Top% = 100 − cumulative."
                                      : `We use ${examName} conversion tables to convert your raw score to a scaled score.`}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 text-2xl font-bold text-neutral-100 text-center">
                              {Number.isFinite(pct as any) ? `TOP ${(Math.max(0, 100 - (pct as number))).toFixed(1)}%` : '—'}
                            </div>
                            {/* Explanation moved to tooltip above */}
                            {/* Mini percentile chart */}
                            {sp?.table && percentileTables[sp.table] && (
                              <div className="mt-3 w-full max-w-[460px] mx-auto">
                                {(() => {
                                  const rows = percentileTables[sp.table] || [];
                                  const w = 400; const h = 175; const pad = 24;
                                  const xs = rows.map(r => r.score);
                                  const ys = rows.map(r => r.cumulativePct);
                                  if (xs.length < 2) return null;
                                  const minX = Math.min(...xs), maxX = Math.max(...xs);
                                  const minY = 0, maxY = 100;
                                  const toX = (x: number) => pad + ((x - minX) / Math.max(1e-9, (maxX - minX))) * (w - 2*pad);
                                  const toY = (y: number) => h - pad - ((y - minY) / Math.max(1e-9, (maxY - minY))) * (h - 2*pad);
                                  const points = rows.map(r => `${toX(r.score)},${toY(r.cumulativePct)}`).join(' ');
                                  const userX = toX(score ?? minX);
                                  const userY = toY(pct ?? 0);
                                  // Build shaded area polygon (area under curve up to user's score)
                                  const shadedPoints: string[] = [];
                                  shadedPoints.push(`${pad},${h - pad}`); // bottom-left
                                  // Add points up to user's score
                                  rows.forEach((r) => {
                                    if (r.score <= (score ?? minX)) {
                                      shadedPoints.push(`${toX(r.score)},${toY(r.cumulativePct)}`);
                                    }
                                  });
                                  shadedPoints.push(`${userX},${userY}`); // user's point
                                  shadedPoints.push(`${userX},${h - pad}`); // down to bottom
                                  shadedPoints.push(`${pad},${h - pad}`); // close polygon
                                  // Ticks
                                  const xTicks = [] as number[];
                                  for (let s = Math.ceil(minX); s <= Math.floor(maxX); s += 1) xTicks.push(s);
                                  const yTicks = [0, 25, 50, 75, 100];
                                  return (
                                    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" className="block">
                                      {/* Axes */}
                                      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#2a2d34" />
                                      <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#2a2d34" />
                                      {/* Shaded area for people behind you */}
                                      {Number.isFinite(score) && Number.isFinite(pct) && (
                                        <polygon points={shadedPoints.join(' ')} fill="rgba(80,97,65,0.15)" stroke="none" />
                                      )}
                                      {/* Ticks */}
                                      {xTicks.map((t, i) => (
                                        <g key={`xt-${i}`}>
                                          <line x1={toX(t)} y1={h - pad} x2={toX(t)} y2={h - pad + 4} stroke="#2a2d34" />
                                          <text x={toX(t)} y={h - pad + 12} fill="#7a7f87" fontSize="9" textAnchor="middle">{t}</text>
                                        </g>
                                      ))}
                                      {yTicks.map((t, i) => (
                                        <g key={`yt-${i}`}>
                                          <line x1={pad - 4} y1={toY(t)} x2={pad} y2={toY(t)} stroke="#2a2d34" />
                                          <text x={pad - 6} y={toY(t) + 3} fill="#7a7f87" fontSize="9" textAnchor="end">{t}</text>
                                        </g>
                                      ))}
                                      {/* Curve and marker */}
                                      <polyline points={points} fill="none" stroke="#7a7f87" strokeWidth="2" />
                                      <line x1={userX} y1={pad} x2={userX} y2={h-pad} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                                      <circle cx={userX} cy={userY} r="3" fill="#ffffff" />
                                      {/* Axis labels */}
                                      <text x={w/2} y={h - 4} fill="#9ca3af" fontSize="10" textAnchor="middle">{examName || 'Score'}</text>
                                      <text x={8} y={pad - 8} fill="#9ca3af" fontSize="10">Cumulative %</text>
                                    </svg>
                                  );
                                })()}
                              </div>
                            )}
                            <div className="mt-2 text-xs text-neutral-400">
                              If you sat the {examName} today, {Number.isFinite(pct as any) ? (100 - (pct as number)).toFixed(1) : '—'}% of test-takers would outperform you in {section}.
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
                  ) : (
                  <div className={`${bubbleClass} space-y-3 md:col-span-2`}>
                    <div className="text-base font-semibold text-neutral-100">Section Scores</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(() => {
                        const entries = Object.entries(sectionAnalytics);
                        return entries.map(([section, data], idx) => {
                          const isLastSingle = entries.length % 2 === 1 && idx === entries.length - 1;
                          const sp = sectionPercentiles[section];
                          const score = sp?.score;
                          const qs = usePaperSessionStore.getState().questions;
                          const match = qs.find(q => (q.partLetter || '').trim() === section);
                          const partLetterRaw = (match?.partLetter || section).toString();
                          const partNameFull = match?.partName || '';
                          const sectionNameForColor = mapPartToSection({ partLetter: partLetterRaw, partName: partNameFull }, (paperName as any));
                          const accuracy = data.total > 0 ? (data.correct / data.total) * 100 : 0;
                          return (
                            <div key={section} className={`p-3 rounded-md bg-neutral-900 ${isLastSingle ? 'md:col-span-2 md:max-w-[560px] md:mx-auto' : ''}`}>
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-white px-2 py-0.5 rounded-full" style={{ backgroundColor: getSectionColor(sectionNameForColor) }}>
                                      {section}
                                    </span>
                                  </div>
                                  <div className="text-xs text-neutral-400">
                                    {examName} score: {typeof score === 'number' ? score.toFixed(1) : '—'}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs text-neutral-400">{examName}</div>
                                  <div className="text-xl font-semibold text-neutral-100">{score !== null && score !== undefined ? score.toFixed(1) : '—'}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mb-2 mt-2">
                                <div className="flex-1 h-2 bg-neutral-700 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${accuracy}%`, backgroundColor: accuracy >= 80 ? PAPER_COLORS.biology : accuracy >= 60 ? PAPER_COLORS.advanced : PAPER_COLORS.chemistry }} />
                                </div>
                                <div className="text-xs font-semibold text-neutral-300">{Math.round(accuracy)}%</div>
                              </div>
                              <div className="flex items-center justify-between text-xs text-neutral-400">
                                <span>Avg: {formatTime(Math.round(data.avgTime))}</span>
                                {data.guessed > 0 && <span>{data.guessed} guessed</span>}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                  )}

                  {/* Guessing Behavior (separate container) */}
                  <div className={`${bubbleClass} space-y-3 md:col-span-2`}>
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
                          <div className="w-full h-6 bg-neutral-900 rounded-full overflow-hidden border border-white/5">
                            <div className="flex w-full h-full">
                              <div
                                className="h-full flex items-center justify-center text-[11px] font-medium"
                                style={{ width: `${correctPct}%`, backgroundColor: `${PAPER_COLORS.biology}cc` }}
                                title={`Correct guesses • ${correctPct}% of guess time`}
                              >
                                {correctPct >= 12 ? `${correctPct}%` : ''}
                          </div>
                              <div
                                className="h-full flex items-center justify-center text-[11px] font-medium"
                                style={{ width: `${wrongPct}%`, backgroundColor: `${PAPER_COLORS.chemistry}cc` }}
                                title={`Wrong guesses • ${wrongPct}% of guess time`}
                              >
                                {wrongPct >= 12 ? `${wrongPct}%` : ''}
                          </div>
                        </div>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-400">
                            <div className="flex items-center gap-2">
                              <span className="inline-block w-2 h-2 rounded" style={{ backgroundColor: PAPER_COLORS.biology }} />
                              <span>Correct • {correctCount} qns • avg {formatTime(Math.round(guessExtended.avgTimeCorrectGuess))}</span>
                          </div>
                            <div className="flex items-center gap-2">
                              <span className="inline-block w-2 h-2 rounded" style={{ backgroundColor: PAPER_COLORS.chemistry }} />
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
                        const guessColor = PAPER_COLORS.advanced; // amber
                        const correctBorder = PAPER_COLORS.biology;
                        const wrongBorder = PAPER_COLORS.chemistry;
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
                              <path d={area} fill={`${guessColor}33`} />
                              <path d={path} stroke={guessColor} strokeWidth={2} fill="none" />
                              {/* Guess timeline blocks */}
                      {questionNumbers.map((qn, idx) => {
                                // Center each block inside its band: [pad + idx*step, pad + (idx+1)*step)
                                const bandStart = pad + idx * step;
                                const rectX = bandStart + blockInset;
                                const guessed = guessedFlags[idx] === true;
                                const corr = derivedCorrectFlags[idx];
                                const fill = guessed ? guessColor : '#1a1f27';
                                const border = corr === true ? correctBorder : (corr === false ? wrongBorder : 'rgba(255,255,255,0.12)');
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
                        <div className="p-3 rounded-md bg-neutral-900 text-center">
                          <div className="text-xs text-neutral-400 mb-1">Correct</div>
                          <div className="text-2xl font-bold" style={{ color: PAPER_COLORS.biology }}>
                            {accuracyPatterns.correct}
                          </div>
                          <div className="text-xs text-neutral-500 mt-1">
                            {Math.round((accuracyPatterns.correct / totalQuestions) * 100)}%
                          </div>
                        </div>
                        <div className="p-3 rounded-md bg-neutral-900 text-center">
                          <div className="text-xs text-neutral-400 mb-1">Incorrect</div>
                          <div className="text-2xl font-bold" style={{ color: PAPER_COLORS.chemistry }}>
                            {accuracyPatterns.incorrect}
                          </div>
                          <div className="text-xs text-neutral-500 mt-1">
                            {Math.round((accuracyPatterns.incorrect / totalQuestions) * 100)}%
                          </div>
                        </div>
                        <div className="p-3 rounded-md bg-neutral-900 text-center">
                          <div className="text-xs text-neutral-400 mb-1">Guessed</div>
                          <div className="text-2xl font-bold" style={{ color: PAPER_COLORS.advanced }}>
                            {accuracyPatterns.guessed}
                      </div>
                          <div className="text-xs text-neutral-500 mt-1">
                            {Math.round((accuracyPatterns.guessed / totalQuestions) * 100)}%
                          </div>
                          </div>
                      </div>

                      {/* Guessing Performance (sentence style) */}
                      <div className="p-4 rounded-md bg-neutral-900 text-center">
                        <div className="text-sm text-neutral-300">Your guessing accuracy was:</div>
                        <div className="text-2xl font-bold leading-tight" style={{ color: 'rgba(200, 200, 200, 0.9)' }}>
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
                          <div className="p-2 rounded bg-neutral-900 text-center">
                            <div className="text-xs text-neutral-400">Longest Correct</div>
                            <div className="text-lg font-semibold" style={{ color: PAPER_COLORS.biology }}>
                              {streaks.longestCorrect}
                            </div>
                          </div>
                          <div className="p-2 rounded bg-neutral-900 text-center">
                            <div className="text-xs text-neutral-400">Longest Incorrect</div>
                            <div className="text-lg font-semibold" style={{ color: PAPER_COLORS.chemistry }}>
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

                            const accStroke = performanceTrend.trend === 'improving' ? PAPER_COLORS.biology : performanceTrend.trend === 'declining' ? PAPER_COLORS.chemistry : 'rgba(255,255,255,0.5)';
                            const speedStroke = PAPER_COLORS.mathematics ?? 'rgba(120,180,255,0.9)';

                            const accPath = buildSmoothPath(accValues);
                            const speedPath = buildSmoothPath(speedValues);

                            const msg = performanceTrend.trend === 'improving'
                              ? 'Accuracy improved as the session progressed.'
                              : performanceTrend.trend === 'declining'
                                ? 'Accuracy declined towards the end of the session.'
                                : 'Accuracy remained relatively steady throughout the session.';

                            return (
                              <div className="space-y-2">
                                <div className="rounded-md bg-neutral-900 p-2 flex justify-center">
                                  <svg width={w} height={h} className="h-16 w-[320px] block">
                                    <path d={speedPath} stroke={speedStroke} strokeWidth={2} fill="none" />
                                    <path d={accPath} stroke={accStroke} strokeWidth={2} fill="none" />
                                  </svg>
                          </div>
                                <div className="flex items-center justify-center gap-4 text-[11px] text-neutral-400">
                                  <div className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded" style={{ backgroundColor: speedStroke }} />Speed</div>
                                  <div className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded" style={{ backgroundColor: accStroke }} />Accuracy</div>
                          </div>
                                <div className="text-[11px] text-neutral-400 text-center">{msg}</div>
                          </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Mistake Analysis */}
                    <div className={`${bubbleClass} space-y-4`}>
                      <div className="text-base font-semibold text-neutral-100">Mistake Analysis</div>
                      
                      <MistakeChart mistakeTags={mistakeTags} />

                      {topMistakes.length > 0 && (
                        <div>
                          <div className="text-xs text-neutral-400 mb-2">Top Mistakes</div>
                  <div className="space-y-2">
                            {topMistakes.map(([tag, count], idx) => (
                              <div key={tag} className="flex items-center justify-between p-2 rounded bg-[#0f1114]">
                                <span className="text-xs text-neutral-300">{idx + 1}. {tag}</span>
                                <span className="text-xs font-semibold text-neutral-400">{count}</span>
                              </div>
                      ))}
                    </div>
                  </div>
                      )}

                      {Object.keys(mistakesBySection).length > 0 && (
                        <div>
                          <div className="text-xs text-neutral-400 mb-2">Mistakes by Section</div>
                          <div className="space-y-2">
                            {Object.entries(mistakesBySection).map(([section, mistakes]) => {
                              const total = Object.values(mistakes).reduce((a, b) => a + b, 0);
                              return (
                                <div key={section} className="p-2 rounded bg-[#0f1114]">
                                  <div className="text-xs text-neutral-300 mb-1">{section}</div>
                                  <div className="text-xs text-neutral-400">{total} total mistakes</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Time vs Question Chart - Full Width (already placed above). Duplicate removed. */}

                  {/* Key Insights removed */}
                </div>
              ) : (
              <>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="text-base font-semibold text-neutral-200">Question</div>
                  <div className="text-base font-semibold text-neutral-200">{questionNumbers[selectedIndex]}</div>
                    <button
                    onClick={() => setShowAnswer(!showAnswer)}
                    className="ml-1 px-2 py-1 text-xs rounded-md ring-1 transition bg-neutral-800 text-neutral-300 ring-white/10 hover:bg-neutral-700 flex items-center gap-1"
                    title={showAnswer ? "Hide answer key" : "Show answer key"}
                  >
                    {showAnswer ? (
                      // eye-off (simplified)
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.94 10.94 0 0112 19c-7 0-11-7-11-7a21.8 21.8 0 014.22-5.56" />
                        <path d="M9.88 5.09A10.94 10.94 0 0112 5c7 0 11 7 11 7a21.8 21.8 0 01-3.87 5.13" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      // eye (simplified)
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                    {showAnswer ? "Hide Answer" : "Show Answer"}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className={`px-2 py-1 text-xs rounded-md ring-1 transition flex items-center gap-1 ${
                      (derivedCorrectFlags[selectedIndex] ?? correctFlags[selectedIndex]) === true ? "text-white" : "text-neutral-300 ring-white/10 hover:bg-neutral-700"
                    }`}
                    style={(derivedCorrectFlags[selectedIndex] ?? correctFlags[selectedIndex]) === true ? { backgroundColor: PAPER_COLORS.biology } : { backgroundColor: "#1f1f1f" }}
                    onClick={() => setCorrectFlag(selectedIndex, correctFlags[selectedIndex] === true ? null : true)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    Correct
                    </button>
                    <button
                      className={`px-2 py-1 text-xs rounded-md ring-1 transition flex items-center gap-1 ${
                      (derivedCorrectFlags[selectedIndex] ?? correctFlags[selectedIndex]) === false ? "text-white" : "text-neutral-300 ring-white/10 hover:bg-neutral-700"
                      }`}
                    style={(derivedCorrectFlags[selectedIndex] ?? correctFlags[selectedIndex]) === false ? { backgroundColor: PAPER_COLORS.chemistry } : { backgroundColor: "#1f1f1f" }}
                    onClick={() => setCorrectFlag(selectedIndex, correctFlags[selectedIndex] === false ? null : false)}
                    >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    Wrong
                    </button>
                    <button
                      className={`px-2 py-1 text-xs rounded-md ring-1 transition flex items-center gap-1 ${
                        guessedFlags[selectedIndex]
                          ? "text-white"
                          : "text-neutral-300 ring-white/10 hover:bg-neutral-700"
                      }`}
                      style={guessedFlags[selectedIndex]
                        ? { backgroundColor: PAPER_COLORS.advanced }
                        : { backgroundColor: '#1f1f1f' }}
                      onClick={() => setGuessedFlag(selectedIndex, !guessedFlags[selectedIndex])}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={guessedFlags[selectedIndex] ? 'white' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="8.5" />
                        <path d="M9.25 9.9c.35-1.2 1.5-2 2.75-2 1.6 0 2.9 1.2 2.9 2.7 0 1.9-1.9 2.2-2.6 3.3" />
                        <path d="M12 16.9h.01" />
                      </svg>
                      Guess
                    </button>
                </div>
                  </div>

              {/* Answers summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div
                  className="p-3 rounded-md border border-white/10"
                  style={{
                    backgroundColor: guessedFlags[selectedIndex]
                      ? PAPER_COLORS.advanced
                      : ((derivedCorrectFlags[selectedIndex] ?? correctFlags[selectedIndex]) === true
                          ? PAPER_COLORS.biology
                          : ((derivedCorrectFlags[selectedIndex] ?? correctFlags[selectedIndex]) === false
                              ? PAPER_COLORS.chemistry
                              : '#2b2f36'))
                  }}
                >
                  <div className="text-xs text-white/90">Your answer</div>
                  <div className="text-white text-sm mt-1">{answers[selectedIndex]?.choice ?? "—"}</div>
                </div>
                <div
                  className="p-3 rounded-md"
                  style={{ backgroundColor: PAPER_COLORS.biology }}
                >
                  <div className="text-xs text-white/90">Correct answer</div>
                  <div className="text-white text-sm mt-1">{(usePaperSessionStore.getState().questions[selectedIndex]?.answerLetter || "").toUpperCase()}</div>
                </div>
                <div className="p-3 rounded-md" style={{ backgroundColor: '#2b2f36' }}>
                  <div className="text-xs text-neutral-200">Time taken</div>
                  <div className="text-neutral-50 text-sm mt-1">{formatTime(perQuestionSec[selectedIndex] || 0)}</div>
                </div>
              </div>

              {/* Question and Answer - Side by Side (normal) or Stacked (TMUA) */}
              {(() => {
                const question = usePaperSessionStore.getState().questions[selectedIndex];
                const isTMUA = question?.questionImage && question?.solutionImage && !question?.solutionText;
                const questionImgSrc = (isTMUA && croppedQuestionImage) ? croppedQuestionImage : question?.questionImage;
                
                return (
                  <div className={`grid gap-4 transition-all duration-300 ${isTMUA ? 'grid-cols-1' : (showAnswer ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1')}`}>
                    {/* Question image */}
                    <div className={`relative rounded-lg p-2 pb-12 transition-all duration-300 ${showAnswer && !isTMUA ? '' : 'w-full'}`} style={{ backgroundColor: isDarkMode ? '#000000' : '#ffffff' }}>
                      <div className="flex items-center justify-center">
                        <img
                          src={questionImgSrc}
                          alt={`Question ${questionNumbers[selectedIndex]}`}
                          className="rounded-md object-contain transition-all duration-300"
                          style={{
                            transition: "filter 300ms ease-in-out, opacity 300ms ease-in-out, max-height 300ms ease-in-out",
                            filter: isDarkMode ? 'invert(1) hue-rotate(180deg)' : 'none',
                            maxHeight: isTMUA ? 'auto' : (showAnswer ? '72vh' : '84vh'),
                            width: 'auto',
                            maxWidth: `${RIGHT_PANEL_IMAGE_SCALE * 100}%`
                          }}
                        />
                      </div>
                  {/* Fullscreen Button - Bottom Left */}
                  <div className="absolute left-8 pointer-events-auto" style={{ bottom: '48px' }}>
                            <button
                      onClick={() => {
                        setIsFullscreen(true);
                        setFullscreenImage('question');
                      }}
                      className="
                        flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-normal transition-all duration-200
                        backdrop-blur-sm border shadow-sm bg-black/40 border-white/15 text-white/70 hover:bg-black/50 hover:text-white/90 hover:border-white/25
                      "
                      title="Enter fullscreen mode"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                      <span className="hidden sm:inline">Fullscreen</span>
                    </button>
                  </div>
                  {/* Dark Mode Toggle - Bottom Right */}
                  <div className="absolute right-8 pointer-events-auto" style={{ bottom: '48px' }}>
                            <button
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      className={`
                        flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-normal transition-all duration-200
                        backdrop-blur-sm border shadow-sm bg-black/40 border-white/15 text-white/70 hover:bg-black/50 hover:text-white/90 hover:border-white/25
                      `}
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
                      </div>

                    {/* Answer/Solution section - only show when showAnswer is true */}
                    {showAnswer && (() => {
                      const question = usePaperSessionStore.getState().questions[selectedIndex];
                      const isTMUA = question?.questionImage && question?.solutionImage && !question?.solutionText;
                      const answerImgSrc = (isTMUA && croppedAnswerImage) ? croppedAnswerImage : question?.solutionImage;
                      
                      if (isTMUA) {
                        // TMUA: Answer image below question with solution label
                        return (
                          <div className="relative rounded-lg p-2 pb-12 transition-all duration-300 w-full border-2" style={{ backgroundColor: isDarkMode ? '#000000' : '#ffffff', borderColor: PAPER_COLORS.biology + '40' }}>
                            {/* Solution Header */}
                            <div className="absolute top-3 left-8 z-10 px-3 py-1.5 rounded-md backdrop-blur-md border shadow-sm bg-black/30 border-white/10 text-white/80">
                              <div className="text-sm font-normal" style={{ fontFamily: 'Garamond, serif' }}>Official Solution</div>
                            </div>
                            <div className="flex items-center justify-center">
                              <img
                                src={answerImgSrc as string}
                                alt="Solution"
                                className="rounded-md object-contain transition-all duration-300"
                                style={{
                                  filter: isDarkMode ? 'invert(1) hue-rotate(180deg)' : 'none',
                                  transition: "filter 300ms ease-in-out",
                                  maxWidth: `${RIGHT_PANEL_IMAGE_SCALE * 100}%`
                                }}
                        />
                      </div>
                            {/* Fullscreen Button - Bottom Left */}
                            <div className="absolute left-8 pointer-events-auto" style={{ bottom: '48px' }}>
                              <button
                                onClick={() => {
                                  setIsFullscreen(true);
                                  setFullscreenImage('solution');
                                }}
                                className="
                                  flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-normal transition-all duration-200
                                  backdrop-blur-sm border shadow-sm bg-black/40 border-white/15 text-white/70 hover:bg-black/50 hover:text-white/90 hover:border-white/25
                                "
                                title="Enter fullscreen mode"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                </svg>
                                <span className="hidden sm:inline">Fullscreen</span>
                              </button>
                            </div>
                            {/* Dark Mode Toggle - Bottom Right */}
                            <div className="absolute right-8 pointer-events-auto" style={{ bottom: '48px' }}>
                              <button
                                onClick={() => setIsDarkMode(!isDarkMode)}
                                className={`
                                  flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-normal transition-all duration-200
                                  backdrop-blur-sm border shadow-sm bg-black/40 border-white/15 text-white/70 hover:bg-black/50 hover:text-white/90 hover:border-white/25
                                `}
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
                          </div>
                        );
                      }
                      
                      // Normal: Side-by-side layout
                      return (
                        <div className="rounded-lg p-4 bg-neutral-800 overflow-y-auto transition-all duration-300" style={{ maxHeight: '72vh' }}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-sm font-semibold text-neutral-200">Suggested Answer</div>
                            {currentQuestionTitle && (
                              <div className="ml-3 px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#1f1f1f', color: '#d1d5db' }}>
                                {currentQuestionTitle}
                              </div>
                            )}
                          </div>
                          <div className="space-y-3">
                            {question?.solutionText && (
                              <MathContent 
                                content={(question.solutionText || "")
                                  .replace(/<tip>.*?<\/tip>/gis, '')
                                  .replace(/<question_title>[\s\S]*?<\/question_title>/gi, '')
                                  .replace(/<question>[\s\S]*?<\/question>/gi, '')
                                  .replace(/^\s*Question\s+\d+\s*[:.\-]?\s*/i, '')} 
                                className="text-neutral-200 text-sm" 
                              />
                            )}
                            {question?.solutionImage && (
                              <div className="relative">
                                <img
                                  src={answerImgSrc as string}
                                  alt="Solution"
                                  className="h-auto object-contain rounded-md mx-auto"
                                  style={{
                                    filter: isDarkMode ? 'invert(1) hue-rotate(180deg)' : 'none',
                                    transition: "filter 300ms ease-in-out",
                                    maxWidth: `${RIGHT_PANEL_IMAGE_SCALE * 100}%`
                                  }}
                                />
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
                              <div className="text-sm text-neutral-500">No solution available</div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}

              {/* Tip Section - Full Width Below Question/Answer */}
              {currentTip && (
                <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: PAPER_COLORS.biology + '20' }}>
                  <div className="space-y-3">
                    {/* Tip Header */}
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" style={{ color: PAPER_COLORS.biology }} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div className="text-base font-bold" style={{ color: PAPER_COLORS.biology }}>Tip</div>
                  </div>
                    {/* Tip Content */}
                    <div className="text-sm text-neutral-200 leading-relaxed">
                      <MathContent content={currentTip} className="text-neutral-200 text-sm" />
                    </div>
                  </div>
                </div>
              )}

              {/* Fullscreen overlay (match /solve structure) */}
              {isFullscreen && createPortal(
                <div className="fixed inset-0 z-[99999] bg-black">
                  {/* Exit Fullscreen Button - Top Right */}
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
                  {/* Dark/Light toggle bottom-right */}
                  <div className="absolute bottom-8 right-8 z-[100001] pointer-events-auto" style={{ bottom: '32px' }}>
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
                  {/* Image centered */}
                  <div className="absolute inset-0 z-[100000] flex items-center justify-center p-6">
                    {(() => {
                      const question = usePaperSessionStore.getState().questions[selectedIndex];
                      const isSolution = fullscreenImage === 'solution';
                      const imgSrc = isSolution 
                        ? (croppedAnswerImage || question?.solutionImage)
                        : (croppedQuestionImage || question?.questionImage);
                      const imgAlt = isSolution ? 'Solution' : `Question ${questionNumbers[selectedIndex]}`;
                      return (
                        <img
                          src={imgSrc as string}
                          alt={imgAlt}
                          className="rounded-md object-contain max-h-full max-w-full"
                          style={{ filter: isDarkMode ? 'invert(1) hue-rotate(180deg)' : 'none' }}
                        />
                      );
                    })()}
          </div>
                </div>,
                document.body
              )}

              {/* Notes for this question & Add to Drill */}
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowNotesBox(!showNotesBox)}
                      className="px-2.5 py-1.5 text-xs rounded-md transition bg-[#0f1114] text-neutral-300 hover:bg-[#121418] flex items-center gap-1.5"
                      aria-expanded={showNotesBox}
                      title={showNotesBox ? "Hide note" : "Add a personal note"}
                    >
                      <svg className={`${showNotesBox ? 'rotate-90' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 6 15 12 9 18" />
                      </svg>
                      <span>{showNotesBox ? 'Hide note' : 'Add a personal note'}</span>
                  </button>
                    {/* Tooltip icon (same style as other tooltips on this page) */}
                    <div className="relative group">
                      <button className="w-5 h-5 rounded-full bg-neutral-800 text-neutral-300 flex items-center justify-center" title="Notes info">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="9" />
                          <line x1="12" y1="16" x2="12" y2="12" />
                          <circle cx="12" cy="8" r="1" />
                        </svg>
                  </button>
                      <div className="absolute left-0 z-10 hidden group-hover:block bg-[#0f1114] text-[11px] text-neutral-300 p-2 rounded-md border border-white/10 w-64 shadow-lg">
                        This note will appear with this question if you add it to Drill. You can review your notes in the Papers archive. Everything you type is autosaved.
                      </div>
                      </div>
                    </div>
                    {(noteStatus === 'typing' || noteStatus === 'saved') && (
                    <div className={`px-2 py-0.5 rounded-md text-[11px] ${noteStatus === 'saved' ? 'bg-[rgba(80,97,65,0.2)] text-[#a6d48a]' : 'bg-transparent text-neutral-400'}`}>
                        {noteStatus === 'typing' ? 'Saving…' : 'Saved'}
                      </div>
                    )}
                  </div>
                {showNotesBox && (
                  <div>
                    <textarea
                      value={answers[selectedIndex]?.explanation || ""}
                      onChange={(e) => {
                        setExplanation(selectedIndex, e.target.value);
                        setNoteStatus('typing');
                        if (noteDebounceRef.current) clearTimeout(noteDebounceRef.current);
                        noteDebounceRef.current = setTimeout(() => setNoteStatus('saved'), 700);
                      }}
                      placeholder="Key takeaways for later practice… Use \\( ... \\) or \\[ ... \\] for math."
                      className="w-full px-4 py-3 text-neutral-100 rounded-lg bg-white/5 text-sm resize-none placeholder:text-neutral-400 outline-none focus:outline-none focus:ring-0 ring-0 border-0"
                      rows={4}
                    />
        </div>
                  )}
                </div>
               </>
                  )}
                </div>
          </div>
        </Card>

        {/* Statistics section removed; moved into Overview toggle */}

        {/* Notes & insights moved to bottom and restyled */}

        {/* Mistake Analysis & Drill Setup */}
        <Card className="p-6 border-0">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold text-neutral-100">Mistake Analysis & Drill Setup</div>
              <div className={`px-2 py-0.5 rounded-md text-[11px] ${noteStatus === 'saved' ? 'bg-[rgba(80,97,65,0.2)] text-[#a6d48a]' : 'bg-transparent text-neutral-400'}`}>
                {noteStatus === 'typing' ? 'Saving…' : 'Saved'}
              </div>
            </div>
            <div className="text-sm text-neutral-300">Click a question number to open it on the right. Tag the mistake, and check include to add to your drill pool.</div>
            <div className="flex items-center gap-2 flex-wrap">
              {(() => {
                const wrongIdx = questionNumbers.map((_, i) => i).filter(i => (derivedCorrectFlags[i] ?? correctFlags[i]) === false);
                const allSelected = wrongIdx.length > 0 && wrongIdx.every(i => answers[i]?.addToDrill === true);
                return (
                  <button
                    className="px-3 py-1.5 text-xs rounded-md ring-1 transition bg-[#0f1114] text-neutral-300 ring-white/10 hover:bg-[#121418]"
                    onClick={() => {
                      setNoteStatus('typing');
                      wrongIdx.forEach(i => setAddToDrill(i, !allSelected));
                      setTimeout(() => setNoteStatus('saved'), 700);
                    }}
                  >
                    {allSelected ? 'Deselect all' : 'Select all'}
                  </button>
                );
              })()}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {questionNumbers.map((qn, index) => {
                const isWrong = (derivedCorrectFlags[index] ?? correctFlags[index]) === false;
                if (!isWrong) return null;
                const tags = Array.isArray(mistakeTags[index]) ? (mistakeTags[index] as any[]) : [];
                const include = answers[index]?.addToDrill === true;
                const preset = ['Misread question','Rushed calculation','Concept gap','Method recall','Careless arithmetic','Unit/scale error','Diagram interpretation','Time pressure','Second-guessing','Didn’t review options'];
                const customKey = 'paper.customMistakeTags';
                const custom = (() => { try { return JSON.parse((localStorage.getItem(customKey) || '[]') as unknown as string); } catch { return []; } })();
                const opts = Array.from(new Set([...preset, ...custom]));
                return (
                  <div key={qn} className="flex items-center justify-between bg-[#0f1114] hover:bg-[#121418] rounded-md px-3 py-2">
                    <button className="text-sm font-medium text-neutral-200" onClick={() => setSelectedIndex(index)}>Q{qn}</button>
                    <div className="flex items-center gap-2">
                      <MistakeSelect
                        value={Array.isArray(tags) ? tags : []}
                        options={opts}
                        onCreateOption={(label: string) => {
                          const next = Array.from(new Set([...custom, label]));
                          localStorage.setItem(customKey, JSON.stringify(next));
                        }}
                        onChange={(next: string[]) => {
                          setNoteStatus('typing');
                          setMistakeTag(index, next as any);
                          setTimeout(() => setNoteStatus('saved'), 700);
                        }}
                      />
                      <button
                        aria-pressed={include}
                        onClick={() => { setNoteStatus('typing'); setAddToDrill(index, !include); setTimeout(() => setNoteStatus('saved'), 700); }}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs transition ${include ? 'bg-[rgba(80,97,65,0.25)] text-neutral-100' : 'bg-[#141820] text-neutral-300 hover:bg-[#161a21]'}`}
                        title="Include in drill"
                      >
                        <span className={`inline-block w-3 h-3 rounded-[4px]`} style={{ backgroundColor: include ? PAPER_COLORS.biology : 'rgba(255,255,255,0.08)' }} />
                        Include
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Session Notes - bottom, modern styling */}
          <Card className="p-6 border-0">
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
                  <div className="absolute left-0 z-10 hidden group-hover:block bg-[#0f1114] text-[11px] text-neutral-300 p-2 rounded-md border border-white/10 w-64 shadow-lg">
                    These notes are private. They are autosaved and available in the Papers archive.
                  </div>
              </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-[11px] text-neutral-400">Private to you</div>
                <div className={`px-2 py-0.5 rounded-md text-[11px] ${sessionNoteStatus === 'saved' ? 'bg-[rgba(80,97,65,0.2)] text-[#a6d48a]' : 'bg-transparent text-neutral-400'}`}>
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
          </Card>

        {/* Key insights removed per design */}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            className="px-4 py-2 text-sm rounded-md ring-1 ring-white/10 bg-[#0f1114] text-neutral-300 hover:bg-[#121418]"
            onClick={() => router.push("/papers/plan")}
          >
            New Session
          </Button>
          <Button
            variant="primary"
            className="px-4 py-2 text-sm rounded-md text-white shadow-glow"
            style={{ backgroundColor: PAPER_COLORS.biology, borderColor: 'rgba(255,255,255,0.15)' }}
            onClick={handleSaveAndContinue}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save & Continue"}
          </Button>
        </div>
      </div>
    </Container>
  );
}

