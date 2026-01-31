/**
 * Papers Mark page - Marking and review interface
 */

"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef, Fragment } from "react";
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
import { fetchEsatTable, interpolatePercentile, interpolateScore, mapSectionToTable } from "@/lib/esat/percentiles";
import { cropImageToContent } from "@/lib/utils/imageCrop";
import type { Letter, MistakeTag, PaperSession } from "@/types/papers";
import { PageHeader } from "@/components/shared/PageHeader";
import type { QuestionStats } from "@/types/questionStats";
import { fetchInProgressSessions } from "@/lib/papers/analytics";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { ArrowRight, Trash2 } from "lucide-react";
import { deletePaperSession } from "@/lib/supabase/papers";
import { deleteSession } from "@/lib/storage/sessionStorage";
import { cn } from "@/lib/utils";

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
    setEndedAt,
    loadSessionFromDatabase,
  } = usePaperSessionStore();
  
  const session = useSupabaseSession();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<'question' | 'solution' | null>(null);
  const [showAnswer, setShowAnswer] = useState(true);
  const [drillSelection, setDrillSelection] = useState<number[]>([]);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [conversionRows, setConversionRows] = useState<any[]>([]);
  const [hasConversion, setHasConversion] = useState(false);
  const [croppedQuestionImage, setCroppedQuestionImage] = useState<string | null>(null);
  const [croppedAnswerImage, setCroppedAnswerImage] = useState<string | null>(null);
  // Session notes saving UX
  const [sessionNoteStatus, setSessionNoteStatus] = useState<'idle' | 'typing' | 'saved'>('idle');
  const sessionNoteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Section percentiles state - for all exams
  const [sectionPercentiles, setSectionPercentiles] = useState<Record<string, { percentile: number | null; score: number | null; table: string | null; label: string; oldPercentile?: number | null; newEquivalentScore?: number | null }>>({});
  const [percentileTables, setPercentileTables] = useState<Record<string, { score: number; cumulativePct: number }[]>>({});
  // NSAA: toggle to show individual subjects vs averaged
  const [showIndividualNSAASubjects, setShowIndividualNSAASubjects] = useState(false);
  // NSAA: averaged percentile across all subjects
  const [nsaaAveragedPercentile, setNsaaAveragedPercentile] = useState<number | null>(null);
  // Conversion table popup state
  const [showConversionPopup, setShowConversionPopup] = useState(false);
  const conversionPopupRef = useRef<HTMLDivElement>(null);
  // Community stats state
  const [questionStats, setQuestionStats] = useState<Record<number, QuestionStats>>({});
  const [statsLoading, setStatsLoading] = useState(false);
  // In-progress sessions state
  const [inProgressSessions, setInProgressSessions] = useState<PaperSession[]>([]);
  const [checkingInProgress, setCheckingInProgress] = useState(false);
  
  // Compute values needed for hooks (with safe defaults if no session)
  const totalQuestions = sessionId ? getTotalQuestions() : 0;
  const correctCount = sessionId ? getCorrectCount() : 0;
  const maxQuestionNumber = sessionId && totalQuestions > 0 ? (questionRange.start + totalQuestions - 1) : 0;
  const maxDigits = Math.max(1, String(maxQuestionNumber).length);
  const QUESTION_LABEL_WIDTH_PX = maxDigits >= 3 ? 36 : 28;
  const questionNumbers = sessionId && totalQuestions > 0 ? Array.from({ length: totalQuestions }, (_, i) => questionRange.start + i) : [];
  
  // All hooks must be called before any early returns
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!paperId) return;
        const qs = usePaperSessionStore.getState().questions;
        const currentExamName = (qs?.[0]?.examName || '').toUpperCase();
        const currentPaperName = paperName;
        
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
        if (examName && year) {
          const fallback = await findFallbackConversionTable(examName as any, year, examType);
          if (fallback) {
            const rows = await getConversionRows(fallback.id);
            if (!mounted) return;
          setConversionRows(rows);
          setHasConversion(rows.length > 0);
            return;
          }
        }
        // No conversion found
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

  // Close conversion popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!showConversionPopup) return;
      
      const target = event.target as HTMLElement;
      // Don't close if clicking the info button or inside the popup
      if (target.closest('button[title="View conversion table"]') || 
          conversionPopupRef.current?.contains(target)) {
        return;
      }
      
      setShowConversionPopup(false);
    };

    if (showConversionPopup) {
      // Use a small delay to avoid closing immediately when opening
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showConversionPopup]);

  // Fetch community stats for all questions in session
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!sessionId || totalQuestions === 0) return;
        
        const qs = usePaperSessionStore.getState().questions;
        const questionIds = qs.map((q) => q.id).filter((id) => id != null);
        
        if (questionIds.length === 0) return;
        
        setStatsLoading(true);
        const response = await fetch("/api/papers/questions/stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionIds }),
        });
        
        if (!mounted) return;
        
        if (!response.ok) {
          console.warn("[mark] Failed to fetch question stats:", response.statusText);
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
        console.error("[mark] Error fetching question stats:", error);
      } finally {
        if (mounted) {
          setStatsLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [sessionId, totalQuestions]);
  
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
      // CRITICAL: Set endedAt before persisting so session shows up in analytics/history
      const currentState = usePaperSessionStore.getState();
      if (!currentState.endedAt) {
        setEndedAt(Date.now());
      }
      
      await persistSessionToServer({ immediate: true });
      
      // Mark part IDs as completed in cache
      const state = usePaperSessionStore.getState();
      if (state.selectedPartIds && state.selectedPartIds.length > 0) {
        // Get user ID from Supabase
        const { data: { session: supabaseSession } } = await supabase.auth.getSession();
        if (supabaseSession?.user?.id) {
          const { markPartIdsAsCompleted, invalidateCache } = await import('@/lib/papers/completionCache');
          markPartIdsAsCompleted(supabaseSession.user.id, state.selectedPartIds);
          // Invalidate cache to force refresh on next load
          invalidateCache(supabaseSession.user.id);
        }
      }
      
      // Navigate to analytics page with session ID to highlight
      const sessionIdToHighlight = state.sessionId;
      if (sessionIdToHighlight) {
        router.push(`/papers/analytics?highlight=${sessionIdToHighlight}`);
      } else {
        router.push("/papers/analytics");
      }
    } catch (error) {
      console.error("[mark:handleSaveAndContinue] Failed to save session:", error);
      alert("Failed to save session. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAttempt = async () => {
    if (!sessionId) return;
    
    if (!confirm("Are you sure you want to delete this attempt? This action cannot be undone.")) {
      return;
    }

    try {
      // Delete from Supabase
      await deletePaperSession(sessionId);
      
      // Delete from IndexedDB
      await deleteSession(sessionId);
      
      // Clear the store
      usePaperSessionStore.getState().resetSession();
      
      router.push("/papers/library");
    } catch (error) {
      console.error("[mark:handleDeleteAttempt] Failed to delete session:", error);
      alert("Failed to delete session. Please try again.");
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
    const qs = usePaperSessionStore.getState().questions;
    if (!qs || qs.length === 0) return bySection;
    for (let i = 0; i < qs.length; i++) {
      let part = (qs[i]?.partLetter || "").trim();
      const partUpper = part.toUpperCase();
      
      // Filter out "SECTION" parts
      if (partUpper === 'SECTION' || partUpper.startsWith('SECTION ')) {
        console.warn(`[mark:sectionBreakdown] Skipping question ${qs[i]?.questionNumber} with invalid partLetter="${part}"`);
        continue;
      }
      
      const key = part || "Section";
      if (!bySection[key]) bySection[key] = { correct: 0, total: 0 };
      if (correctFlags[i] === true) bySection[key].correct += 1;
      bySection[key].total += 1;
    }
    return bySection;
  }, [correctFlags]);

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
    
    // Helper to derive partLetter from partName when missing
    const derivePartLetter = (partLetter: string, partName: string, paperType: string): string => {
      const trimmedLetter = (partLetter || '').trim();
      if (trimmedLetter && trimmedLetter !== '—') {
        return trimmedLetter;
      }
      
      // If partLetter is missing, try to derive it from partName
      const trimmedName = (partName || '').trim().toLowerCase();
      if (!trimmedName) return '—';
      
      // NSAA mappings: derive partLetter from partName
      // IMPORTANT: Check for "Advanced" first to avoid misclassifying Advanced Mathematics as Part A
      if (paperType === 'NSAA') {
        if (trimmedName.includes('advanced mathematics') && trimmedName.includes('advanced physics')) {
          return 'Part E';
        }
        // Check for "advanced" before regular subjects to avoid false matches
        if (trimmedName.includes('advanced')) {
          // If it has "advanced" but didn't match the full pattern above, still likely Part E
          return 'Part E';
        }
        if (trimmedName === 'mathematics' || (trimmedName.includes('mathematics') && !trimmedName.includes('advanced'))) {
          return 'Part A';
        }
        if (trimmedName === 'physics' || (trimmedName.includes('physics') && !trimmedName.includes('advanced'))) {
          return 'Part B';
        }
        if (trimmedName === 'chemistry' || trimmedName.includes('chemistry')) {
          return 'Part C';
        }
        if (trimmedName === 'biology' || trimmedName.includes('biology')) {
          return 'Part D';
        }
      }
      
      // ENGAA mappings
      if (paperType === 'ENGAA') {
        if (trimmedName.includes('advanced mathematics') && trimmedName.includes('advanced physics')) {
          return 'Part B';
        }
        if (trimmedName.includes('mathematics') && trimmedName.includes('physics')) {
          return 'Part A';
        }
      }
      
      return '—';
    };
    
    if (!qs || qs.length === 0) return groups;
    for (let i = 0; i < qs.length; i++) {
      const rawPartLetter = qs[i]?.partLetter || '';
      const partName = qs[i]?.partName || '';
      const pl = derivePartLetter(rawPartLetter, partName, paperName as string);
      
      if (map[pl] === undefined) {
        const section = mapPartToSection({ partLetter: pl, partName }, paperName as any);
        const color = getSectionColor(section);
        map[pl] = groups.length;
        groups.push({ partLetter: pl, sectionName: section, color, indexes: [i] });
      } else {
        groups[map[pl]].indexes.push(i);
      }
    }
    return groups;
  }, [paperName, questionNumbers]);

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
    if (!qs || qs.length === 0) return bySection;
    for (let i = 0; i < qs.length; i++) {
      let part = (qs[i]?.partLetter || "").trim();
      const partUpper = part.toUpperCase();
      
      // Filter out "SECTION" parts
      if (partUpper === 'SECTION' || partUpper.startsWith('SECTION ')) {
        console.warn(`[mark:sectionBreakdownDerived] Skipping question ${qs[i]?.questionNumber} with invalid partLetter="${part}"`);
        continue;
      }
      
      const key = part || "Section";
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
    
    const qs = usePaperSessionStore.getState().questions;
    const examName = (qs?.[0]?.examName || '').toUpperCase();
    const examYear = qs?.[0]?.examYear;
    const isNSAA2019 = examName === 'NSAA' && examYear === 2019;
    
    // DEEP DEBUG: Log all questions with their partLetters to find the source of "SECTION"
    const allQuestionParts = qs.slice(0, totalQuestions).map((q, idx) => ({
      index: idx,
      questionNumber: q.questionNumber,
      partLetter: q.partLetter,
      partName: q.partName,
      examType: q.examType,
      partLetterUpper: (q.partLetter || '').toUpperCase(),
      partLetterTrimmed: (q.partLetter || '').trim(),
      isEmpty: !q.partLetter || q.partLetter.trim() === ''
    }));
    
    // Check for empty/null partLetters that might become "Section"
    const emptyPartLetters = allQuestionParts.filter(q => q.isEmpty);
    if (emptyPartLetters.length > 0) {
      console.warn(`[mark:sectionAnalytics] ⚠️ Found ${emptyPartLetters.length} questions with empty/null partLetter (will become "Section"):`, 
        emptyPartLetters.map(q => ({
          questionNumber: q.questionNumber,
          partName: q.partName
        }))
      );
    }
    
    // Find all questions with "SECTION" partLetter
    const sectionQuestions = (qs || []).filter((q, idx) => {
      const partUpper = (q.partLetter || '').toUpperCase();
      return partUpper === 'SECTION' || partUpper.startsWith('SECTION ');
    });
    
    if (sectionQuestions.length > 0) {
      console.error(`[mark:sectionAnalytics] ⚠️⚠️⚠️ FOUND ${sectionQuestions.length} QUESTIONS WITH "SECTION" PARTLETTER:`, 
        sectionQuestions.map(q => ({
          questionNumber: q.questionNumber,
          partLetter: q.partLetter,
          partName: q.partName,
          examType: q.examType,
          id: q.id
        }))
      );
    }
    
    // Track questions with invalid parts
    const invalidParts: Array<{ index: number; questionNumber: number; partLetter: string; partName: string }> = [];
    
    if (!qs || qs.length === 0) {
      console.warn('[mark:sectionAnalytics] No questions available');
      return analytics;
    }
    
    for (let i = 0; i < qs.length; i++) {
      const question = qs[i];
      if (!question) {
        console.warn(`[mark:sectionAnalytics] Question ${i} is undefined`);
        continue;
      }
      
      let part = (question.partLetter || "").trim();
      const partName = (question.partName || "").trim();
      
      // If partLetter is empty, try to derive it from partName
      if (!part || part === '—' || part === '') {
        if (partName) {
          const partNameLower = partName.toLowerCase();
          if (isNSAA2019) {
            if (partNameLower.includes('advanced mathematics') && partNameLower.includes('advanced physics')) {
              part = 'Part E';
            } else if (partNameLower.includes('mathematics') && !partNameLower.includes('advanced')) {
              part = 'Part A';
            } else if (partNameLower.includes('physics') && !partNameLower.includes('advanced')) {
              part = 'Part B';
            } else if (partNameLower.includes('chemistry')) {
              // Part C - should be filtered out for NSAA 2019
              console.warn(`[mark:sectionAnalytics] Question ${question.questionNumber} has empty partLetter but partName="Chemistry" - should be filtered`, {
                questionNumber: question.questionNumber,
                partName: partName
              });
              invalidParts.push({ index: i, questionNumber: question.questionNumber, partLetter: part || 'empty', partName: partName });
              continue;
            } else if (partNameLower.includes('biology')) {
              // Part D - should be filtered out for NSAA 2019
              console.warn(`[mark:sectionAnalytics] Question ${question.questionNumber} has empty partLetter but partName="Biology" - should be filtered`, {
                questionNumber: question.questionNumber,
                partName: partName
              });
              invalidParts.push({ index: i, questionNumber: question.questionNumber, partLetter: part || 'empty', partName: partName });
              continue;
            }
          }
        }
        
        // If still empty after derivation attempt, log it
        if (!part || part === '—' || part === '') {
          console.warn(`[mark:sectionAnalytics] Question ${question.questionNumber} has empty partLetter and couldn't derive from partName="${partName}"`, {
            questionNumber: question.questionNumber,
            partName: partName
          });
          // For NSAA 2019, skip questions we can't categorize
          if (isNSAA2019) {
            invalidParts.push({ index: i, questionNumber: question.questionNumber, partLetter: 'empty', partName: partName });
            continue;
          }
        }
      }
      
      const partUpper = part.toUpperCase();
      
      // CRITICAL: Filter out "SECTION" parts - they're invalid
      if (partUpper === 'SECTION' || partUpper.startsWith('SECTION ')) {
        console.error(`[mark:sectionAnalytics] ⚠️ INVALID PART DETECTED: Question ${question.questionNumber} has partLetter="${part}"`, {
          questionNumber: question.questionNumber,
          partLetter: part,
          partName: partName,
          examName: question.examName,
          examYear: question.examYear,
          examType: question.examType
        });
        invalidParts.push({ index: i, questionNumber: question.questionNumber, partLetter: part, partName: partName });
        // Skip this question - don't add it to analytics
        continue;
      }
      
      // For NSAA 2019, only allow Part A, B, E
      if (isNSAA2019) {
        const validParts = ['PART A', 'PART B', 'PART E', 'A', 'B', 'E'];
        const isValid = validParts.some(valid => {
          if (partUpper === valid) return true;
          if (partUpper === `PART ${valid}`) return true;
          if (partUpper.includes(valid) && !partUpper.includes('SECTION')) {
            // Make sure it's not Part C or D
            if (valid === 'A' && (partUpper.includes('PART C') || partUpper.includes('PART D'))) return false;
            if (valid === 'B' && (partUpper.includes('PART C') || partUpper.includes('PART D'))) return false;
            return true;
          }
          return false;
        });
        
        // Also check partName for Part E
        const isPartE = partName.toLowerCase().includes('advanced mathematics') && 
                       partName.toLowerCase().includes('advanced physics');
        
        if (!isValid && !isPartE) {
          console.error(`[mark:sectionAnalytics] ⚠️ NSAA 2019 INVALID PART: Question ${question.questionNumber} has partLetter="${part}", partName="${partName}"`, {
            questionNumber: question.questionNumber,
            partLetter: part,
            partName: partName
          });
          invalidParts.push({ index: i, questionNumber: question.questionNumber, partLetter: part, partName: partName });
          continue; // Skip this question
        }
      }
      
      // Use partLetter as key (should already be set from derivation above)
      let key = part;
      
      // If key is still empty after derivation, log and skip for NSAA 2019
      if (!key || key === '—' || key === '') {
        if (isNSAA2019) {
          console.error(`[mark:sectionAnalytics] ⚠️ Cannot determine part for question ${question.questionNumber} - skipping`, {
            questionNumber: question.questionNumber,
            partName: partName,
            originalPartLetter: question.partLetter
          });
          invalidParts.push({ index: i, questionNumber: question.questionNumber, partLetter: 'empty', partName: partName });
          continue; // Skip this question for NSAA 2019
        }
        // For other papers, use "Section" as fallback
        key = "Section";
      }
      
      if (!analytics[key]) {
        analytics[key] = { correct: 0, total: 0, avgTime: 0, totalTime: 0, guessed: 0 };
      }
      analytics[key].total++;
      if (derivedCorrectFlags[i] === true) analytics[key].correct++;
      if (guessedFlags[i]) analytics[key].guessed++;
      analytics[key].totalTime += perQuestionSec[i] || 0;
    }
    
    if (invalidParts.length > 0) {
      console.error(`[mark:sectionAnalytics] ⚠️ Found ${invalidParts.length} questions with invalid parts:`, invalidParts);
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
  // Cache to avoid duplicate logs
  const resolveCache = useRef<Map<string, { name: string; matched: boolean }>>(new Map());
  const resolveConversionPartName = useCallback((examName: string, partLetterRaw: string, partName: string | undefined, rows: any[]): { name: string; matched: boolean } => {
    const cacheKey = `${examName}:${partLetterRaw}:${partName || ''}`;
    if (resolveCache.current.has(cacheKey)) {
      return resolveCache.current.get(cacheKey)!;
    }
    
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
    if (examName === 'NSAA') {
      // NSAA Section 1 typically uses Part A, B, C, D, E
      // Part A = Mathematics, Part B = Physics, Part C = Chemistry, Part D = Biology, Part E = Advanced Mathematics and Advanced Physics
      if (letter === 'A' || letter === '1') candidateNames.push('Part A');
      if (letter === 'B' || letter === '2') candidateNames.push('Part B');
      if (letter === 'C' || letter === '3') candidateNames.push('Part C');
      if (letter === 'D' || letter === '4') candidateNames.push('Part D');
      if (letter === 'E' || letter === '5') candidateNames.push('Part E');
      // Also check if partName contains section names
      if (partName) {
        const partLower = partName.toLowerCase();
        if (partLower.includes('math') && !partLower.includes('advanced')) candidateNames.push('Part A');
        if (partLower.includes('phys') && !partLower.includes('advanced')) candidateNames.push('Part B');
        if (partLower.includes('chem')) candidateNames.push('Part C');
        if (partLower.includes('biol')) candidateNames.push('Part D');
        if (partLower.includes('advanced')) candidateNames.push('Part E');
      }
    }
    // Generic patterns commonly used in tables
    if (letter) candidateNames.push(`Part ${letter}`);
    if (raw) candidateNames.push(raw); // e.g., 'PART A' or 'Part A'
    if (partName) candidateNames.push(partName);

    const rowsLower = rows.map((r: any) => (r.partName || '').toString().toLowerCase());
    const match = candidateNames.find(n => rowsLower.includes(n.toLowerCase()));
    const result = match ? { name: match, matched: true } : { name: candidateNames[0] || (partName || letter || 'Section'), matched: false };
    
    // Cache the result
    resolveCache.current.set(cacheKey, result);
    return result;
  }, []);

  // Get exam name for determining scoring method
  const examName = useMemo(() => {
    const qs = usePaperSessionStore.getState().questions;
    return (qs?.[0]?.examName || '').toUpperCase();
  }, []);

  // Predicted overall score (weighted by section totals) - exam-specific
  const predictedScore = useMemo(() => {
    if (!hasConversion || (conversionRows as any[])?.length === 0) return null;
    const entries = Object.entries(sectionAnalytics) as Array<[string, {
      correct: number;
      total: number;
      avgTime: number;
      totalTime: number;
      guessed: number;
    }]>;
    if (entries.length === 0) return null;
    const qs = usePaperSessionStore.getState().questions;
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (const [section, data] of entries) {
      // CRITICAL: Skip "SECTION" entries - they're invalid
      const sectionUpper = section.toUpperCase();
      if (sectionUpper === 'SECTION' || sectionUpper.startsWith('SECTION ')) {
        console.error(`[mark:predictedScore] ⚠️ Skipping invalid "SECTION" entry:`, { section, data });
        continue;
      }
      
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
  }, [hasConversion, conversionRows, sectionAnalytics, examName, resolveConversionPartName]);

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
          if (sectionUpper === 'SECTION' || sectionUpper.startsWith('SECTION ')) {
            console.error(`[mark:percentiles] ⚠️ Skipping invalid "SECTION" entry in percentile calculation:`, { section, data });
            continue;
          }
          
          const match = qs.find(q => (q.partLetter || '').trim() === section);
          const partLetterRaw = (match?.partLetter || section).toString().toUpperCase();
          
          const resolved = resolveConversionPartName(examName, partLetterRaw, match?.partName, conversionRows as any[]);
          const convPartName = resolved.name;
          const scaled = hasConversion ? scaleScore(conversionRows as any, convPartName as any, data.correct, 'nearest') : null;
          const score = typeof scaled === 'number' ? Math.round((scaled as number) * 10) / 10 : null;
          let { key: tableKey, label } = mapSectionToTable({ examName, sectionLetter: partLetterRaw, sectionName: match?.partName });
          
          // For TMUA, determine which table to use based on year
          if (isTMUA && tableKey === 'tmua_paper') {
            if (examYear && examYear <= 2023) {
              tableKey = 'tmua_pre_change_cumulative_2023';
            } else if (examYear && examYear >= 2024) {
              tableKey = 'tmua_post_change_cumulative_2024_2025';
            } else {
              // Default to new table if year unknown
              tableKey = 'tmua_post_change_cumulative_2024_2025';
            }
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
          if (!info.score) {
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
        } else {
          setNsaaAveragedPercentile(null);
        }
        
        setSectionPercentiles(out);
        setPercentileTables(keyToRows as any);
      } catch (e) {
        // fail-soft
        console.error('[mark] Error calculating section percentiles', e);
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
  
  // Handle resume session
  const handleResumeSession = async (sessionToResume: PaperSession) => {
    try {
      await loadSessionFromDatabase(sessionToResume.id);
      // After loading, navigate to solve page if session is paused, otherwise stay on mark page
      const state = usePaperSessionStore.getState();
      if (state.isPaused) {
        router.push("/papers/solve/resume");
      }
      // If not paused, we're already on mark page which is correct
    } catch (error) {
      console.error("[mark] Failed to resume session:", error);
      alert("Failed to resume session. Please try again.");
    }
  };

  // Show resume option if no session but in-progress sessions exist
  if (!sessionId) {
    if (checkingInProgress) {
      return (
        <Container>
          <PageHeader title="Mark Paper" />
          <div className="py-12 text-center text-white/50">Checking for papers in progress...</div>
        </Container>
      );
    }

    if (inProgressSessions.length > 0) {
      const sessionToResume = inProgressSessions[0];
      const formatDate = (date: string | number | undefined) => {
        if (!date) return "Unknown date";
        try {
          const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
          return dateObj.toLocaleString();
        } catch {
          return "Unknown date";
        }
      };

      return (
        <Container>
          <PageHeader title="Mark Paper" />
          <div className="py-12 max-w-2xl mx-auto">
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Resume Paper Session</h2>
              <p className="text-white/70 mb-6">
                You have a paper session in progress. Would you like to resume it?
              </p>
              
              <div className="space-y-4 mb-6">
                {inProgressSessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-4 rounded-lg border border-white/10 bg-white/5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-white mb-1">
                          {session.paperName} {session.paperVariant}
                        </div>
                        <div className="text-sm text-white/60">
                          Started: {formatDate(session.startedAt)}
                        </div>
                        {session.selectedSections && session.selectedSections.length > 0 && (
                          <div className="text-sm text-white/60 mt-1">
                            Sections: {session.selectedSections.join(", ")}
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={() => handleResumeSession(session)}
                        className="ml-4"
                      >
                        Resume
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => router.push("/papers/library")}
                >
                  Go to Library
                </Button>
              </div>
            </Card>
          </div>
        </Container>
      );
    }

    // No in-progress sessions, redirect to library
    router.push("/papers/library");
    return null;
  }

  return (
    <Fragment>
      {/* Page Title - above nav bar and top div */}
      <div className="w-full bg-neutral-900 border-b border-white/10">
        <Container size="xl" className="py-6">
          <div className="space-y-2">
            <div className="text-2xl font-semibold text-neutral-100">Mistake Analysis & Drill Setup</div>
            <div className="text-sm text-neutral-300">Click a question number to open it on the right. Tag the mistake. All wrong answers are automatically added to your drill pool.</div>
          </div>
        </Container>
      </div>
      <Container size="xl" className="h-[calc(100vh-4rem)] space-y-6">
        {/* Main two-column layout - fills available space */}
        <Card className="p-0 bg-neutral-900 border-0 overflow-hidden h-full">
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
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-90 transition-transform duration-200 -rotate-90 group-open:rotate-0">
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
            </div>
          </div>
          </div>
                        </summary>
                        <div className="mt-1 space-y-1 px-0.5 pb-1 bg-[#0f1114] rounded-md group-open:rounded-b-md group-open:rounded-t-none transition-all duration-200 question-list">
                        {group.indexes.map((index, qi) => {
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
                          // Always use the parent part's color for the indicator
                          const indicatorColor = getSectionColor(sectionName);
              return (
                            <button
                              key={qNumber}
                              className={`relative w-full text-left pr-3 pl-0 py-2 rounded-md overflow-hidden transition ${
                                selectedIndex === index ? "bg-[#161a1f]" : "bg-[#0f1114] hover:bg-[#121418]"
                              }`}
                              style={{
                                animationDelay: `${qi * 20}ms`,
                                animationFillMode: 'both',
                                ...(selectedIndex === index ? { boxShadow: `inset 4px 0 0 0 ${indicatorColor}` } : {})
                              }}
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
                                    <div className="px-2 py-0.5 rounded-full text-white text-[11px]" style={{ backgroundColor: '#c99d6a' }}>
                                      Guess
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-[11px] text-neutral-500">{formatTime(timeSpent)}</div>
                                  {correct === true && (
                                    <div className="px-1.5 py-0.5 rounded-full text-white flex items-center justify-center" style={{ backgroundColor: "#6c9e69" }}>
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
            <div className="p-4 pt-6 h-full overflow-y-auto rounded-2xl" style={{ scrollbarGutter: 'stable' }}>
              {selectedIndex === -1 ? (
                <div className="space-y-6 pb-8">
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
                      <div className={`${bubbleClass} flex flex-col items-center justify-center min-h-[96px] relative`}>
                        {/* Info button */}
                        {(examName === 'ENGAA' || examName === 'NSAA') && (
                          <button
                            onClick={() => setShowConversionPopup(!showConversionPopup)}
                            className="absolute top-2 right-2 w-5 h-5 rounded-full bg-neutral-700 hover:bg-neutral-600 flex items-center justify-center transition-colors"
                            title="View conversion table"
                          >
                            <svg className="w-3 h-3 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}
                        <div className="text-4xl font-bold text-neutral-100 leading-tight">{predictedScore !== null && predictedScore !== undefined ? predictedScore.toFixed(1) : '—'}</div>
                        <div className="text-xs text-neutral-400 flex items-center gap-1">
                          Predicted {(examName === 'ENGAA' || examName === 'NSAA') ? 'ESAT' : (examName || 'score')}
                        </div>
                        {/* Conversion table popup */}
                        {showConversionPopup && (examName === 'ENGAA' || examName === 'NSAA') && (
                          <div
                            ref={conversionPopupRef}
                            className="absolute top-full right-0 mt-2 w-80 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-50 p-4"
                            style={{ maxHeight: '400px', overflowY: 'auto' }}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="text-sm font-semibold text-neutral-100">Conversion Table</div>
                              <button
                                onClick={() => setShowConversionPopup(false)}
                                className="text-neutral-400 hover:text-neutral-200"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                            <div className="space-y-3">
                              {(() => {
                                const qs = usePaperSessionStore.getState().questions;
                                const sections = Object.entries(sectionAnalytics);
                                
                                if (sections.length === 0) {
                                  return <div className="text-xs text-neutral-400">No sections found</div>;
                                }
                                
                                return sections
                                  .filter(([section]) => {
                                    // Filter out "SECTION" entries
                                    const sectionUpper = section.toUpperCase();
                                    const isValid = sectionUpper !== 'SECTION' && !sectionUpper.startsWith('SECTION ');
                                    if (!isValid) {
                                      console.error(`[mark:UI:percentiles] Filtering out invalid "SECTION" entry:`, section);
                                    }
                                    return isValid;
                                  })
                                  .map(([section, data]) => {
                                  const match = qs.find(q => (q.partLetter || '').trim() === section);
                                  const partLetterRaw = (match?.partLetter || section).toString().toUpperCase();
                                  
                                  const resolved = resolveConversionPartName(examName, partLetterRaw, match?.partName, conversionRows as any[]);
                                  const convPartName = resolved.name;
                                  const partRows = (conversionRows as any[]).filter((r: any) => 
                                    (r.partName || '').toString().toLowerCase() === convPartName.toLowerCase()
                                  );
                                  
                                  const hasConversion = partRows.length > 0;
                                  const sectionName = mapPartToSection(
                                    { partLetter: partLetterRaw, partName: match?.partName || '' },
                                    examName as any
                                  );
                                  
                                  if (partRows.length > 0) {
                                    const sortedRows = [...partRows].sort((a, b) => a.rawScore - b.rawScore);
                                    const minRaw = sortedRows[0].rawScore;
                                    const maxRaw = sortedRows[sortedRows.length - 1].rawScore;
                                    const minScaled = sortedRows[0].scaledScore;
                                    const maxScaled = sortedRows[sortedRows.length - 1].scaledScore;
                                    
                                    return (
                                      <div key={section} className="border-b border-neutral-700 pb-2 last:border-0 last:pb-0">
                                        <div className="flex items-center justify-between mb-1">
                                          <div className="text-xs font-medium text-neutral-200">{sectionName}</div>
                                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/30 text-green-300">
                                            Found
                                          </span>
                                        </div>
                                        <div className="text-[10px] text-neutral-400 space-y-0.5">
                                          <div>Raw: {minRaw === maxRaw ? minRaw : `${minRaw} - ${maxRaw}`}</div>
                                          <div>ESAT: {minScaled === maxScaled ? minScaled.toFixed(1) : `${minScaled.toFixed(1)} - ${maxScaled.toFixed(1)}`}</div>
                                        </div>
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <div key={section} className="border-b border-neutral-700 pb-2 last:border-0 last:pb-0">
                                        <div className="flex items-center justify-between mb-1">
                                          <div className="text-xs font-medium text-neutral-200">{sectionName}</div>
                                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-700 text-neutral-400">
                                            Not Found
                                          </span>
                                        </div>
                                        <div className="text-[10px] text-neutral-400">
                                          No conversion data available
                                        </div>
                                      </div>
                                    );
                                  }
                                });
                              })()}
                            </div>
                          </div>
                        )}
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
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-base font-semibold text-neutral-100">Pacing Profile</div>
                        <div className="text-sm text-neutral-400">(time per question)</div>
                      </div>
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
                      <div className={`${bubbleClass} space-y-3 md:col-start-1 md:row-start-1`}>
                      <div className="text-base font-semibold text-neutral-100">Time Management</div>

                      {/* KPI Row */}
                      {(() => {
                        const times = perQuestionSec.filter(t => t > 0);
                        const sortedTimes = [...times].sort((a, b) => a - b);
                        const median = sortedTimes.length > 0 
                          ? sortedTimes[Math.floor(sortedTimes.length / 2)]
                          : 0;
                        const longest = sortedTimes.length > 0 
                          ? sortedTimes[sortedTimes.length - 1]
                          : 0;
                        const shortest = sortedTimes.length > 0 
                          ? sortedTimes[0]
                          : 0;
                        
                        return (
                          <div className="grid grid-cols-3 gap-3">
                            <div className="rounded-xl bg-[#1a1f27] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_20px_rgba(0,0,0,0.25)] p-4 flex flex-col items-center justify-center min-h-[96px]">
                              <div className="text-xs text-neutral-400">Median time</div>
                              <div className="text-lg font-semibold text-neutral-200 leading-tight">{formatTime(Math.round(median))}</div>
                            </div>
                            <div className="rounded-xl bg-[#1a1f27] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_20px_rgba(0,0,0,0.25)] p-4 flex flex-col items-center justify-center min-h-[96px]">
                              <div className="text-xs text-neutral-400">Longest time</div>
                              <div className="text-lg font-semibold text-neutral-200 leading-tight">{formatTime(Math.round(longest))}</div>
                            </div>
                            <div className="rounded-xl bg-[#1a1f27] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_20px_rgba(0,0,0,0.25)] p-4 flex flex-col items-center justify-center min-h-[96px]">
                              <div className="text-xs text-neutral-400">Shortest time</div>
                              <div className="text-lg font-semibold text-neutral-200 leading-tight">{formatTime(Math.round(shortest))}</div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Time Used Split */}
                      <div className="p-3 rounded-md bg-neutral-900">
                        <div className="text-xs text-neutral-400 mb-2">Time Allocation</div>
                        <div className="w-full h-2 bg-neutral-700 rounded-full overflow-hidden">
                          {(() => {
                            const total = Math.max(1, timeSplits.totalTime);
                            const correctPct = Math.min(100, Math.round((timeSplits.correctTime / total) * 100));
                            const wrongPct = Math.max(0, 100 - correctPct);
                            return (
                              <div className="flex w-full h-full">
                                <div style={{ width: `${correctPct}%`, backgroundColor: "#6c9e69" }} />
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

                      <div className="p-3 rounded-md bg-neutral-900">
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

                            const accStroke = 'rgba(163,163,163,0.8)'; // neutral-400
                            const speedStroke = 'rgba(115,115,115,0.8)'; // neutral-500

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

                      {/* (Removed) Time & Accuracy Split to reduce confusion; moved to Guessing Behavior */}
                    </div>

                    {/* Section Performance & Score Conversion (moved up next to Time Management) */}
                    <div className={`${bubbleClass} space-y-4 md:col-start-2 md:row-start-1`}>
                      {(() => {
                        const qs = usePaperSessionStore.getState().questions;
                        const currentExamName = (qs?.[0]?.examName || '').toUpperCase();
                        const sectionTitle = currentExamName === 'TMUA' 
                          ? 'TMUA Score by Section'
                          : (currentExamName === 'ENGAA' || currentExamName === 'NSAA')
                          ? 'ESAT Score by Section'
                          : 'Section Performance';
                        return <div className="text-base font-semibold text-neutral-100">{sectionTitle}</div>;
                      })()}
                      <div className="space-y-3">
                        {Object.entries(sectionAnalytics)
                          .filter(([section]) => {
                            // Filter out "SECTION" entries
                            const sectionUpper = section.toUpperCase();
                            const isValid = sectionUpper !== 'SECTION' && !sectionUpper.startsWith('SECTION ');
                            if (!isValid) {
                              console.error(`[mark:UI:sectionPerformance] Filtering out invalid "SECTION" entry:`, section);
                            }
                            return isValid;
                          })
                          .map(([section, data]) => {
                          const accuracy = data.total > 0 ? (data.correct / data.total) * 100 : 0;
                          let scaledScore: number | null = null;
                          const qs = usePaperSessionStore.getState().questions;
                          const currentExamName = (qs?.[0]?.examName || '').toUpperCase();
                          const isESATorTMUA = currentExamName === 'TMUA' || currentExamName === 'ENGAA' || currentExamName === 'NSAA';
                          
                          if (hasConversion && conversionRows.length > 0) {
                          const match = qs.find(q => (q.partLetter || '').trim() === section);
                          const sectionExamName = (qs?.[0]?.examName || '').toUpperCase();
                          const partLetterRaw = (match?.partLetter || section).toString().toUpperCase();
                          
                          const resolved = resolveConversionPartName(sectionExamName, partLetterRaw, match?.partName, conversionRows as any[]);
                          const convPartName = resolved.name;
                          const scaled = scaleScore(conversionRows as any, convPartName as any, data.correct, 'nearest');
                            scaledScore = typeof scaled === 'number' ? Math.round((scaled as number) * 10) / 10 : null;
                            (data as any).__convPartName = convPartName;
                          (data as any).__convRowsFound = (conversionRows as any[]).some(r => (r.partName || '').toString().toLowerCase() === convPartName.toLowerCase());
                          }
                          const qsForPill = usePaperSessionStore.getState().questions;
                          const matchForPill = qsForPill.find(q => (q.partLetter || '').trim() === section);
                          const sectionNameForColor = mapPartToSection({ partLetter: (matchForPill?.partLetter || section).toString(), partName: matchForPill?.partName || '' }, (usePaperSessionStore.getState().questions?.[0]?.examName as any));
                          
                          // Calculate bar percentage: for ESAT/TMUA, show score out of 9; otherwise show accuracy
                          const barPercentage = isESATorTMUA && scaledScore !== null && scaledScore !== undefined
                            ? Math.min(100, Math.max(0, (scaledScore / 9) * 100))
                            : accuracy;
                          const barLabel = isESATorTMUA && scaledScore !== null && scaledScore !== undefined
                            ? `${Math.round(barPercentage)}%`
                            : `${Math.round(accuracy)}%`;
                          
                          return (
                            <div key={section} className="p-3 rounded-md bg-neutral-900">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-semibold text-neutral-200">
                                      {section}
                                    </span>
                                    {sectionNameForColor && (
                                      <span className="text-xs px-2.5 py-1 rounded-md text-white font-medium" style={{ backgroundColor: getSectionColor(sectionNameForColor) }}>
                                        {sectionNameForColor}
                                      </span>
                                    )}
                                    <span className="text-xs px-2.5 py-1 rounded-md text-neutral-200 font-medium bg-neutral-800">
                                      {data.correct}/{data.total} raw
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  {isESATorTMUA && (
                                    <div className="text-xs text-neutral-400 mb-1">
                                      {currentExamName === 'TMUA' ? 'TMUA' : 'ESAT'}
                                    </div>
                                  )}
                                  <div className="text-xl font-semibold text-neutral-100">{scaledScore !== null && scaledScore !== undefined ? scaledScore.toFixed(1) : '—'}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="flex-1 h-2 bg-neutral-700 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${barPercentage}%`, backgroundColor: getSectionColor(sectionNameForColor) }} />
                                </div>
                                <div className="text-xs font-semibold text-neutral-300">{barLabel}</div>
                              </div>
                              <div className="flex items-center justify-between text-xs text-neutral-400 min-h-[16px]">
                                <span></span>
                                {data.guessed > 0 && <span>{data.guessed} guessed</span>}
                              </div>
                              {/* per-section conversion rows removed; shown globally above */}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  

                  {/* Section Percentiles - for all exams */}
                  <div className={`${bubbleClass} space-y-3 md:col-span-2`}>
                    <div className="flex items-center justify-between">
                      <div className="text-base font-semibold text-neutral-100">Section Percentiles</div>
                      {/* NSAA Toggle: Show individual subjects vs averaged */}
                      {examName === 'NSAA' && Object.entries(sectionAnalytics).length > 1 && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <span className="text-xs text-neutral-400">Show individual subjects</span>
                          <div className="relative inline-block w-11 h-6">
                            <input
                              type="checkbox"
                              checked={showIndividualNSAASubjects}
                              onChange={(e) => setShowIndividualNSAASubjects(e.target.checked)}
                              className="sr-only"
                            />
                            <div className={`block w-11 h-6 rounded-full transition-colors ${showIndividualNSAASubjects ? 'bg-[#6c9e69]' : 'bg-neutral-700'}`}>
                              <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showIndividualNSAASubjects ? 'translate-x-5' : ''}`}></div>
                            </div>
                          </div>
                        </label>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* NSAA Averaged View (when toggle is off) - spans full width */}
                      {examName === 'NSAA' && !showIndividualNSAASubjects && nsaaAveragedPercentile !== null && (
                        <div className="p-3 rounded-md bg-neutral-900 md:col-span-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2.5 py-1 rounded-md text-white font-medium bg-neutral-700">
                                  Average (All Subjects)
                                </span>
                              </div>
                              <div className="text-xs text-neutral-400 mt-1">
                                Averaged across {Object.entries(sectionAnalytics).length} subject{Object.entries(sectionAnalytics).length > 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 text-2xl font-bold text-neutral-100 text-center">
                            TOP {(Math.max(0, 100 - nsaaAveragedPercentile)).toFixed(1)}%
                          </div>
                          
                          {/* Averaged percentile graph - full width */}
                          {(() => {
                            // Use the first available percentile table as a reference for the graph
                            const firstSection = Object.keys(sectionAnalytics)[0];
                            const firstSp = sectionPercentiles[firstSection];
                            const tableKey = firstSp?.table;
                            const rows = tableKey ? percentileTables[tableKey] : null;
                            
                            if (!rows || rows.length < 2) return null;
                            
                            // Convert cumulative to distribution
                            const distributionData: { score: number; distPct: number; midScore: number }[] = [];
                            for (let i = 0; i < rows.length - 1; i++) {
                              const distPct = rows[i + 1].cumulativePct - rows[i].cumulativePct;
                              const midScore = (rows[i].score + rows[i + 1].score) / 2;
                              distributionData.push({
                                score: rows[i].score,
                                distPct: distPct,
                                midScore: midScore
                              });
                            }
                            
                            const w = 800; const h = 175; const pad = 24;
                            const xs = rows.map(r => r.score);
                            const distPcts = distributionData.map(d => d.distPct);
                            const minX = Math.min(...xs), maxX = Math.max(...xs);
                            const minY = 0, maxY = Math.max(...distPcts, 1);
                            const toX = (x: number) => pad + ((x - minX) / Math.max(1e-9, (maxX - minX))) * (w - 2*pad);
                            const toY = (y: number) => h - pad - ((y - minY) / Math.max(1e-9, (maxY - minY))) * (h - 2*pad);
                            
                            // Build distribution curve points - through middle of bars, curved
                            const points: { x: number; y: number }[] = [];
                            distributionData.forEach((d, i) => {
                              const midX = toX(d.midScore);
                              const y = toY(d.distPct);
                              points.push({ x: midX, y });
                            });
                            
                            // Build smooth curved path using cubic bezier curves
                            let pathD = '';
                            if (points.length > 0) {
                              pathD = `M ${points[0].x},${points[0].y}`;
                              for (let i = 1; i < points.length; i++) {
                                const prev = points[i - 1];
                                const curr = points[i];
                                const next = points[i + 1] || curr;
                                // Calculate control points for smooth cubic bezier curve
                                const dx1 = (curr.x - prev.x) * 0.3;
                                const dy1 = (curr.y - prev.y) * 0.3;
                                const dx2 = (next.x - curr.x) * 0.3;
                                const dy2 = (next.y - curr.y) * 0.3;
                                const cp1x = prev.x + dx1;
                                const cp1y = prev.y + dy1;
                                const cp2x = curr.x - dx2;
                                const cp2y = curr.y - dy2;
                                pathD += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${curr.y}`;
                              }
                            }
                            
                            // Find averaged percentile position in distribution
                            let avgPercentileScore = minX + (maxX - minX) / 2;
                            for (let i = 0; i < rows.length - 1; i++) {
                              if (nsaaAveragedPercentile >= rows[i].cumulativePct && nsaaAveragedPercentile <= rows[i + 1].cumulativePct) {
                                const ratio = (nsaaAveragedPercentile - rows[i].cumulativePct) / (rows[i + 1].cumulativePct - rows[i].cumulativePct);
                                avgPercentileScore = rows[i].score + (rows[i + 1].score - rows[i].score) * ratio;
                                break;
                              }
                            }
                            // Find which bar the percentile falls in
                            let percentileX = toX(avgPercentileScore);
                            let percentileY = h - pad;
                            let percentileBarIndex = -1;
                            for (let i = 0; i < distributionData.length; i++) {
                              if (avgPercentileScore >= rows[i].score && avgPercentileScore < rows[i + 1].score) {
                                percentileBarIndex = i;
                                // Calculate Y position on the curve at user's exact X
                                const barStart = rows[i].score;
                                const barEnd = rows[i + 1].score;
                                const ratio = (avgPercentileScore - barStart) / (barEnd - barStart);
                                const prevPoint = i > 0 ? points[i - 1] : points[0];
                                const currPoint = points[i];
                                percentileY = prevPoint.y + (currPoint.y - prevPoint.y) * ratio;
                                break;
                              }
                            }
                            
                            // Build filled area path up to user's position
                            let filledPathD = '';
                            if (points.length > 0 && percentileBarIndex >= 0) {
                              // Start at baseline
                              filledPathD = `M ${points[0].x},${h - pad}`;
                              // Follow the curve up to the user's position
                              for (let i = 0; i < percentileBarIndex; i++) {
                                if (i === 0) {
                                  filledPathD += ` L ${points[i].x},${points[i].y}`;
                                } else {
                                  const prev = points[i - 1];
                                  const curr = points[i];
                                  const next = points[i + 1] || curr;
                                  const dx1 = (curr.x - prev.x) * 0.3;
                                  const dy1 = (curr.y - prev.y) * 0.3;
                                  const dx2 = (next.x - curr.x) * 0.3;
                                  const dy2 = (next.y - curr.y) * 0.3;
                                  const cp1x = prev.x + dx1;
                                  const cp1y = prev.y + dy1;
                                  const cp2x = curr.x - dx2;
                                  const cp2y = curr.y - dy2;
                                  filledPathD += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${curr.y}`;
                                }
                              }
                              // Add the point at user's exact position
                              // Interpolate Y on the curve at user's X position
                              const userActualX = toX(avgPercentileScore);
                              const barStart = rows[percentileBarIndex].score;
                              const barEnd = rows[percentileBarIndex + 1].score;
                              const ratio = (avgPercentileScore - barStart) / (barEnd - barStart);
                              const prevPoint = percentileBarIndex > 0 ? points[percentileBarIndex - 1] : points[0];
                              const currPoint = points[percentileBarIndex];
                              const nextPoint = points[percentileBarIndex + 1] || currPoint;
                              // Linear interpolation for Y at user's X
                              const userY = prevPoint.y + (currPoint.y - prevPoint.y) * ratio;
                              filledPathD += ` L ${userActualX},${userY}`;
                              // Close the path back to baseline
                              filledPathD += ` L ${userActualX},${h - pad} Z`;
                            }
                            
                            // Build distribution bars
                            const bars: { x: number; width: number; height: number; y: number }[] = [];
                            distributionData.forEach((d, i) => {
                              const x1 = toX(rows[i].score);
                              const x2 = toX(rows[i + 1].score);
                              const barWidth = x2 - x1;
                              const barHeight = h - pad - toY(d.distPct);
                              bars.push({
                                x: x1,
                                width: barWidth,
                                height: barHeight,
                                y: toY(d.distPct)
                              });
                            });
                            
                            // Ticks
                            const xTicks = [] as number[];
                            for (let s = Math.ceil(minX); s <= Math.floor(maxX); s += 1) xTicks.push(s);
                            const maxDistTick = Math.ceil(maxY);
                            const yTicks = [0, maxDistTick * 0.25, maxDistTick * 0.5, maxDistTick * 0.75, maxDistTick].map(t => Math.round(t * 10) / 10);
                            
                            return (
                              <div className="mt-3 w-full mx-auto">
                                <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" className="block">
                                  {/* Axes */}
                                  <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#2a2d34" />
                                  <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#2a2d34" />
                                  {/* Filled area under curve up to user's position */}
                                  {filledPathD && (
                                    <path d={filledPathD} fill="rgba(108, 158, 105, 0.2)" stroke="none" />
                                  )}
                                  {/* Distribution bars - split if user is in the middle */}
                                  {bars.map((bar, i) => {
                                    const isAvgBar = avgPercentileScore >= rows[i].score && avgPercentileScore < rows[i + 1].score;
                                    const barStart = rows[i].score;
                                    const barEnd = rows[i + 1].score;
                                    const userInBar = avgPercentileScore >= barStart && avgPercentileScore < barEnd;
                                    
                                    if (userInBar && avgPercentileScore > barStart && avgPercentileScore < barEnd) {
                                      // Split the bar at user's position
                                      const splitX = toX(avgPercentileScore);
                                      const leftWidth = splitX - bar.x;
                                      const rightWidth = bar.width - leftWidth;
                                      return (
                                        <g key={i}>
                                          <rect
                                            x={bar.x}
                                            y={bar.y}
                                            width={leftWidth}
                                            height={bar.height}
                                            fill="rgba(108, 158, 105, 0.3)"
                                            stroke="rgba(108, 158, 105, 0.6)"
                                            strokeWidth={1.5}
                                          />
                                          <rect
                                            x={splitX}
                                            y={bar.y}
                                            width={rightWidth}
                                            height={bar.height}
                                            fill="rgba(122, 127, 135, 0.2)"
                                            stroke="rgba(122, 127, 135, 0.4)"
                                            strokeWidth={0.5}
                                          />
                                        </g>
                                      );
                                    }
                                    return (
                                      <rect
                                        key={i}
                                        x={bar.x}
                                        y={bar.y}
                                        width={bar.width}
                                        height={bar.height}
                                        fill={isAvgBar ? "rgba(108, 158, 105, 0.3)" : (i < percentileBarIndex ? "rgba(108, 158, 105, 0.3)" : "rgba(122, 127, 135, 0.2)")}
                                        stroke={isAvgBar ? "rgba(108, 158, 105, 0.6)" : (i < percentileBarIndex ? "rgba(108, 158, 105, 0.6)" : "rgba(122, 127, 135, 0.4)")}
                                        strokeWidth={isAvgBar ? 1.5 : (i < percentileBarIndex ? 1.5 : 0.5)}
                                      />
                                    );
                                  })}
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
                                      <text x={pad - 6} y={toY(t) + 3} fill="#7a7f87" fontSize="9" textAnchor="end">{t.toFixed(1)}</text>
                                    </g>
                                  ))}
                                  {/* Distribution curve */}
                                  <path d={pathD} fill="none" stroke="#7a7f87" strokeWidth="2" />
                                  {/* Averaged percentile marker */}
                                  <line x1={percentileX} y1={pad} x2={percentileX} y2={h-pad} stroke="rgba(255,255,255,0.3)" strokeDasharray="4 4" />
                                  <circle cx={percentileX} cy={percentileY} r="4" fill="#ffffff" />
                                  {/* Axis labels */}
                                  <text x={w/2} y={h - 4} fill="#9ca3af" fontSize="10" textAnchor="middle">ESAT Score</text>
                                  <text x={8} y={pad - 8} fill="#9ca3af" fontSize="10">Distribution %</text>
                                </svg>
                              </div>
                            );
                          })()}
                          
                          <div className="mt-2 text-xs text-neutral-400 text-center">
                            If you sat the NSAA today, {(100 - nsaaAveragedPercentile).toFixed(1)}% of test-takers would outperform you on average across all subjects.
                          </div>
                        </div>
                      )}
                      {(() => {
                        const entries = Object.entries(sectionAnalytics);
                        // For NSAA, only show individual if toggle is on
                        const displayEntries = (examName === 'NSAA' && !showIndividualNSAASubjects) ? [] : entries;
                        const isSingleGraph = displayEntries.length === 1;
                        return displayEntries.map(([section, data], idx) => {
                          const isLastSingle = displayEntries.length % 2 === 1 && idx === displayEntries.length - 1;
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
                        const examYear = qs?.[0]?.examYear as number | undefined;
                        const isTmuAPre2024 = examName === 'TMUA' && examYear && examYear <= 2023;
                        return (
                          <div key={section} className={`p-3 rounded-md bg-neutral-900 ${isLastSingle || isSingleGraph ? 'md:col-span-2 md:mx-auto' : ''} ${isSingleGraph ? 'md:w-[80%]' : isLastSingle ? 'md:max-w-[560px]' : ''}`}>
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs px-2.5 py-1 rounded-md text-white font-medium" style={{ backgroundColor: getSectionColor(sectionNameForColor) }}>
                                    {section}
                                  </span>
                                </div>
                                <div className="text-xs text-neutral-400 mt-1">
                                  {typeof score === 'number' ? `${(examName === 'ENGAA' || examName === 'NSAA') ? 'ESAT' : examName} score: ${score.toFixed(1)}` : '—'}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs px-2 py-1 rounded-md bg-neutral-800 text-neutral-300">Table: {label}</span>
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
                                    {sp?.table && percentileTables[sp.table] 
                                      ? "We use the section's cumulative distribution: locate your score on the table and linearly interpolate between scores to estimate % of candidates at or below you. Top% = 100 − cumulative."
                                      : `We use ${(examName === 'ENGAA' || examName === 'NSAA') ? 'ESAT' : examName} conversion tables to convert your raw score to a scaled score.`}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 text-2xl font-bold text-neutral-100 text-center">
                              {Number.isFinite(pct as any) ? `TOP ${(Math.max(0, 100 - (pct as number))).toFixed(1)}%` : '—'}
                            </div>
                            
                            {/* TMUA Score Change Info Box for <=2023 papers */}
                            {isTmuAPre2024 && sp?.oldPercentile !== null && sp?.oldPercentile !== undefined && sp?.newEquivalentScore !== null && sp?.newEquivalentScore !== undefined && (
                              <div className="mt-3 p-3 rounded-md bg-neutral-800/50 border border-neutral-700">
                                <div className="flex items-start gap-2">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400 mt-0.5 flex-shrink-0">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="16" x2="12" y2="12" />
                                    <line x1="12" y1="8" x2="12.01" y2="8" />
                                  </svg>
                                  <div className="flex-1 text-xs text-neutral-300">
                                    <div className="font-medium mb-1">Score Change Notice</div>
                                    <div className="text-neutral-400 mb-2">
                                      Your percentile ({sp.oldPercentile.toFixed(1)}%) is based on the pre-2024 TMUA scoring system. 
                                      If you achieved the same percentile in 2024-2025, your score would be approximately {sp.newEquivalentScore.toFixed(1)}.
                                    </div>
                                    <div className="text-neutral-500 text-[10px]">
                                      TMUA changed its scoring system in 2024. This shows your equivalent performance under the new system.
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Explanation moved to tooltip above */}
                            {/* Mini percentile chart */}
                            {sp?.table && percentileTables[sp.table] && (
                              <div className={`mt-3 w-full mx-auto ${isSingleGraph ? 'min-w-[80%]' : 'max-w-[460px]'}`}>
                                {(() => {
                                  const rows = percentileTables[sp.table] || [];
                                  const w = 400; const h = 175; const pad = 24;
                                  if (rows.length < 2) return null;
                                  
                                  // Convert cumulative to distribution
                                  const distributionData: { score: number; distPct: number; midScore: number }[] = [];
                                  for (let i = 0; i < rows.length - 1; i++) {
                                    const distPct = rows[i + 1].cumulativePct - rows[i].cumulativePct;
                                    const midScore = (rows[i].score + rows[i + 1].score) / 2;
                                    distributionData.push({
                                      score: rows[i].score,
                                      distPct: distPct,
                                      midScore: midScore
                                    });
                                  }
                                  
                                  const xs = rows.map(r => r.score);
                                  const distPcts = distributionData.map(d => d.distPct);
                                  const minX = Math.min(...xs), maxX = Math.max(...xs);
                                  const minY = 0, maxY = Math.max(...distPcts, 1);
                                  const toX = (x: number) => pad + ((x - minX) / Math.max(1e-9, (maxX - minX))) * (w - 2*pad);
                                  const toY = (y: number) => h - pad - ((y - minY) / Math.max(1e-9, (maxY - minY))) * (h - 2*pad);
                                  
                                  // Build distribution curve points - through middle of bars, curved
                                  const points: { x: number; y: number }[] = [];
                                  distributionData.forEach((d, i) => {
                                    const midX = toX(d.midScore);
                                    const y = toY(d.distPct);
                                    points.push({ x: midX, y });
                                  });
                                  
                                  // Build smooth curved path using cubic bezier curves
                                  let pathD = '';
                                  if (points.length > 0) {
                                    pathD = `M ${points[0].x},${points[0].y}`;
                                    for (let i = 1; i < points.length; i++) {
                                      const prev = points[i - 1];
                                      const curr = points[i];
                                      const next = points[i + 1] || curr;
                                      // Calculate control points for smooth cubic bezier curve
                                      const dx1 = (curr.x - prev.x) * 0.3;
                                      const dy1 = (curr.y - prev.y) * 0.3;
                                      const dx2 = (next.x - curr.x) * 0.3;
                                      const dy2 = (next.y - curr.y) * 0.3;
                                      const cp1x = prev.x + dx1;
                                      const cp1y = prev.y + dy1;
                                      const cp2x = curr.x - dx2;
                                      const cp2y = curr.y - dy2;
                                      pathD += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${curr.y}`;
                                    }
                                  }
                                  
                                  // Find user's position in distribution
                                  let userX = toX(score ?? minX);
                                  let userDistY = h - pad;
                                  let userBarIndex = -1;
                                  for (let i = 0; i < distributionData.length; i++) {
                                    if (score !== null && score >= rows[i].score && score < rows[i + 1].score) {
                                      userBarIndex = i;
                                      // Calculate Y position on the curve at user's exact X
                                      const barStart = rows[i].score;
                                      const barEnd = rows[i + 1].score;
                                      const ratio = (score - barStart) / (barEnd - barStart);
                                      const prevPoint = i > 0 ? points[i - 1] : points[0];
                                      const currPoint = points[i];
                                      userDistY = prevPoint.y + (currPoint.y - prevPoint.y) * ratio;
                                      break;
                                    }
                                  }
                                  
                                  // Build filled area path up to user's position
                                  let filledPathD = '';
                                  if (points.length > 0 && userBarIndex >= 0 && score !== null) {
                                    // Start at baseline
                                    filledPathD = `M ${points[0].x},${h - pad}`;
                                    // Follow the curve up to the user's position
                                    for (let i = 0; i < userBarIndex; i++) {
                                      if (i === 0) {
                                        filledPathD += ` L ${points[i].x},${points[i].y}`;
                                      } else {
                                        const prev = points[i - 1];
                                        const curr = points[i];
                                        const next = points[i + 1] || curr;
                                        const dx1 = (curr.x - prev.x) * 0.3;
                                        const dy1 = (curr.y - prev.y) * 0.3;
                                        const dx2 = (next.x - curr.x) * 0.3;
                                        const dy2 = (next.y - curr.y) * 0.3;
                                        const cp1x = prev.x + dx1;
                                        const cp1y = prev.y + dy1;
                                        const cp2x = curr.x - dx2;
                                        const cp2y = curr.y - dy2;
                                        filledPathD += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${curr.y}`;
                                      }
                                    }
                                    // Add the point at user's exact position
                                    // Interpolate Y on the curve at user's X position
                                    const userActualX = toX(score);
                                    const barStart = rows[userBarIndex].score;
                                    const barEnd = rows[userBarIndex + 1].score;
                                    const ratio = (score - barStart) / (barEnd - barStart);
                                    const prevPoint = userBarIndex > 0 ? points[userBarIndex - 1] : points[0];
                                    const currPoint = points[userBarIndex];
                                    // Linear interpolation for Y at user's X
                                    const userY = prevPoint.y + (currPoint.y - prevPoint.y) * ratio;
                                    filledPathD += ` L ${userActualX},${userY}`;
                                    // Close the path back to baseline
                                    filledPathD += ` L ${userActualX},${h - pad} Z`;
                                  }
                                  
                                  // Build shaded area (bars for distribution)
                                  const bars: { x: number; width: number; height: number; y: number }[] = [];
                                  distributionData.forEach((d, i) => {
                                    const x1 = toX(rows[i].score);
                                    const x2 = toX(rows[i + 1].score);
                                    const barWidth = x2 - x1;
                                    const barHeight = h - pad - toY(d.distPct);
                                    bars.push({
                                      x: x1,
                                      width: barWidth,
                                      height: barHeight,
                                      y: toY(d.distPct)
                                    });
                                  });
                                  
                                  // Ticks
                                  const xTicks = [] as number[];
                                  for (let s = Math.ceil(minX); s <= Math.floor(maxX); s += 1) xTicks.push(s);
                                  const maxDistTick = Math.ceil(maxY);
                                  const yTicks = [0, maxDistTick * 0.25, maxDistTick * 0.5, maxDistTick * 0.75, maxDistTick].map(t => Math.round(t * 10) / 10);
                                  
                                  return (
                                    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" className="block">
                                      {/* Axes */}
                                      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#2a2d34" />
                                      <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#2a2d34" />
                                      {/* Filled area under curve up to user's position */}
                                      {filledPathD && (
                                        <path d={filledPathD} fill="rgba(108, 158, 105, 0.2)" stroke="none" />
                                      )}
                                      {/* Distribution bars - split if user is in the middle */}
                                      {bars.map((bar, i) => {
                                        const isUserBar = score !== null && score >= rows[i].score && score < rows[i + 1].score;
                                        const barStart = rows[i].score;
                                        const barEnd = rows[i + 1].score;
                                        const userInBar = score !== null && score >= barStart && score < barEnd;
                                        
                                        if (userInBar && score !== null && score > barStart && score < barEnd) {
                                          // Split the bar at user's position
                                          const splitX = toX(score);
                                          const leftWidth = splitX - bar.x;
                                          const rightWidth = bar.width - leftWidth;
                                          return (
                                            <g key={i}>
                                              <rect
                                                x={bar.x}
                                                y={bar.y}
                                                width={leftWidth}
                                                height={bar.height}
                                                fill="rgba(108, 158, 105, 0.3)"
                                                stroke="rgba(108, 158, 105, 0.6)"
                                                strokeWidth={1.5}
                                              />
                                              <rect
                                                x={splitX}
                                                y={bar.y}
                                                width={rightWidth}
                                                height={bar.height}
                                                fill="rgba(122, 127, 135, 0.2)"
                                                stroke="rgba(122, 127, 135, 0.4)"
                                                strokeWidth={0.5}
                                              />
                                            </g>
                                          );
                                        }
                                        return (
                                          <rect
                                            key={i}
                                            x={bar.x}
                                            y={bar.y}
                                            width={bar.width}
                                            height={bar.height}
                                            fill={isUserBar ? "rgba(108, 158, 105, 0.3)" : (i < userBarIndex ? "rgba(108, 158, 105, 0.3)" : "rgba(122, 127, 135, 0.2)")}
                                            stroke={isUserBar ? "rgba(108, 158, 105, 0.6)" : (i < userBarIndex ? "rgba(108, 158, 105, 0.6)" : "rgba(122, 127, 135, 0.4)")}
                                            strokeWidth={isUserBar ? 1.5 : (i < userBarIndex ? 1.5 : 0.5)}
                                          />
                                        );
                                      })}
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
                                          <text x={pad - 6} y={toY(t) + 3} fill="#7a7f87" fontSize="9" textAnchor="end">{t.toFixed(1)}</text>
                                        </g>
                                      ))}
                                      {/* Distribution curve */}
                                      <path d={pathD} fill="none" stroke="#7a7f87" strokeWidth="2" />
                                      {/* User marker */}
                                      {Number.isFinite(score) && (
                                        <>
                                          <line x1={userX} y1={pad} x2={userX} y2={h-pad} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                                          <circle cx={userX} cy={userDistY} r="3" fill="#ffffff" />
                                        </>
                                      )}
                                      {/* Axis labels */}
                                      <text x={w/2} y={h - 4} fill="#9ca3af" fontSize="10" textAnchor="middle">{examName || 'Score'}</text>
                                      <text x={8} y={pad - 8} fill="#9ca3af" fontSize="10">Distribution %</text>
                                    </svg>
                                  );
                                })()}
                              </div>
                            )}
                            <div className="mt-2 text-xs text-neutral-400">
                              {Number.isFinite(pct as any) 
                                ? `If you sat the ${(examName === 'ENGAA' || examName === 'NSAA') ? 'ESAT' : examName} today, ${(100 - (pct as number)).toFixed(1)}% of test-takers would outperform you in ${section}.`
                                : `Your ${(examName === 'ENGAA' || examName === 'NSAA') ? 'ESAT' : examName} score: ${typeof score === 'number' ? score.toFixed(1) : '—'}`}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Accuracy and Guessing Patterns (merged) */}
                  <div className={`${bubbleClass} space-y-4 md:col-span-2`}>
                    <div className="text-base font-semibold text-neutral-100">Accuracy and Guessing Patterns</div>
                    
                    {/* Correct/Incorrect/Guessed stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl bg-[#1a1f27] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_20px_rgba(0,0,0,0.25)] p-6 flex flex-col items-center justify-center min-h-[120px]">
                        <div className="text-xs text-neutral-400 mb-2">Correct</div>
                        <div className="text-2xl font-bold" style={{ color: "#6c9e69" }}>
                          {accuracyPatterns.correct}
                        </div>
                        <div className="text-xs text-neutral-500 mt-2">
                          {Math.round((accuracyPatterns.correct / totalQuestions) * 100)}%
                        </div>
                      </div>
                      <div className="rounded-xl bg-[#1a1f27] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_20px_rgba(0,0,0,0.25)] p-6 flex flex-col items-center justify-center min-h-[120px]">
                        <div className="text-xs text-neutral-400 mb-2">Incorrect</div>
                        <div className="text-2xl font-bold" style={{ color: PAPER_COLORS.chemistry }}>
                          {accuracyPatterns.incorrect}
                        </div>
                        <div className="text-xs text-neutral-500 mt-2">
                          {Math.round((accuracyPatterns.incorrect / totalQuestions) * 100)}%
                        </div>
                      </div>
                      <div className="rounded-xl bg-[#1a1f27] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_20px_rgba(0,0,0,0.25)] p-6 flex flex-col items-center justify-center min-h-[120px]">
                        <div className="text-xs text-neutral-400 mb-2">Guessed</div>
                        <div className="text-2xl font-bold" style={{ color: '#c99d6a' }}>
                          {accuracyPatterns.guessed}
                        </div>
                        <div className="text-xs text-neutral-500 mt-2">
                          {Math.round((accuracyPatterns.guessed / totalQuestions) * 100)}%
                        </div>
                      </div>
                    </div>

                    {/* Guess Distribution */}
                    <div>
                      <div className="text-xs text-neutral-400 mb-2">Analyse if you guessed too much</div>
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
                        const guessColor = '#c99d6a'; // desaturated orange
                        const correctBorder = "#6c9e69";
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

                    {/* Guess accuracy and Guess time split in the same row */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Guess accuracy */}
                      <div>
                        <div className="text-xs text-neutral-400 mb-2">Guess accuracy</div>
                        <div className="p-3 rounded-md bg-neutral-900 flex items-center gap-3">
                          <div className="w-[20%] text-center">
                            <div className="text-2xl font-bold text-neutral-200">{guessExtended.accuracy}%</div>
                          </div>
                          <div className="flex-1 h-6 bg-neutral-800 rounded-full overflow-hidden border border-white/5">
                            <div
                              className="h-full flex items-center justify-center text-[11px] font-medium transition-all"
                              style={{ width: `${guessExtended.accuracy}%`, backgroundColor: `rgba(108, 158, 105, 0.8)` }}
                            >
                              {guessExtended.accuracy >= 5 ? `${guessExtended.accuracy}%` : ''}
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Guess time split */}
                      <div>
                        <div className="text-xs text-neutral-400 mb-2">Guess time split: correct vs wrong</div>
                        {guessExtended.count > 0 ? (() => {
                          const correctCount = guessExtended.correctGuesses;
                          const wrongCount = Math.max(0, guessExtended.count - correctCount);
                          const correctTime = correctCount * Math.max(0, guessExtended.avgTimeCorrectGuess);
                          const wrongTime = wrongCount * Math.max(0, guessExtended.avgTimeWrongGuess);
                          const totalGuessTime = Math.max(1e-6, correctTime + wrongTime);
                          const correctPct = Math.round((correctTime / totalGuessTime) * 100);
                          const wrongPct = Math.max(0, 100 - correctPct);
                          return (
                            <div className="w-full h-6 bg-neutral-900 rounded-full overflow-hidden border border-white/5">
                              <div className="flex w-full h-full">
                                <div
                                  className="h-full flex items-center justify-center text-[11px] font-medium"
                                  style={{ width: `${correctPct}%`, backgroundColor: `rgba(108, 158, 105, 0.8)` }}
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
                          );
                        })() : (
                          <div className="p-3 rounded-md bg-neutral-900 text-center">
                            <div className="text-sm text-neutral-500">No guesses</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mistake Analysis */}
                  <div className={`${bubbleClass} space-y-4 md:col-span-2`}>
                    <div className="text-base font-semibold text-neutral-100">Mistake Analysis</div>
                    
                    <MistakeChart mistakeTags={mistakeTags} />

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

                  {/* Time vs Question Chart - Full Width (already placed above). Duplicate removed. */}

                  {/* Key Insights removed */}
                </div>
              ) : (
              <div className="space-y-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="text-base font-semibold text-neutral-200">Question</div>
                  <div className="text-base font-semibold text-neutral-200">{questionNumbers[selectedIndex]}</div>
                </div>
                {/* Change your answer buttons */}
                <div className="flex items-center gap-2">
                  <div className="text-xs text-neutral-400">Change your answer:</div>
                  <div className="flex flex-row gap-2">
                    <button
                      className={`px-3 py-2 text-xs rounded-md transition flex items-center justify-center gap-1.5 outline-none focus:outline-none ${
                        (derivedCorrectFlags[selectedIndex] ?? correctFlags[selectedIndex]) === true ? "text-white" : "text-neutral-300 hover:bg-neutral-700"
                      }`}
                      style={(derivedCorrectFlags[selectedIndex] ?? correctFlags[selectedIndex]) === true ? { backgroundColor: "#6c9e69", outline: 'none' } : { backgroundColor: "#1f1f1f", outline: 'none' }}
                      onClick={() => setCorrectFlag(selectedIndex, correctFlags[selectedIndex] === true ? null : true)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      Correct
                    </button>
                    <button
                      className={`px-3 py-2 text-xs rounded-md transition flex items-center justify-center gap-1.5 outline-none focus:outline-none ${
                        (derivedCorrectFlags[selectedIndex] ?? correctFlags[selectedIndex]) === false ? "text-white" : "text-neutral-300 hover:bg-neutral-700"
                      }`}
                      style={(derivedCorrectFlags[selectedIndex] ?? correctFlags[selectedIndex]) === false ? { backgroundColor: PAPER_COLORS.chemistry, outline: 'none' } : { backgroundColor: "#1f1f1f", outline: 'none' }}
                      onClick={() => setCorrectFlag(selectedIndex, correctFlags[selectedIndex] === false ? null : false)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      Wrong
                    </button>
                    <button
                      className={`px-3 py-2 text-xs rounded-md transition flex items-center justify-center gap-1.5 outline-none focus:outline-none ${
                        guessedFlags[selectedIndex]
                          ? "text-white"
                          : "text-neutral-300 hover:bg-neutral-700"
                      }`}
                      style={guessedFlags[selectedIndex]
                        ? { backgroundColor: '#c99d6a', outline: 'none' }
                        : { backgroundColor: '#1f1f1f', outline: 'none' }}
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
              </div>

              {/* Compact Stats Section - Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4 items-stretch">
                {/* Left Column: Community Stats */}
                {(() => {
                  const question = usePaperSessionStore.getState().questions[selectedIndex];
                  const stats = question ? questionStats[question.id] : null;
                  
                  return (
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-medium text-neutral-300 uppercase tracking-wider">Community Stats</div>
                        {stats && (
                          <div className="text-xs text-neutral-500">{stats.attempts} attempts</div>
                        )}
                      </div>
                      
                      {!stats ? (
                        statsLoading ? (
                          <div className="text-xs text-neutral-500">Loading...</div>
                        ) : null
                      ) : (
                        <>
                          {/* Emphasized Average Time */}
                          <div className="p-2.5 rounded-md" style={{ backgroundColor: '#1a1f27' }}>
                            <div className="text-xs text-neutral-400 mb-0.5">Community average time</div>
                            <div className="text-base font-semibold text-neutral-100">
                              {formatTime(Math.round(stats.avgTimeSeconds))}
                            </div>
                          </div>
                          
                          {/* Answer Distribution - Vertical Bar Chart */}
                          <div className="space-y-1.5 flex-1">
                            <div className="text-xs text-neutral-400">Answer distribution</div>
                            <div className="flex items-end justify-between gap-1.5 h-20">
                              {LETTERS.map((letter) => {
                                const percentage = stats.optionPercentages[letter] || 0;
                                const isCorrect = letter === (question?.answerLetter || "").toUpperCase();
                                const isUserChoice = letter === (answers[selectedIndex]?.choice || "").toUpperCase();
                                const isUserWrong = isUserChoice && !isCorrect;
                                
                                // Show all options, but highlight relevant ones
                                const shouldShow = percentage > 0 || isCorrect || isUserChoice;
                                
                                return (
                                  <div key={letter} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                                    <div 
                                      className="w-full rounded-t transition-all duration-300 relative"
                                      style={{
                                        height: `${Math.max(percentage, shouldShow ? 3 : 0)}%`,
                                        backgroundColor: isCorrect
                                          ? "#6c9e69"
                                          : isUserWrong
                                          ? PAPER_COLORS.chemistry
                                          : isUserChoice
                                          ? "#c99d6a"
                                          : shouldShow
                                          ? "#5a6370"
                                          : "transparent",
                                        minHeight: shouldShow ? "6px" : "0px",
                                      }}
                                    >
                                      {shouldShow && percentage > 0 && (
                                        <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-[10px] text-neutral-400 whitespace-nowrap">
                                          {percentage.toFixed(0)}%
                                        </div>
                                      )}
                                    </div>
                                    <div className={`text-xs font-medium ${shouldShow ? 'text-neutral-300' : 'text-neutral-600'}`}>
                                      {letter}
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

                {/* Right Column: Your Stats */}
                <div className="flex flex-col space-y-2">
                  <div className="text-xs font-medium text-neutral-300 uppercase tracking-wider mb-1">Your Answer</div>
                  
                  {/* Time taken - Top row with comparison */}
                  {(() => {
                    const question = usePaperSessionStore.getState().questions[selectedIndex];
                    const stats = question ? questionStats[question.id] : null;
                    const userTime = perQuestionSec[selectedIndex] || 0;
                    const communityTime = stats ? stats.avgTimeSeconds : null;
                    const timeDiff = communityTime !== null ? userTime - communityTime : null;
                    const isFaster = timeDiff !== null && timeDiff < 0;
                    const diffSeconds = timeDiff !== null ? Math.abs(Math.round(timeDiff)) : 0;
                    
                    return (
                      <div className="p-2.5 rounded-md" style={{ backgroundColor: '#1a1f27' }}>
                        <div className="text-xs text-neutral-400 mb-0.5">Your time</div>
                        <div className="flex items-baseline gap-2">
                          <div className="text-base font-semibold text-neutral-100">
                            {formatTime(Math.round(userTime))}
                          </div>
                          {timeDiff !== null && diffSeconds > 0 && (
                            <div className={`text-xs ${isFaster ? 'text-[#6c9e69]' : 'text-neutral-400'}`}>
                              ({isFaster ? `${diffSeconds}s faster` : `${diffSeconds}s slower`} than avg)
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* Your answer and Correct answer - Side by side */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Your answer */}
                    {(() => {
                      const hasAnswer = answers[selectedIndex]?.choice;
                      const isGuessed = guessedFlags[selectedIndex];
                      const isCorrect = (derivedCorrectFlags[selectedIndex] ?? correctFlags[selectedIndex]) === true;
                      const isWrong = (derivedCorrectFlags[selectedIndex] ?? correctFlags[selectedIndex]) === false;
                      
                      // Helper to convert hex to rgba
                      const hexToRgba = (hex: string, alpha: number) => {
                        const r = parseInt(hex.slice(1, 3), 16);
                        const g = parseInt(hex.slice(3, 5), 16);
                        const b = parseInt(hex.slice(5, 7), 16);
                        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                      };
                      
                      let bgColor = '#2b2f36'; // default neutral
                      let textColor = '#ffffff';
                      let labelColor = 'text-neutral-200';
                      
                      if (hasAnswer) {
                        if (isGuessed) {
                          bgColor = 'rgba(184, 159, 90, 0.2)'; // gold with opacity
                          textColor = '#f4d03f'; // lighter gold for text
                          labelColor = 'text-neutral-300';
                        } else if (isCorrect) {
                          bgColor = 'rgba(108, 158, 105, 0.2)'; // green with opacity
                          textColor = '#a6d48a'; // lighter green for text
                          labelColor = 'text-neutral-300';
                        } else if (isWrong) {
                          // Convert chemistry color (red) to rgba
                          const wrongColor = PAPER_COLORS.chemistry;
                          bgColor = wrongColor.startsWith('#') 
                            ? hexToRgba(wrongColor, 0.2)
                            : `rgba(220, 38, 38, 0.2)`; // fallback red
                          textColor = '#f87171'; // lighter red for text
                          labelColor = 'text-neutral-300';
                        }
                      }
                      
                      return (
                        <div className="p-3 rounded-md flex flex-col justify-center min-h-[80px]" style={{ backgroundColor: bgColor }}>
                          <div className={`text-xs ${labelColor} mb-1`}>Your answer</div>
                          <div 
                            className="text-base font-medium"
                            style={{ color: hasAnswer ? textColor : '#9ca3af' }}
                          >
                            {answers[selectedIndex]?.choice ?? "—"}
                          </div>
                        </div>
                      );
                    })()}
                    
                    {/* Correct answer */}
                    <div className="p-3 rounded-md flex flex-col justify-center min-h-[80px]" style={{ backgroundColor: '#2b2f36' }}>
                      <div className="text-xs text-neutral-200 mb-1">Correct answer</div>
                      <div className="text-base font-medium" style={{ color: "#6c9e69" }}>
                        {(usePaperSessionStore.getState().questions[selectedIndex]?.answerLetter || "—").toUpperCase()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Question and Answer - Side by Side (normal) or Stacked (TMUA) */}
              {(() => {
                const question = usePaperSessionStore.getState().questions[selectedIndex];
                const isTMUA = question?.questionImage && question?.solutionImage && !question?.solutionText;
                const questionImgSrc = (isTMUA && croppedQuestionImage) ? croppedQuestionImage : question?.questionImage;
                
                return (
                  <div className={`grid gap-4 transition-all duration-300 grid-cols-1`}>
                    {/* Question image */}
                    <div className={`relative rounded-lg transition-all duration-300 w-full`} style={{ height: '55vh', backgroundColor: isDarkMode ? '#000000' : '#ffffff' }}>
                      {/* Scrollable container for image content */}
                      <div 
                        className="absolute inset-0 overflow-y-auto overflow-x-hidden scrollbar-hide transition-colors duration-300 ease-in-out rounded-lg"
                        style={{
                          backgroundColor: isDarkMode ? '#000000' : '#ffffff'
                        }}
                      >
                        <div className="flex flex-col items-center justify-center min-h-full pt-4 pb-4 px-4">
                          <div className="relative flex w-full justify-center" style={{ isolation: 'isolate' }}>
                            <div
                              className="relative inline-block"
                              style={{
                                width: 'min(54%, 825px)',
                                maxWidth: '825px',
                                lineHeight: 0,
                                transition: 'background-color 300ms ease-in-out'
                              }}
                            >
                              <div
                                style={{
                                  position: 'relative',
                                  display: 'inline-block',
                                  lineHeight: 0,
                                  backgroundColor: isDarkMode ? '#ffffff' : 'transparent'
                                }}
                              >
                                <img
                                  src={questionImgSrc}
                                  alt={`Question ${questionNumbers[selectedIndex]}`}
                                  className="block h-auto w-full transition-opacity duration-300 ease-in-out"
                                  style={{
                                    display: 'block',
                                    height: 'auto',
                                    width: '100%',
                                    imageRendering: 'auto',
                                    borderRadius: 0,
                                    margin: 0,
                                    padding: 0,
                                    verticalAlign: 'bottom',
                                    filter: isDarkMode ? 'invert(1) hue-rotate(180deg)' : 'none'
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

                    {/* Answer/Solution section - only show when showAnswer is true */}
                    {showAnswer && (() => {
                      const question = usePaperSessionStore.getState().questions[selectedIndex];
                      const isTMUA = question?.questionImage && question?.solutionImage && !question?.solutionText;
                      const answerImgSrc = (isTMUA && croppedAnswerImage) ? croppedAnswerImage : question?.solutionImage;
                      
                      if (isTMUA) {
                        // TMUA: Answer image below question with solution label
                        return (
                          <div className="relative rounded-lg transition-all duration-300 w-full border-2" style={{ height: '55vh', backgroundColor: isDarkMode ? '#000000' : '#ffffff', borderColor: 'rgba(108, 158, 105, 0.25)' }}>
                            {/* Scrollable container for image content */}
                            <div 
                              className="absolute inset-0 overflow-y-auto overflow-x-hidden scrollbar-hide transition-colors duration-300 ease-in-out rounded-lg"
                              style={{
                                backgroundColor: isDarkMode ? '#000000' : '#ffffff'
                              }}
                            >
                              <div className="flex flex-col items-center justify-center min-h-full pt-8 pb-8 px-6">
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
                                        backgroundColor: isDarkMode ? '#ffffff' : 'transparent'
                                      }}
                                    >
                                      <img
                                        src={answerImgSrc as string}
                                        alt="Solution"
                                        className="block h-auto w-full transition-opacity duration-300 ease-in-out"
                                        style={{
                                          display: 'block',
                                          height: 'auto',
                                          width: '100%',
                                          imageRendering: 'auto',
                                          borderRadius: 0,
                                          margin: 0,
                                          padding: 0,
                                          verticalAlign: 'bottom',
                                          filter: isDarkMode ? 'invert(1) hue-rotate(180deg)' : 'none'
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
                            <div className="text-sm font-semibold text-neutral-200">Suggested Answer</div>
                            <div className="flex items-center gap-2">
                              {currentQuestionTitle && (
                                <div className="ml-3 px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#1f1f1f', color: '#d1d5db' }}>
                                  {currentQuestionTitle}
                                </div>
                              )}
                              <button
                                onClick={() => setShowAnswer(!showAnswer)}
                                className="px-2 py-1 text-xs rounded-md ring-1 transition bg-neutral-800 text-neutral-300 ring-white/10 hover:bg-neutral-700 flex items-center gap-1"
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
                          </div>
                          <div className="space-y-3">
                            {question?.solutionText && (
                              <div className="p-4 rounded-md bg-white/5">
                                <div style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: 'calc(1.125rem * 1.15)', lineHeight: '2.25rem', marginTop: '0', marginBottom: '0', paddingTop: '0', paddingBottom: '0' }}>
                                  <MathContent 
                                    content={(question.solutionText || "")
                                      .replace(/<tip>.*?<\/tip>/gis, '')
                                      .replace(/<question_title>[\s\S]*?<\/question_title>/gi, '')
                                      .replace(/<question>[\s\S]*?<\/question>/gi, '')
                                      .replace(/<\/?solution>/gi, '')
                                      .replace(/<\/?final_answer>/gi, '')
                                      .replace(/^\s*Question\s+\d+\s*[:.\-]?\s*/i, '')
                                      .replace(/^\s+/, '')} 
                                    className="text-white" 
                                  />
                                </div>
                              </div>
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

              {/* Tips and Tricks Section - Full Width Below Question/Answer */}
              {currentTip && (
                <div className={`${bubbleClass} mt-4`}>
                  <div className="space-y-3">
                    {/* Tips and Tricks Header */}
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" style={{ color: "#6c9e69" }} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div className="text-base font-semibold text-neutral-100">Tips and Tricks</div>
                    </div>
                    {/* Tips and Tricks Content */}
                    <div className="text-sm text-neutral-300 leading-relaxed">
                      <MathContent content={currentTip} className="text-neutral-300 text-sm" />
                    </div>
                  </div>
                </div>
              )}

              {/* Session Notes - Always visible */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-medium text-neutral-300 uppercase tracking-wider">Session Notes</div>
                    {/* Tooltip icon */}
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
                  {(sessionNoteStatus === 'typing' || sessionNoteStatus === 'saved') && (
                    <div className={`px-2 py-0.5 rounded-md text-[11px] ${sessionNoteStatus === 'saved' ? 'bg-[rgba(80,97,65,0.2)] text-[#a6d48a]' : 'bg-transparent text-neutral-400'}`}>
                      {sessionNoteStatus === 'typing' ? 'Saving…' : 'Saved'}
                    </div>
                  )}
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    setSessionNoteStatus('typing');
                    if (sessionNoteDebounceRef.current) clearTimeout(sessionNoteDebounceRef.current);
                    sessionNoteDebounceRef.current = setTimeout(() => setSessionNoteStatus('saved'), 700);
                  }}
                  placeholder="Summarise your key mistakes and strategies for next time. You'll be able to review these before your next paper."
                  className="w-full px-4 py-3 text-neutral-100 rounded-lg bg-white/5 text-sm resize-none placeholder:text-neutral-400 outline-none focus:outline-none focus:ring-0 ring-0 border-0"
                  rows={4}
                />
              </div>
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
            </div>
            <div className="text-sm text-neutral-300">Click a question number to open it on the right. Tag the mistake. All wrong answers are automatically added to your drill pool.</div>
            <div className="space-y-4">
              {partGroups.map((group) => {
                // Filter to only wrong answers in this part
                const wrongAnswersInPart = group.indexes
                  .map((index) => ({
                    index,
                    qn: questionNumbers[index],
                    isWrong: (derivedCorrectFlags[index] ?? correctFlags[index]) === false,
                  }))
                  .filter((item) => item.isWrong);

                if (wrongAnswersInPart.length === 0) return null;

                const partDisplay = (/^part/i.test(group.partLetter) ? group.partLetter : `Part ${group.partLetter}`).replace(/^[•·\.]\s*/, '');
                const preset = ['Misread question','Rushed calculation','Concept gap','Method recall','Careless arithmetic','Unit/scale error','Diagram interpretation','Time pressure','Second-guessing',"Didn't review options"];
                const customKey = 'paper.customMistakeTags';
                const custom = (() => { try { return JSON.parse((localStorage.getItem(customKey) || '[]') as unknown as string); } catch { return []; } })();
                const opts = Array.from(new Set([...preset, ...custom]));

                return (
                  <div key={group.partLetter} className="space-y-2">
                    {/* Part Header with colored accent */}
                    <div className="flex items-center gap-2">
                      <div 
                        className="text-sm font-semibold px-2 py-1 rounded-md text-white"
                        style={{ backgroundColor: group.color }}
                      >
                        {partDisplay}
                      </div>
                      <div className="text-xs text-neutral-400">
                        {wrongAnswersInPart.length} {wrongAnswersInPart.length === 1 ? 'mistake' : 'mistakes'}
                      </div>
                    </div>
                    {/* Questions grid - 6 per row */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                      {wrongAnswersInPart.map(({ index, qn }) => {
                        const tags = Array.isArray(mistakeTags[index]) ? (mistakeTags[index] as any[]) : [];
                        return (
                          <div 
                            key={qn} 
                            className="flex items-center justify-between bg-[#0f1114] hover:bg-[#121418] rounded-md px-3 py-2 border-l-2"
                            style={{ borderLeftColor: group.color }}
                          >
                            <button 
                              className="text-sm font-medium text-neutral-200" 
                              onClick={() => setSelectedIndex(index)}
                            >
                              Q{qn}
                            </button>
                            <div className="flex items-center gap-2">
                              <MistakeSelect
                                value={Array.isArray(tags) ? tags : []}
                                options={opts}
                                onCreateOption={(label: string) => {
                                  const next = Array.from(new Set([...custom, label]));
                                  localStorage.setItem(customKey, JSON.stringify(next));
                                }}
                                onChange={(next: string[]) => {
                                  setMistakeTag(index, next as any);
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
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
        <div className="flex items-center justify-between gap-3">
          {/* Delete Attempt Button - Left Side */}
          <button
            onClick={handleDeleteAttempt}
            className={cn(
              "px-6 py-3 rounded-organic-md transition-all duration-fast ease-signature flex items-center justify-center gap-2 font-mono text-sm font-medium",
              "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 cursor-pointer"
            )}
            style={{
              boxShadow: 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 6px 0 rgba(0, 0, 0, 0.6)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 8px 0 rgba(0, 0, 0, 0.7)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 6px 0 rgba(0, 0, 0, 0.6)';
            }}
          >
            <Trash2 className="w-4 h-4" strokeWidth={2.5} />
            <span>Delete Attempt</span>
          </button>

          {/* Right Side Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/papers/library")}
              className={cn(
                "px-6 py-3 rounded-organic-md transition-all duration-fast ease-signature flex items-center justify-center gap-2 font-mono text-sm font-medium",
                "bg-white/5 hover:bg-white/10 text-white/80 hover:text-white cursor-pointer"
              )}
              style={{
                boxShadow: 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 6px 0 rgba(0, 0, 0, 0.6)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 8px 0 rgba(0, 0, 0, 0.7)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 6px 0 rgba(0, 0, 0, 0.6)';
              }}
            >
              <span>New Session</span>
            </button>
            <button
              onClick={handleSaveAndContinue}
              disabled={isSubmitting}
              className={cn(
                "px-6 py-3 rounded-organic-md transition-all duration-fast ease-signature flex items-center justify-center gap-2 font-mono text-sm font-medium",
                isSubmitting
                  ? "bg-white/5 text-white/40 cursor-not-allowed"
                  : "bg-primary/30 hover:bg-primary/40 text-primary cursor-pointer"
              )}
              style={
                !isSubmitting
                  ? {
                      boxShadow: 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 6px 0 rgba(0, 0, 0, 0.6)'
                    }
                  : undefined
              }
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.boxShadow = 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 8px 0 rgba(0, 0, 0, 0.7)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.boxShadow = 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 6px 0 rgba(0, 0, 0, 0.6)';
                }
              }}
            >
              <span>{isSubmitting ? "Saving..." : "Save & Continue"}</span>
              {!isSubmitting && <ArrowRight className="w-4 h-4" strokeWidth={2.5} />}
            </button>
          </div>
        </div>
    </Container>
    </Fragment>
  );
}

