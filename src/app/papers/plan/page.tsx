/**
 * Papers Plan page - Step-by-step wizard for paper selection
 */

"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/layout/Container";
import { cn } from "@/lib/utils";
import { usePaperSessionStore } from "@/store/paperSessionStore";
import { PAPER_TYPE_CONFIGS, getPaperTypeConfig, examNameToPaperType, paperTypeToExamName } from "@/lib/papers/paperConfig";
import { getAvailableExamNames, getAvailableYears, getAvailablePaperNames, getAvailableExamTypes, getPaper, getConversionTable, getConversionRows, findFallbackConversionTable } from "@/lib/supabase/questions";
import { supabase } from "@/lib/supabase/client";
import { getAvailableSectionsFromParts, mapPartToSection } from "@/lib/papers/sectionMapping";
import type { PaperType, PaperSection, PaperVariantType, ExamName, ExamType, Question } from "@/types/papers";
import { StepCard } from "@/components/papers/StepCard";
import { YearSelector } from "@/components/papers/YearSelector";
import { SectionSelector } from "@/components/papers/SectionSelector";
import { SessionSummary } from "@/components/papers/SessionSummary";
import { getPaperTypeColor } from "@/config/colors";
import { PageHeader } from "@/components/shared/PageHeader";

const TMUA_SECTIONS = ["Paper 1", "Paper 2"] as const;
type TmuaSection = typeof TMUA_SECTIONS[number];
const TMUA_DEFAULT_SUBJECTS: Record<TmuaSection, string> = {
  "Paper 1": "Mathematical Thinking",
  "Paper 2": "Mathematical Thinking and Reasoning Skills",
};

function isTmuaSection(section: PaperSection): section is TmuaSection {
  return TMUA_SECTIONS.includes(section as TmuaSection);
}

function normalizeTmuaSubject(partName: string | null | undefined, section: PaperSection): string {
  const trimmed = (partName ?? "").trim();
  if (trimmed.length > 0) {
    return trimmed;
  }
  if (isTmuaSection(section)) {
    return TMUA_DEFAULT_SUBJECTS[section];
  }
  return section;
}

function deriveTmuaSectionFromQuestion(question: Question, index: number, totalQuestions: number): TmuaSection {
  const baseSection = mapPartToSection(
    {
      partLetter: (question.partLetter ?? "") as string,
      partName: (question.partName ?? "") as string,
    },
    "TMUA"
  );

  if (baseSection === "Paper 1" || baseSection === "Paper 2") {
    return baseSection as TmuaSection;
  }

  const meta = [
    question.paperName ?? "",
    question.partLetter ?? "",
    question.partName ?? "",
    question.examType ?? "",
  ]
    .map((value) => value.toString().toLowerCase())
    .join(" ");

  if (
    /\bpaper\s*2\b/.test(meta) ||
    /\bpart\s*b\b/.test(meta) ||
    /\bsection\s*2\b/.test(meta) ||
    /\bs2\b/.test(meta) ||
    /\bsecond\b/.test(meta) ||
    /reason/.test(meta) ||
    /logic/.test(meta)
  ) {
    return "Paper 2";
  }

  if (
    /\bpaper\s*1\b/.test(meta) ||
    /\bpart\s*a\b/.test(meta) ||
    /\bsection\s*1\b/.test(meta) ||
    /\bs1\b/.test(meta) ||
    /\bfirst\b/.test(meta) ||
    /math/.test(meta)
  ) {
    return "Paper 1";
  }

  if (typeof question.questionNumber === "number" && totalQuestions > 0) {
    const halfway = Math.max(1, Math.ceil(totalQuestions / 2));
    if (question.questionNumber > halfway) {
      return "Paper 2";
    }
    return "Paper 1";
  }

  if (totalQuestions > 0 && index >= Math.floor(totalQuestions / 2)) {
    return "Paper 2";
  }

  return "Paper 1";
}

export default function PapersPlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { startSession, loadQuestions, sessionId, deadline, endedAt, resetSession, sessionName: existingSessionName } = usePaperSessionStore();
  
  // Wizard state
  const [selectedPaper, setSelectedPaper] = useState<PaperType | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedPaperName, setSelectedPaperName] = useState<string | null>(null);
  const [selectedExamType, setSelectedExamType] = useState<ExamType | null>(null);
  const [selectedSections, setSelectedSections] = useState<PaperSection[]>([]);
  const [sessionName, setSessionName] = useState("");
  const [customTimeLimit, setCustomTimeLimit] = useState<number | null>(null);
  const [userHasEditedTime, setUserHasEditedTime] = useState(false);
  
  // Database state
  const [availableExamNames, setAvailableExamNames] = useState<ExamName[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availablePaperNames, setAvailablePaperNames] = useState<string[]>([]);
  const [availableExamTypes, setAvailableExamTypes] = useState<ExamType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isTmuaSelected = selectedPaper === "TMUA";
  const [isStartingSession, setIsStartingSession] = useState(false);
  
  // Load available exam names on mount
  useEffect(() => {
    const loadExamNames = async () => {
      setLoading(true);
      setError(null);
      try {
        const examNames = await getAvailableExamNames();
        setAvailableExamNames(examNames);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load exam names');
      } finally {
        setLoading(false);
      }
    };
    
    loadExamNames();
  }, []);

  // Load available years when paper is selected
  useEffect(() => {
    if (!selectedPaper) {
      setAvailableYears([]);
      return;
    }

    const loadYears = async () => {
      const examName = paperTypeToExamName(selectedPaper);
      if (!examName) return;
      
      setLoading(true);
      setError(null);
      try {
        const years = await getAvailableYears(examName);
        setAvailableYears(years);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load years');
      } finally {
        setLoading(false);
      }
    };
    
    loadYears();
  }, [selectedPaper]);

  // Load available paper names when year is selected
  useEffect(() => {
    if (!selectedPaper || !selectedYear) {
      setAvailablePaperNames([]);
      return;
    }

    const loadPaperNames = async () => {
      const examName = paperTypeToExamName(selectedPaper);
      if (!examName) return;
      
      setLoading(true);
      setError(null);
      try {
        const paperNames = await getAvailablePaperNames(examName, selectedYear);
        setAvailablePaperNames(paperNames);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load paper names');
      } finally {
        setLoading(false);
      }
    };
    
    loadPaperNames();
  }, [selectedPaper, selectedYear]);

  // Auto-select the only available paper for TMUA since there are no variants
  useEffect(() => {
    if (!isTmuaSelected) {
      return;
    }

    if (availablePaperNames.length === 0) {
      setSelectedPaperName(null);
      return;
    }

    setSelectedPaperName((current) => {
      if (current && availablePaperNames.includes(current)) {
        return current;
      }
      return availablePaperNames[0];
    });
  }, [isTmuaSelected, availablePaperNames]);

  // Load available exam types when paper name is selected
  useEffect(() => {
    if (!selectedPaper || !selectedYear || !selectedPaperName) {
      setAvailableExamTypes([]);
      return;
    }

    const loadExamTypes = async () => {
      const examName = paperTypeToExamName(selectedPaper);
      if (!examName) return;
      
      setLoading(true);
      setError(null);
      try {
        const examTypes = await getAvailableExamTypes(examName, selectedYear, selectedPaperName);
        setAvailableExamTypes(examTypes);
        
        // Auto-select if there's only one exam type
        if (examTypes.length === 1) {
          setSelectedExamType(examTypes[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load exam types');
      } finally {
        setLoading(false);
      }
    };
    
    loadExamTypes();
  }, [selectedPaper, selectedYear, selectedPaperName]);

  // Get paper type config
  const paperTypeConfig = useMemo(() => {
    if (!selectedPaper) return null;
    return getPaperTypeConfig(selectedPaper);
  }, [selectedPaper]);
  
  // Get available sections from database
  const [availableSections, setAvailableSections] = useState<PaperSection[]>([]);
  const [partInfoMapping, setPartInfoMapping] = useState<Record<PaperSection, { partLetter: string; partName: string }>>({} as Record<PaperSection, { partLetter: string; partName: string }>);
  
  // Pre-fill from URL parameters (from roadmap)
  useEffect(() => {
    const examNameParam = searchParams.get('examName');
    const examYearParam = searchParams.get('examYear');
    const paperNameParam = searchParams.get('paperName');
    const examTypeParam = searchParams.get('examType');
    const sectionsParam = searchParams.get('sections');
    const questionStartParam = searchParams.get('questionStart');
    const questionEndParam = searchParams.get('questionEnd');
    const questionFilterParam = searchParams.get('questionFilter');

    if (examNameParam && examYearParam && paperNameParam && examTypeParam) {
      // Convert exam name to paper type
      const paperType = examNameToPaperType(examNameParam as ExamName);
      if (paperType) {
        setSelectedPaper(paperType);
        setSelectedYear(parseInt(examYearParam));
        setSelectedPaperName(paperNameParam);
        setSelectedExamType(examTypeParam as ExamType);
        
        // Set sections if provided
        if (sectionsParam) {
          const sections = sectionsParam.split(',').filter(Boolean) as PaperSection[];
          setSelectedSections(sections);
        }

        // Note: question filtering will be handled when starting the session
        // Store question filter in a ref or state if needed
        if (questionStartParam && questionEndParam) {
          // This will be used when calculating question range
          // We'll handle this in the start session logic
        }
      }
    }
  }, [searchParams]);

  // Load available sections when exam type is selected
  useEffect(() => {
    console.log('=== DEBUG SECTION LOADING TRIGGER ===');
    console.log('[plan] selections', { selectedPaper, selectedYear, selectedPaperName, selectedExamType });
    
    if (!selectedPaper || !selectedYear || !selectedPaperName || !selectedExamType) {
      console.log('Missing required fields, clearing sections');
      setAvailableSections([]);
      return;
    }

    const loadSections = async () => {
      console.log('[plan] Starting to load sections...');
      const examName = paperTypeToExamName(selectedPaper);
      if (!examName) {
        console.log('[plan] No exam name found');
        return;
      }
      
      setLoading(true);
      setError(null);
      try {
        // Get the paper to get its ID
        const paper = await getPaper(examName, selectedYear, selectedPaperName, selectedExamType);
        console.log('[plan] Paper found:', { id: paper?.id, found: !!paper });
        if (!paper) {
          console.log('[plan] No paper found');
          return;
        }
        
        // Get questions for this paper to extract unique part combinations
        const { getQuestions } = await import('@/lib/supabase/questions');
        const questions = await getQuestions(paper.id);
        
        // Extract unique part combinations (part_letter + part_name)
        const uniqueParts = [...new Set(
          questions.map(q => ({ partLetter: q.partLetter, partName: q.partName }))
            .map(part => JSON.stringify(part))
        )].map(partStr => JSON.parse(partStr));
        
        console.log('[plan] questions length:', questions.length);
        console.log('[plan] uniqueParts:', uniqueParts);
        console.log('[plan] Raw questions data sample:', questions.slice(0,10).map(q => ({ id: q.id, partLetter: q.partLetter, partName: q.partName })));
        
        // Use systematic section mapping instead of hardcoded logic
        const typeHint = `${selectedExamType ?? ''} ${selectedPaperName ?? ''}`;
        const availableSectionsForYear = getAvailableSectionsFromParts(
          uniqueParts, 
          selectedPaper, 
          selectedYear,
          typeHint
        );
        console.log('[plan] getAvailableSectionsFromParts result:', { availableSectionsForYear, typeHint });
        
        // Create part info mapping for display
        const partInfoMapping: Record<PaperSection, { partLetter: string; partName: string }> = {} as Record<PaperSection, { partLetter: string; partName: string }>;
        const tmuaSubjects: Partial<Record<TmuaSection, string>> = {};
        const tmuaSectionsEncountered = new Set<TmuaSection>();
        const totalQuestionsForPaper = questions.length;

        if (selectedPaper === "TMUA") {
          questions.forEach((question, index) => {
            const sectionName = deriveTmuaSectionFromQuestion(question as Question, index, totalQuestionsForPaper);
            if (sectionName === "Paper 1" || sectionName === "Paper 2") {
              tmuaSectionsEncountered.add(sectionName);
              const subject = (question.partName ?? "").trim();
              if (subject && !tmuaSubjects[sectionName]) {
                tmuaSubjects[sectionName] = subject;
              }
            }
          });
        }

        uniqueParts.forEach(part => {
          const section = mapPartToSection(part, selectedPaper);
          if (selectedPaper === "TMUA" && isTmuaSection(section)) {
            tmuaSectionsEncountered.add(section);
          }
          if (!partInfoMapping[section]) {
            if (selectedPaper === "TMUA" && isTmuaSection(section)) {
              const subjectFromPart = (part.partName ?? "").trim();
              const subject = tmuaSubjects[section] ?? normalizeTmuaSubject(subjectFromPart, section);
              partInfoMapping[section] = {
                partLetter: section,
                partName: subject
              };
            } else if (selectedPaper === "TMUA") {
              partInfoMapping[section] = {
                partLetter: section,
                partName: normalizeTmuaSubject(part.partName, section)
              };
            } else {
              partInfoMapping[section] = part;
            }
          }
        });

        if (selectedPaper === "TMUA") {
          TMUA_SECTIONS.forEach((sectionName) => {
            const subject = normalizeTmuaSubject(
              tmuaSubjects[sectionName] ?? partInfoMapping[sectionName]?.partName ?? "",
              sectionName
            );
            partInfoMapping[sectionName] = {
              partLetter: sectionName,
              partName: subject
            };
          });
        }
        
        console.log('[plan] Section generation summary', { selectedPaper, selectedYear, availableSectionsForYear, uniqueParts, partInfoMapping });
        
        if (selectedPaper === "TMUA") {
          const derivedSections = TMUA_SECTIONS.filter((sectionName) => tmuaSectionsEncountered.has(sectionName));
          const sectionsToUse = derivedSections.length === TMUA_SECTIONS.length ? derivedSections : [...TMUA_SECTIONS];
          setAvailableSections([...sectionsToUse]);
        } else {
          setAvailableSections(availableSectionsForYear);
        }
        setPartInfoMapping(partInfoMapping);
      } catch (err) {
        console.error('Error loading sections:', err);
        setError(err instanceof Error ? err.message : 'Failed to load sections');
      } finally {
        setLoading(false);
      }
    };
    
    loadSections();
  }, [selectedPaper, selectedYear, selectedPaperName, selectedExamType]);
  
  // State for actual question count from database
  const [actualQuestionCount, setActualQuestionCount] = useState<number>(0);
  const [questionImageUrls, setQuestionImageUrls] = useState<string[]>([]);
  
  // Load actual question count when paper is selected
  useEffect(() => {
    if (!selectedPaper || !selectedYear || !selectedPaperName || !selectedExamType) {
      setActualQuestionCount(0);
      return;
    }

    const loadQuestionCount = async () => {
      try {
        const examName = paperTypeToExamName(selectedPaper);
        if (!examName) return;
        
        const paper = await getPaper(examName, selectedYear, selectedPaperName, selectedExamType);
        if (!paper) return;
        
        console.log('[plan:paper-check] Paper loaded for question count', {
          paperId: paper.id,
          examName: paper.examName,
          examYear: paper.examYear,
          paperName: paper.paperName,
          examType: paper.examType,
        });

        // Check conversion table for this paper (primary lookup)
        let conversionTable = await getConversionTable(paper.id);
        let isFallback = false;
        
        // If no primary table found, try fallback: same exam, year, and exam type
        if (!conversionTable) {
          console.log('[plan:conversion-check] ⚠️ No primary conversion table found, trying fallback...', {
            paperId: paper.id,
            examName: paper.examName,
            examYear: paper.examYear,
            examType: paper.examType,
          });
          conversionTable = await findFallbackConversionTable(paper.examName as any, paper.examYear, paper.examType as any);
          if (conversionTable) {
            isFallback = true;
            console.log('[plan:conversion-check] ✅ Found fallback conversion table', {
              tableId: conversionTable.id,
              tablePaperId: conversionTable.paperId,
            });
          }
        }
        
        if (conversionTable) {
          const conversionRows = await getConversionRows(conversionTable.id);
          const partNames = [...new Set(conversionRows.map((r: any) => r.partName))];
          
          // Get the paper that this conversion table belongs to
          const { data: tablePaperCheck } = await supabase
            .from('papers')
            .select('id, exam_name, exam_year, paper_name, exam_type')
            .eq('id', conversionTable.paperId)
            .single();

          console.log('═══════════════════════════════════════════════════════════');
          console.log(`[plan:conversion-check] 📊 CONVERSION TABLE INFO ${isFallback ? '(FALLBACK)' : '(PRIMARY)'}`);
          console.log('═══════════════════════════════════════════════════════════');
          console.log('Selected Paper:', {
            paperId: paper.id,
            examName: paper.examName,
            examYear: paper.examYear,
            paperName: paper.paperName,
            examType: paper.examType,
            identifier: `${paper.examName} ${paper.examYear} ${paper.paperName} (${paper.examType})`,
          });
          console.log('');
          console.log('Conversion Table:', {
            tableId: conversionTable.id,
            tablePaperId: conversionTable.paperId,
            displayName: conversionTable.displayName,
            rowCount: conversionRows.length,
            uniquePartNames: partNames,
            isFallback: isFallback,
          });
          console.log('');
          console.log('Paper that conversion table belongs to:', tablePaperCheck ? {
            paperId: (tablePaperCheck as any).id,
            examName: (tablePaperCheck as any).exam_name,
            examYear: (tablePaperCheck as any).exam_year,
            paperName: (tablePaperCheck as any).paper_name,
            examType: (tablePaperCheck as any).exam_type,
            identifier: `${(tablePaperCheck as any).exam_name} ${(tablePaperCheck as any).exam_year} ${(tablePaperCheck as any).paper_name} (${(tablePaperCheck as any).exam_type})`,
          } : 'NOT FOUND');
          console.log('');
          console.log('Full Conversion Table (grouped by part):');
          const rowsByPart: Record<string, any[]> = {};
          conversionRows.forEach((r: any) => {
            const part = r.partName || 'Unknown';
            if (!rowsByPart[part]) rowsByPart[part] = [];
            rowsByPart[part].push(r);
          });
          Object.entries(rowsByPart).forEach(([partName, rows]) => {
            console.log(`  "${partName}":`, rows.map((r: any) => `${r.rawScore}→${r.scaledScore}`).join(', '));
          });
          console.log('═══════════════════════════════════════════════════════════');

          // Verify exam match
          if (tablePaperCheck && ((tablePaperCheck as any).exam_name || '').toUpperCase() !== (paper.examName || '').toUpperCase()) {
            console.error('❌ WARNING: Conversion table belongs to wrong exam!');
            console.error('   Selected:', paper.examName);
            console.error('   Table belongs to:', (tablePaperCheck as any).exam_name);
          }
        } else {
          console.log('[plan:conversion-check] ⚠️ No conversion table found (primary or fallback)', {
            paperId: paper.id,
            examName: paper.examName,
            identifier: `${paper.examName} ${paper.examYear} ${paper.paperName} (${paper.examType})`,
          });
        }
        
        // Get questions for this paper
        const { getQuestions } = await import('@/lib/supabase/questions');
        const questions = await getQuestions(paper.id);
        
        // Filter by selected sections if any
        let filteredQuestions = questions;
        if (selectedSections.length > 0) {
          if (selectedPaper === "TMUA") {
            const totalQuestionsForPaper = questions.length;
            filteredQuestions = questions.filter((q, index) => {
              const section = deriveTmuaSectionFromQuestion(q as Question, index, totalQuestionsForPaper);
              return selectedSections.includes(section);
            });
          } else {
            filteredQuestions = questions.filter(q => {
              // Use the systematic section mapping to determine if this question belongs to selected sections
              const questionSection = mapPartToSection(
                { partLetter: q.partLetter, partName: q.partName },
                selectedPaper
              );
              return selectedSections.includes(questionSection);
            });
          }
        }
        
        setActualQuestionCount(filteredQuestions.length);
        // Collect image URLs for prefetching
        const urls = filteredQuestions.map(q => q.questionImage).filter(Boolean) as string[];
        setQuestionImageUrls(urls);
      } catch (err) {
        console.error('Error loading question count:', err);
        setActualQuestionCount(0);
      }
    };
    
    loadQuestionCount();
  }, [selectedPaper, selectedYear, selectedPaperName, selectedExamType, selectedSections]);
  
  // Calculate session settings
  const sessionSettings = useMemo(() => {
    if (!selectedPaper || !selectedYear || !selectedPaperName || !selectedExamType) return null;
    
    // Check for question filter from URL params (roadmap)
    const questionStartParam = searchParams.get('questionStart');
    const questionEndParam = searchParams.get('questionEnd');
    const questionFilterParam = searchParams.get('questionFilter');
    
    // Use actual question count from database, fallback to defaults
    let totalQuestions = actualQuestionCount || 20;
    let questionStart = 1;
    let questionEnd = totalQuestions;
    
    // If question filter is provided, use it
    if (questionStartParam && questionEndParam) {
      questionStart = parseInt(questionStartParam);
      questionEnd = parseInt(questionEndParam);
      totalQuestions = questionEnd - questionStart + 1;
    }
    
    // Calculate time based on exam type
    let calculatedTime: number;
    if (selectedPaper === 'TMUA') {
      // TMUA: 75 minutes per section (Paper 1 or Paper 2)
      calculatedTime = selectedSections.length > 0 ? selectedSections.length * 75 : 75;
    } else {
      // Other exams: 1.5 minutes per question
      calculatedTime = Math.ceil(totalQuestions * 1.5);
    }
    
    return {
      totalQuestions,
      totalTime: userHasEditedTime ? (customTimeLimit || calculatedTime) : calculatedTime,
      questionStart,
      questionEnd,
      questionFilter: questionFilterParam ? questionFilterParam.split(',').map(Number) : undefined,
    };
  }, [selectedPaper, selectedYear, selectedPaperName, selectedExamType, selectedSections, customTimeLimit, actualQuestionCount, userHasEditedTime, searchParams]);
  
  // Wizard handlers
  const handlePaperTypeSelect = (paperType: PaperType) => {
    setSelectedPaper(paperType);
    setSelectedYear(null);
    setSelectedPaperName(null);
    setSelectedExamType(null);
    setSelectedSections([]);
    setSessionName("");
  };

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    setSelectedPaperName(null);
    setSelectedExamType(null);
    setSelectedSections([]);
  };

  const handlePaperNameSelect = (paperName: string) => {
    setSelectedPaperName(paperName);
    setSelectedExamType(null);
    setSelectedSections([]);
  };

  const handleExamTypeSelect = (examType: ExamType) => {
    setSelectedExamType(examType);
    setSelectedSections([]);
  };
  
  const handleSectionToggle = (section: PaperSection) => {
    console.log('=== DEBUG SECTION TOGGLE ===');
    console.log('Toggling section:', section);
    console.log('Current selected sections:', selectedSections);
    
    const newSections = selectedSections.includes(section) 
      ? selectedSections.filter(s => s !== section)
      : [...selectedSections, section];
    
    console.log('New selected sections:', newSections);
    setSelectedSections(newSections);
  };


  const handleTimeLimitChange = (time: number) => {
    setCustomTimeLimit(time);
    setUserHasEditedTime(true);
  };

  // Auto-generate session name
  useEffect(() => {
    if (selectedPaper && selectedYear && selectedPaperName && selectedExamType) {
      let name = `${selectedPaper} ${selectedYear} ${selectedPaperName} (${selectedExamType})`;
      if (selectedSections.length > 0) {
        const orderedNames = selectedSections.map(s => partInfoMapping[s]?.partName || s);
        name += ` - ${orderedNames.join(', ')}`;
      }
      name += ` - ${new Date().toLocaleDateString()}`;
      setSessionName(name);
    }
  }, [selectedPaper, selectedYear, selectedPaperName, selectedExamType, selectedSections, partInfoMapping]);
  
  const handleStartSession = async () => {
    if (isStartingSession) {
      return;
    }
    if (!selectedPaper || !selectedYear || !selectedPaperName || !selectedExamType || !sessionSettings) {
      alert("Please complete all required selections.");
      return;
    }
    
    // Check if sections are required (only if sections are available and none selected)
    if (availableSections.length > 0 && selectedSections.length === 0) {
      alert("Please select at least one section.");
      return;
    }
    
    try {
      setIsStartingSession(true);
      setError(null);
      
      // Get the paper from database to get the paperId
      const examName = paperTypeToExamName(selectedPaper);
      if (!examName) {
        throw new Error('Invalid paper type');
      }
      
      const paper = await getPaper(examName, selectedYear, selectedPaperName, selectedExamType);
      if (!paper) {
        throw new Error('Paper not found in database');
      }

      console.log('═══════════════════════════════════════════════════════════');
      console.log('[plan:paper-selected] 📄 PAPER LOADED');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('Paper Details:', {
        paperId: paper.id,
        examName: paper.examName,
        examYear: paper.examYear,
        paperName: paper.paperName,
        examType: paper.examType,
        fullIdentifier: `${paper.examName} ${paper.examYear} ${paper.paperName} (${paper.examType})`,
      });
      console.log('');

      // Check conversion table for this paper (primary lookup)
      console.log('[plan:conversion] 🔍 Checking conversion table for paper ID:', paper.id);
      let conversionTable = await getConversionTable(paper.id);
      let isFallback = false;
      
      // If no primary table found, try fallback: same exam, year, and exam type
      if (!conversionTable) {
        console.log('[plan:conversion] ⚠️ No primary conversion table found, trying fallback...', {
          paperId: paper.id,
          examName: paper.examName,
          examYear: paper.examYear,
          examType: paper.examType,
        });
        conversionTable = await findFallbackConversionTable(paper.examName as any, paper.examYear, paper.examType as any);
        if (conversionTable) {
          isFallback = true;
          console.log('[plan:conversion] ✅ Found fallback conversion table', {
            tableId: conversionTable.id,
            tablePaperId: conversionTable.paperId,
          });
        }
      }
      
      if (conversionTable) {
        const conversionRows = await getConversionRows(conversionTable.id);
        const partNames = [...new Set(conversionRows.map((r: any) => r.partName))];
        
        // Get the paper that this conversion table belongs to
        const { data: tablePaperCheck } = await supabase
          .from('papers')
          .select('id, exam_name, exam_year, paper_name, exam_type')
          .eq('id', conversionTable.paperId)
          .single();

        console.log('═══════════════════════════════════════════════════════════');
        console.log(`[plan:conversion] ✅ CONVERSION TABLE FOUND ${isFallback ? '(FALLBACK)' : '(PRIMARY)'}`);
        console.log('═══════════════════════════════════════════════════════════');
        console.log('Conversion Table Details:', {
          tableId: conversionTable.id,
          tablePaperId: conversionTable.paperId,
          displayName: conversionTable.displayName,
          sourcePdfUrl: conversionTable.sourcePdfUrl,
          notes: conversionTable.notes,
          isFallback: isFallback,
        });
        console.log('');
        console.log('Paper that this conversion table belongs to:', tablePaperCheck ? {
          paperId: (tablePaperCheck as any).id,
          examName: (tablePaperCheck as any).exam_name,
          examYear: (tablePaperCheck as any).exam_year,
          paperName: (tablePaperCheck as any).paper_name,
          examType: (tablePaperCheck as any).exam_type,
          fullIdentifier: `${(tablePaperCheck as any).exam_name} ${(tablePaperCheck as any).exam_year} ${(tablePaperCheck as any).paper_name} (${(tablePaperCheck as any).exam_type})`,
        } : 'NOT FOUND');
        console.log('');
        console.log('Conversion Table Statistics:', {
          totalRows: conversionRows.length,
          uniquePartNames: partNames,
          partNameCount: partNames.length,
        });
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📊 FULL CONVERSION TABLE DATA:');
        console.log('═══════════════════════════════════════════════════════════');
        
        // Group rows by part name for better readability
        const rowsByPart: Record<string, any[]> = {};
        conversionRows.forEach((r: any) => {
          const part = r.partName || 'Unknown';
          if (!rowsByPart[part]) rowsByPart[part] = [];
          rowsByPart[part].push(r);
        });

        Object.entries(rowsByPart).forEach(([partName, rows]) => {
          console.log(`\n📋 Part: "${partName}" (${rows.length} rows)`);
          console.table(rows.map((r: any) => ({
            Raw: r.rawScore,
            Scaled: r.scaledScore,
          })));
        });

        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🔍 VERIFICATION:');
        console.log('═══════════════════════════════════════════════════════════');

        if (tablePaperCheck) {
          const tableExamName = ((tablePaperCheck as any).exam_name || '').toUpperCase();
          const paperExamName = (paper.examName || '').toUpperCase();
          
          if (tableExamName !== paperExamName) {
            console.error('❌ CRITICAL ERROR: Conversion table belongs to WRONG EXAM!');
            console.error('   Selected Paper:', {
              paperId: paper.id,
              examName: paperExamName,
              identifier: `${paper.examName} ${paper.examYear} ${paper.paperName}`,
            });
            console.error('   Conversion Table Paper:', {
              paperId: (tablePaperCheck as any).id,
              examName: tableExamName,
              identifier: `${(tablePaperCheck as any).exam_name} ${(tablePaperCheck as any).exam_year} ${(tablePaperCheck as any).paper_name}`,
            });
            console.error('   This conversion table should NOT be used for this paper!');
          } else {
            console.log('✅ Conversion table verified - belongs to correct exam');
            console.log('   Exam:', tableExamName);
            console.log('   Paper ID match:', conversionTable.paperId === paper.id ? '✅ YES' : '❌ NO');
            if (isFallback) {
              console.log('   ⚠️ Using fallback table (different paper, same exam/year/type)');
            }
          }
        } else {
          console.warn('⚠️ Could not verify conversion table paper (paper not found in database)');
        }
        console.log('═══════════════════════════════════════════════════════════');
      } else {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('[plan:conversion] ⚠️ NO CONVERSION TABLE FOUND (PRIMARY OR FALLBACK)');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('Paper Details:', {
          paperId: paper.id,
          examName: paper.examName,
          examYear: paper.examYear,
          paperName: paper.paperName,
          examType: paper.examType,
          fullIdentifier: `${paper.examName} ${paper.examYear} ${paper.paperName} (${paper.examType})`,
        });
        console.log('═══════════════════════════════════════════════════════════');
      }

      const variantString = `${selectedYear}-${selectedPaperName}-${selectedExamType}`;

      console.log('[plan:startSession] Starting session with:', {
        paperId: paper.id,
        paperName: selectedPaper,
        selectedSections,
        timeLimitMinutes: sessionSettings.totalTime,
        questionRange: {
          start: sessionSettings.questionStart,
          end: sessionSettings.questionEnd,
        },
        actualQuestionCount,
      });

      startSession({
        paperId: paper.id,
        paperName: selectedPaper,
        paperVariant: variantString,
        sessionName: sessionName.trim() || `${selectedPaper} ${selectedYear} ${selectedPaperName} - ${new Date().toLocaleString()}`,
        timeLimitMinutes: sessionSettings.totalTime,
        questionRange: {
          start: sessionSettings.questionStart,
          end: sessionSettings.questionEnd,
        },
        selectedSections: selectedSections.length > 0 ? selectedSections : undefined,
      });

      await loadQuestions(paper.id);
      
      // Verify questions were loaded correctly
      const { questions: loadedQuestions } = usePaperSessionStore.getState();
      console.log('[plan:startSession] After loadQuestions:', {
        questionsLoaded: loadedQuestions.length,
        expectedCount: actualQuestionCount,
        selectedSections,
        sampleQuestions: loadedQuestions.slice(0, 5).map(q => ({
          num: q.questionNumber,
          partLetter: q.partLetter,
          partName: q.partName,
        })),
      });

      const { questions, questionsError } = usePaperSessionStore.getState();
      if (questionsError) {
        throw new Error(questionsError);
      }

      if (!questions || questions.length === 0) {
        throw new Error('No questions were returned for this paper selection.');
      }

      router.push("/papers/solve");
    } catch (err) {
      console.error('Failed to start session', err);
      setError(err instanceof Error ? err.message : 'Failed to start session');
    } finally {
      setIsStartingSession(false);
    }
  };
  
  const canStart = Boolean(selectedPaper && selectedYear && selectedPaperName && selectedExamType && sessionSettings && 
    (availableSections.length === 0 || selectedSections.length > 0));
  const showPaperSelection = Boolean(selectedYear && !isTmuaSelected);
  const showExamTypeSelection = Boolean(selectedYear && availableExamTypes.length > 0);
  const showSectionSelection = availableSections.length > 0;
  let dynamicStepNumber = 2;
  const paperStepNumber = showPaperSelection ? dynamicStepNumber + 1 : null;
  if (showPaperSelection) {
    dynamicStepNumber += 1;
  }
  const examTypeStepNumber = showExamTypeSelection ? dynamicStepNumber + 1 : null;
  if (showExamTypeSelection && !isTmuaSelected) {
    dynamicStepNumber += 1;
  }
  const sectionStepNumber = showSectionSelection ? (isTmuaSelected ? 3 : dynamicStepNumber + 1) : null;
  
  return (
    <Container size="lg">
      <div className="space-y-6 min-h-screen">
        {/* Resume banner if unfinished session exists */}
        {sessionId && deadline && !endedAt && (
          <div className="rounded-organic-md p-4 flex items-center gap-3" style={{ backgroundColor: '#506141' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
              <svg className="w-4 h-4" style={{ color: '#ffffff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold" style={{ color: '#ffffff' }}>Resume session?</div>
              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.9)' }}>
                {existingSessionName || 'Previous session'} is still active. You can resume where you left off.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/papers/solve')}
                className="px-4 py-2 rounded-organic-md text-sm font-medium"
                style={{ backgroundColor: '#ffffff', color: '#000000' }}
              >
                Resume
              </button>
              <button
                onClick={() => resetSession()}
                className="px-3 py-2 rounded-organic-md text-sm font-medium"
                style={{ backgroundColor: 'transparent', color: '#ffffff' }}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        {/* Header */}
        <PageHeader
          title="Paper Session Setup"
          description="Follow the steps below to set up your paper session."
        />

        {/* Error Display */}
        {error && (
          <Card className="p-4 bg-red-500/10 border-red-500/20 mb-6">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-red-400">Error loading papers</p>
                <p className="text-xs text-red-400/80 mt-1">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Step 1: Choose Paper Type */}
        <StepCard 
          number={1} 
          title="Choose Paper Type" 
          completed={!!selectedPaper}
        >
          
            <div className="grid grid-cols-6 gap-3">
            {(() => {
              // Include all available exam names plus PAT and Custom (OTHER)
              const allPaperTypes: PaperType[] = [
                ...availableExamNames.map(examName => examNameToPaperType(examName)).filter((pt): pt is PaperType => pt !== null),
                ...(availableExamNames.includes("PAT") ? [] : ["PAT" as PaperType]),
                "OTHER" as PaperType
              ];
              
              // Remove duplicates
              const uniquePaperTypes = Array.from(new Set(allPaperTypes));
              
              return uniquePaperTypes.map((paperType) => {
                const isAvailable = availableExamNames.includes(paperType as ExamName);
                const isComingSoon = !isAvailable && paperType === "PAT";
                const paperConfig = getPaperTypeConfig(paperType);
                const fullName = paperType === 'OTHER' ? 'Custom Paper' : (paperConfig?.fullName || paperType);
                const displayLabel = paperType === 'OTHER' ? 'Custom' : paperType;
                
                const getCardStyles = (paper: PaperType) => {
                  switch (paper) {
                    case "ESAT":
                      return {
                        bg: "bg-primary/10",
                        border: "border-primary/30",
                        icon: "bg-primary/20",
                        iconColor: "text-primary",
                        selectedBg: "bg-[#3e4f52]",
                        selectedBorder: "border-[#3e4f52]"
                      };
                    case "TMUA":
                      return {
                        bg: "bg-purple-500/10",
                        border: "border-purple-500/30",
                        icon: "bg-purple-500/20",
                        iconColor: "text-purple-400",
                        selectedBg: "bg-[#2f2835]",
                        selectedBorder: "border-[#2f2835]"
                      };
                    case "NSAA":
                      return {
                        bg: "bg-cyan-500/10",
                        border: "border-cyan-500/30",
                        icon: "bg-cyan-500/20",
                        iconColor: "text-cyan-400",
                        selectedBg: "bg-[#444e3c]",
                        selectedBorder: "border-[#444e3c]"
                      };
                    case "ENGAA":
                      return {
                        bg: "bg-amber-500/10",
                        border: "border-amber-500/30",
                        icon: "bg-amber-500/20",
                        iconColor: "text-amber-400",
                        selectedBg: "bg-[#967c5f]",
                        selectedBorder: "border-[#967c5f]"
                      };
                    case "PAT":
                      return {
                        bg: "bg-rose-500/10",
                        border: "border-rose-500/30",
                        icon: "bg-rose-500/20",
                        iconColor: "text-rose-400",
                        selectedBg: "bg-[#854952]",
                        selectedBorder: "border-[#854952]"
                      };
                  case "MAT":
                    return {
                      bg: "bg-indigo-500/10",
                      border: "border-indigo-500/30",
                      icon: "bg-indigo-500/20",
                      iconColor: "text-indigo-400",
                      selectedBg: "bg-[#3e4f52]",
                      selectedBorder: "border-[#3e4f52]"
                      };
                    default:
                      return {
                        bg: "bg-neutral-500/10",
                        border: "border-neutral-500/30",
                        icon: "bg-neutral-500/20",
                        iconColor: "text-neutral-400",
                        selectedBg: "bg-[#3e4f52]",
                        selectedBorder: "border-[#3e4f52]"
                      };
                  }
                };

                const selectedHex = getPaperTypeColor(paperType);
                const isSelected = selectedPaper === paperType;

                return (
                  <button
                    key={paperType}
                    onClick={() => {
                      if (isComingSoon) {
                        alert('PAT is coming soon.');
                        return;
                      }
                      if (paperType === 'OTHER') {
                        router.push('/papers/browse');
                        return;
                      }
                      handlePaperTypeSelect(paperType);
                    }}
                    className={cn(
                      "relative p-3 rounded-organic-md transition-all duration-fast ease-signature text-center min-h-[100px] outline-none focus:outline-none",
                      "interaction-scale",
                      !isSelected ? "bg-white/5 hover:bg-white/10" : ""
                    )}
                    style={isSelected ? { backgroundColor: selectedHex } : undefined}
                  >
                      <div className="space-y-1.5">
                        {/* Icon */}
                        <div className="flex items-center justify-center">
                          <div
                            className="w-7 h-7 rounded-organic-md flex items-center justify-center"
                            style={{ backgroundColor: selectedHex }}
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              style={{ color: "#ffffff" }}
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        </div>
                      
                      <div className="text-lg font-bold text-neutral-100">{displayLabel}</div>
                      <div className={cn("text-xs text-center leading-tight", isSelected ? "text-white" : "text-neutral-400")}>
                        {fullName}
                      </div>
                      {isComingSoon && (
                        <div className="text-xs text-center mt-1 text-amber-400 font-medium">
                          Coming Soon
                        </div>
                      )}
                    </div>
                  </button>
                );
              });
            })()}
            </div>
        </StepCard>

        {/* Step 2: Choose Year */}
        <StepCard 
          number={2} 
          title="Choose Year" 
          completed={!!selectedYear}
          disabled={!selectedPaper}
        >
          <div className="min-h-[88px]">
          <YearSelector 
              years={availableYears.map(y => y.toString())}
              selectedYear={selectedYear?.toString() || null}
              onYearSelect={(year) => handleYearSelect(parseInt(year))}
            />
          </div>
        </StepCard>

        {/* Steps 3 & 4 side-by-side when both present */}
        {selectedYear && (
          !isTmuaSelected ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {showPaperSelection && paperStepNumber && (
          <StepCard 
                  number={paperStepNumber} 
          title="Choose Paper" 
          completed={!!selectedPaperName}
            disabled={!selectedYear}
          >
          <div className="min-h-[80px]">
            <div className="flex flex-wrap gap-2">
              {availablePaperNames.map((paperName) => (
                <button
                  key={paperName}
                  onClick={() => handlePaperNameSelect(paperName)}
                  className={cn(
                    "px-4 py-2 rounded-organic-md transition-all duration-fast ease-signature outline-none focus:outline-none",
                        "interaction-scale",
                    selectedPaperName === paperName ? "" : "bg-white/5 hover:bg-white/10"
                  )}
                      style={selectedPaperName === paperName ? { backgroundColor: "#506141" } : undefined}
                >
                  <span className="font-medium text-neutral-100">{paperName}</span>
                </button>
              ))}
            </div>
          </div>
        </StepCard>
              )}

              {showExamTypeSelection && examTypeStepNumber && (
          <StepCard 
                  number={examTypeStepNumber} 
            title="Choose Exam Type" 
            completed={!!selectedExamType}
            disabled={!selectedPaperName}
          >
            <div className="min-h-[80px]">
              <div className="flex flex-wrap gap-2">
                {availableExamTypes.map((examType) => (
                  <button
                    key={examType}
                    onClick={() => handleExamTypeSelect(examType)}
                    className={cn(
                    "px-4 py-2 rounded-organic-md transition-all duration-fast ease-signature outline-none focus:outline-none",
                          "interaction-scale",
                      selectedExamType === examType ? "" : "bg-white/5 hover:bg-white/10"
                    )}
                        style={selectedExamType === examType ? { backgroundColor: "#506141" } : undefined}
                  >
                    <span className="font-medium text-neutral-100">{examType}</span>
                </button>
              ))}
              </div>
            </div>
          </StepCard>
            )}
          </div>
          ) : (
            showExamTypeSelection && examTypeStepNumber && (
              <StepCard 
                number={examTypeStepNumber} 
                title="Choose Exam Type" 
                completed={!!selectedExamType}
              >
                <div className="min-h-[80px]">
                  <div className="flex flex-wrap gap-2">
                    {availableExamTypes.map((examType) => (
                      <button
                        key={examType}
                        onClick={() => handleExamTypeSelect(examType)}
                        className={cn(
                          "px-4 py-2 rounded-organic-md transition-all duration-fast ease-signature outline-none focus:outline-none",
                          "interaction-scale",
                          selectedExamType === examType ? "" : "bg-white/5 hover:bg-white/10"
                        )}
                        style={selectedExamType === examType ? { backgroundColor: "#506141" } : undefined}
                      >
                        <span className="font-medium text-neutral-100">{examType}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </StepCard>
            )
          )
        )}

        {/* Step 5: Choose Sections (Conditional) */}
        {showSectionSelection && sectionStepNumber && (
          <StepCard 
            number={sectionStepNumber} 
            title="Choose Sections" 
            completed={selectedSections.length > 0}
            disabled={showExamTypeSelection && !selectedExamType}
          >
            <div className="min-h-[120px]">
            <SectionSelector 
              sections={availableSections}
              selectedSections={selectedSections}
              onSectionToggle={handleSectionToggle}
              maxSelections={selectedPaper === "NSAA" ? 3 : undefined}
              warningMessage={selectedPaper === "NSAA" ? "Are you sure? Typically NSAA covers 3 sections per student. You can choose more if you're certain." : undefined}
              showPartInfo={true}
              partInfo={partInfoMapping}
            />
            </div>
          </StepCard>
        )}

        {/* Session Summary */}
        {sessionSettings && (
          <SessionSummary
            sessionData={{
              paperType: selectedPaper!,
              year: selectedYear!.toString(),
              variant: selectedPaperName || undefined,
              sections: selectedSections,
              totalQuestions: sessionSettings.totalQuestions,
              timeLimit: sessionSettings.totalTime,
              sessionName: sessionName,
            }}
            onSessionNameChange={setSessionName}
            onTimeLimitChange={handleTimeLimitChange}
            onSectionReorder={(sections) => {
              // Update the selected sections with the new order
              setSelectedSections(sections);
            }}
            onStartSession={handleStartSession}
            canStart={canStart && !loading}
            partInfo={partInfoMapping}
            prefetchUrls={questionImageUrls}
          />
        )}
        
        {/* Loading Overlay */}
        {/* Loading overlay removed for instantaneous transitions */}
      </div>
    </Container>
  );
}