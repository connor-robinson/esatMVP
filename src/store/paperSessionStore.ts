/**
 * Zustand store for paper session state management
 * 
 * SECTION TRACKING:
 * =================
 * Each paper session tracks which sections were attempted via the `selectedSections` array.
 * This array is saved to the database in the `selected_sections` field when the session is persisted.
 * 
 * Completion Detection:
 * - A section is considered "completed" if there exists a session where:
 *   1. `ended_at IS NOT NULL` (session was finished)
 *   2. The section name appears in the `selected_sections` array
 *   3. The session's `paper_variant` matches the paper being checked
 * 
 * Session ID:
 * - Each session gets a unique UUID via `crypto.randomUUID()` when started
 * - This ensures multiple attempts of the same paper are tracked separately
 * - The session ID is used as the primary key in the database
 * 
 * Persistence:
 * - Sessions are automatically persisted to the server via `persistSessionToServer()`
 * - This happens on a debounced schedule (800ms) or immediately when the session ends
 * - The `selectedSections` array is included in every persistence call
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { mapPartToSection, deriveTmuaSectionFromQuestion, isTmuaSection } from '@/lib/papers/sectionMapping';
import { cropImageToContent } from '@/lib/utils/imageCrop';
import type { Answer, Letter, MistakeTag, PaperSection, Question, ExamName, ExamType } from '@/types/papers';
import { saveSession, loadSession, deleteSession } from '@/lib/storage/sessionStorage';
import { generatePartIdsFromSections, generatePartIdFromRoadmapPart } from '@/lib/papers/partIdUtils';
import { examNameToPaperType } from '@/lib/papers/paperConfig';

interface PaperSessionState {
  // Session data
  sessionId: string | null; // Unique UUID for this session attempt
  paperId: number | null;
  paperName: string;
  paperVariant: string; // Format: "{year}-{paperName}-{examType}"
  sessionName: string;
  timeLimitMinutes: number;
  questionRange: { start: number; end: number };
  selectedSections: PaperSection[]; // Array of section names attempted in this session
  selectedPartIds: string[]; // Array of part IDs for granular tracking
  
  // Questions data
  questions: Question[];
  questionsLoading: boolean;
  questionsError: string | null;
  questionOrder: number[];
  
  // Current state
  currentQuestionIndex: number;
  answers: Answer[];
  perQuestionSec: number[];
  correctFlags: (boolean | null)[];
  guessedFlags: boolean[];
  reviewFlags: boolean[];
  mistakeTags: MistakeTag[];
  visitedQuestions: boolean[];
  // Section boundaries for quick nav headers
  sectionStarts: Record<number, string>;
  
  // Section-based flow state
  currentSectionIndex: number;
  sectionTimeLimits: number[];
  sectionInstructionTimer: number | null; // Remaining seconds on instruction timer
  sectionInstructionDeadline: number | null; // When instruction timer expires
  instructionTimerStartedAt: number | null; // When current instruction timer started
  currentPipelineState: "instruction" | "section"; // Current pipeline position
  allSectionsQuestions: Question[][];
  sectionDeadlines: number[]; // Deadline timestamp for each section
  sectionStartTimes: number[]; // Start timestamp for each section
  
  // Timing
  startedAt: number | null;
  endedAt: number | null;
  deadline: number | null;
  
  // Session persistence state
  lastActiveTimestamp: number | null; // When user was last active
  sectionElapsedTimes: number[]; // Elapsed time per section in milliseconds (only active time, not instruction pages)
  isPaused: boolean; // Whether session is currently paused
  pausedAt: number | null; // Timestamp when paused
  isRestoring: boolean; // Whether session is currently being restored from IndexedDB
  
  // Session notes
  notes: string;

  sessionPersistPromise: Promise<unknown> | null;
  persistTimer: ReturnType<typeof setTimeout> | null;
  
  // Actions
  startSession: (config: {
    paperId: number;
    paperName: string;
    paperVariant: string;
    sessionName: string;
    timeLimitMinutes: number;
    questionRange: { start: number; end: number };
    selectedSections?: PaperSection[];
    selectedPartIds?: string[]; // Optional: if provided, use directly; otherwise generate from selectedSections
    questionOrder?: number[];
  }) => void;
  
  loadQuestions: (paperId: number) => Promise<void>;
  
  setAnswer: (questionIndex: number, choice: Letter) => void;
  setOther: (questionIndex: number, other: string) => void;
  setCorrectChoice: (questionIndex: number, choice: Letter | null) => void;
  setExplanation: (questionIndex: number, explanation: string) => void;
  setAddToDrill: (questionIndex: number, addToDrill: boolean) => void;
  setCorrectFlag: (questionIndex: number, correct: boolean | null) => void;
  setGuessedFlag: (questionIndex: number, guessed: boolean) => void;
  setReviewFlag: (questionIndex: number, flagged: boolean) => void;
  setMistakeTag: (questionIndex: number, tag: MistakeTag) => void;
  
  navigateToQuestion: (index: number) => void;
  incrementTime: (questionIndex: number) => void;
  
  setDeadline: (deadline: number | null) => void;
  setEndedAt: (endedAt: number | null) => void;
  setNotes: (notes: string) => void;
  
  resetSession: () => void;
  
  // Computed getters
  getTotalQuestions: () => number;
  getCorrectCount: () => number;
  getRemainingTime: () => number;
  
  // Section management actions
  setCurrentSectionIndex: (index: number) => void;
  setSectionInstructionTimer: (seconds: number) => void;
  getCurrentSectionQuestions: () => Question[];
  getSectionTimeLimit: (sectionIndex: number) => number;
  calculateSectionTimeLimits: () => void;
  setSectionStartTime: (sectionIndex: number, startTime: number) => void;
  getSectionRemainingTime: (sectionIndex: number) => number;

  schedulePersist: () => void;
  persistSessionToServer: (options?: { immediate?: boolean }) => Promise<void>;
  
  loadSessionFromDatabase: (sessionId: string) => Promise<void>;
  
  // Session persistence actions
  updateLastActiveTimestamp: () => void;
  updateTimerState: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  saveSessionToIndexedDB: () => Promise<void>;
  loadSessionFromIndexedDB: (sessionId: string) => Promise<void>;
}

const initialAnswer = (): Answer => ({
  choice: null,
  other: '',
  correctChoice: null,
  explanation: '',
  addToDrill: false,
});

export const usePaperSessionStore = create<PaperSessionState>()(
  persist(
    (set, get) => ({
      // Initial state
      sessionId: null,
      paperId: null,
      paperName: '',
      paperVariant: '',
      sessionName: '',
      timeLimitMinutes: 60,
      questionRange: { start: 1, end: 20 },
      selectedSections: [],
      selectedPartIds: [],
      
      questions: [],
      questionsLoading: false,
      questionsError: null,
      questionOrder: [],
      
      currentQuestionIndex: 0,
      answers: [],
      perQuestionSec: [],
      correctFlags: [],
      guessedFlags: [],
      reviewFlags: [],
      mistakeTags: [],
      visitedQuestions: [],
      sectionStarts: {},
      currentSectionIndex: 0,
      sectionTimeLimits: [],
      sectionInstructionTimer: null,
      sectionInstructionDeadline: null,
      instructionTimerStartedAt: null,
      currentPipelineState: "section",
      allSectionsQuestions: [],
      sectionDeadlines: [],
      sectionStartTimes: [],
      
      startedAt: null,
      endedAt: null,
      deadline: null,
      
      lastActiveTimestamp: null,
      sectionElapsedTimes: [],
      isPaused: false,
      pausedAt: null,
      isRestoring: false,
      
      notes: '',
      sessionPersistPromise: null,
      persistTimer: null,
      
      // Actions
      /**
       * Start a new paper session
       * 
       * Creates a unique session ID and initializes all session state.
       * The selectedSections array is set from the config and will be
       * persisted to track which sections were attempted.
       * 
       * @param config.selectedSections - Array of section names to track for this session
       *                                  This is used later to determine completion status
       */
      startSession: (config) => {
        const totalQuestions = config.questionRange.end - config.questionRange.start + 1;
        // Generate unique UUID for this session attempt
        // This ensures multiple attempts of the same paper are tracked separately
        const sessionId = crypto.randomUUID();
        const startedAt = Date.now();
        const deadline = startedAt + config.timeLimitMinutes * 60 * 1000;
        const selectedSections = config.selectedSections || [];
        
        // Generate part IDs from selected sections or use provided ones
        let selectedPartIds: string[] = [];
        if (config.selectedPartIds) {
          // Use provided part IDs (from roadmap)
          selectedPartIds = config.selectedPartIds;
        } else if (selectedSections.length > 0) {
          // Generate part IDs from selected sections (from library)
          // Parse paperVariant: "{year}-{paperName}-{examType}"
          const variantParts = config.paperVariant.split('-');
          if (variantParts.length >= 3) {
            const year = variantParts[0];
            const paperName = variantParts.slice(1, -1).join('-'); // Handle multi-part paper names
            const examType = variantParts[variantParts.length - 1] as ExamType;
            const examName = config.paperName as ExamName;
            
            selectedPartIds = generatePartIdsFromSections(
              examName,
              year,
              paperName,
              selectedSections,
              examType
            );
          }
        }
        
        set({
          sessionId, // Unique identifier for this session
          paperId: config.paperId,
          paperName: config.paperName,
          paperVariant: config.paperVariant,
          sessionName: config.sessionName,
          timeLimitMinutes: config.timeLimitMinutes,
          questionRange: config.questionRange,
          selectedSections, // Sections attempted in this session
          selectedPartIds, // Part IDs for granular tracking
          questionOrder: config.questionOrder || Array.from({ length: totalQuestions }, (_, i) => i + 1),
          currentQuestionIndex: 0,
          answers: Array.from({ length: totalQuestions }, initialAnswer),
          perQuestionSec: Array.from({ length: totalQuestions }, () => 0),
          correctFlags: Array.from({ length: totalQuestions }, () => null),
          guessedFlags: Array.from({ length: totalQuestions }, () => false),
          reviewFlags: Array.from({ length: totalQuestions }, () => false),
          mistakeTags: Array.from({ length: totalQuestions }, () => 'None' as MistakeTag),
          visitedQuestions: Array.from({ length: totalQuestions }, () => false),
          startedAt,
          endedAt: null,
          deadline,
          lastActiveTimestamp: startedAt,
          sectionElapsedTimes: Array.from({ length: selectedSections.length }, () => 0),
          isPaused: false,
          pausedAt: null,
          notes: '',
          // Clear questions when starting new session to ensure fresh load
          questions: [],
          questionsLoading: false,
          questionsError: null,
          sessionPersistPromise: null,
          // Reset section-related state
          currentSectionIndex: 0,
          sectionInstructionTimer: null,
          sectionInstructionDeadline: null,
          instructionTimerStartedAt: null,
          currentPipelineState: "section",
          allSectionsQuestions: [],
          sectionTimeLimits: [],
          sectionDeadlines: [],
          sectionStartTimes: [],
          sectionStarts: {},
        });

        const payload = {
          id: sessionId,
          paperId: config.paperId,
          paperName: config.paperName,
          paperVariant: config.paperVariant,
          sessionName: config.sessionName,
          questionRange: config.questionRange,
          selectedSections: config.selectedSections || [],
          selectedPartIds: selectedPartIds, // Part IDs for granular tracking
          questionOrder: config.questionOrder || Array.from({ length: totalQuestions }, (_, i) => i + 1),
          timeLimitMinutes: config.timeLimitMinutes,
          startedAt,
          deadlineAt: deadline,
          perQuestionSec: Array.from({ length: totalQuestions }, () => 0),
          answers: Array.from({ length: totalQuestions }, initialAnswer),
          correctFlags: Array.from({ length: totalQuestions }, () => null as boolean | null),
          guessedFlags: Array.from({ length: totalQuestions }, () => false),
          reviewFlags: Array.from({ length: totalQuestions }, () => false),
          mistakeTags: Array.from({ length: totalQuestions }, () => 'None' as MistakeTag),
          notes: '',
          score: null,
        };

        const createPromise = fetch("/api/papers/sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // Ensure cookies are sent
          body: JSON.stringify(payload),
        })
          .then(async (response) => {
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              if (response.status === 401) {
                // User not authenticated - session will work locally but won't be saved to server
                console.warn("[papers] Session creation skipped: User not authenticated. Session will work locally.");
                return;
              }
              throw new Error(errorData.error || "Failed to create paper session");
            }
          })
          .catch((error) => {
            // Only log non-401 errors as errors, 401 is expected for unauthenticated users
            if (!error.message?.includes("401") && !error.message?.includes("not authenticated")) {
              console.error("[papers] failed to create session", error);
            }
          })
          .finally(() => {
            set((state) => {
              if (state.sessionPersistPromise === createPromise) {
                return { sessionPersistPromise: null };
              }
              return {};
            });
          });

        set({ sessionPersistPromise: createPromise });
      },
      
          loadQuestions: async (paperId) => {
            console.log('=== DEBUG loadQuestions START ===');
            console.log('paperId:', paperId);
            
            set({ questionsLoading: true, questionsError: null });

            try {
              const state = get();
              console.log('Current state selectedSections:', state.selectedSections);
              console.log('Current state paperId:', state.paperId);
              console.log('Current state paperName:', state.paperName);
              
              // IMPORTANT: getQuestions() only returns REAL exam questions from past papers
              // It queries the 'questions' table, NOT 'ai_generated_questions'
              // No fake or simulated questions are used here
              const { getQuestions } = await import('@/lib/supabase/questions');
              const allQuestions = await getQuestions(paperId);
              console.log('Loaded all questions count:', allQuestions.length);
              console.log('First question:', allQuestions[0]);
              console.log('Sample question partNames:', allQuestions.slice(0, 5).map(q => ({ num: q.questionNumber, part: q.partName })));
              
              // Verify exam_type - warn if Specimen when we expect Official
              if (allQuestions.length > 0) {
                const examType = allQuestions[0].examType?.toLowerCase();
                const examName = allQuestions[0].examName;
                const examYear = allQuestions[0].examYear;
                console.log('[loadQuestions] Paper type check:', { examName, examYear, examType, paperId });
                
                if (examType === 'specimen') {
                  console.warn('[loadQuestions] ⚠️ WARNING: Loading Specimen paper instead of Official!', {
                    examName,
                    examYear,
                    paperId,
                    paperName: state.paperName
                  });
                }
              }
              
              const isTmuaPaper = state.paperName === 'TMUA';
              const totalQuestions = allQuestions.length;
              const sectionByQuestionId = new Map<number, string>();

              // Build section mapping for all questions
              allQuestions.forEach((question, index) => {
                let section: string;
                if (isTmuaPaper) {
                  // For TMUA, try mapPartToSection first, then fall back to deriveTmuaSectionFromQuestion
                  const mappedSection = mapPartToSection(
                    { partLetter: (question as any).partLetter || '', partName: question.partName || '' },
                    'TMUA'
                  );
                  // If mapPartToSection returns a valid TMUA section, use it; otherwise use deriveTmuaSectionFromQuestion
                  if (mappedSection === 'Paper 1' || mappedSection === 'Paper 2') {
                    section = mappedSection;
                  } else {
                    section = deriveTmuaSectionFromQuestion(question, index, totalQuestions);
                  }
                } else {
                  section = mapPartToSection({ partLetter: (question as any).partLetter, partName: question.partName }, state.paperName as any);
                }
                sectionByQuestionId.set(question.id, section);
              });

              // Debug: Log section distribution
              if (isTmuaPaper && state.selectedSections.length > 0) {
                const sectionCounts = new Map<string, number>();
                allQuestions.forEach(q => {
                  const section = sectionByQuestionId.get(q.id) || 'Unknown';
                  sectionCounts.set(section, (sectionCounts.get(section) || 0) + 1);
                });
                console.log('[loadQuestions] TMUA Section distribution:', Object.fromEntries(sectionCounts));
                console.log('[loadQuestions] Selected sections:', state.selectedSections);
              }

              // Filter questions by question range first (if specified)
              let filteredQuestions = allQuestions;
              if (state.questionRange.start > 1 || state.questionRange.end < allQuestions.length) {
                console.log('Filtering questions by range:', state.questionRange);
                filteredQuestions = allQuestions.filter(q => 
                  q.questionNumber >= state.questionRange.start && 
                  q.questionNumber <= state.questionRange.end
                );
                console.log('Filtered by range:', filteredQuestions.length);
              }
              
              // CRITICAL: Filter out invalid parts BEFORE section filtering
              // For NSAA 2019: should only have Part A, B, E (not C, D, or SECTION)
              // Also filter out "SECTION" parts which are invalid for all papers
              const isNSAA2019 = state.paperName === 'NSAA' && 
                                  allQuestions.length > 0 && 
                                  allQuestions[0].examYear === 2019 &&
                                  allQuestions[0].examType?.toLowerCase() === 'official';
              
              if (isNSAA2019) {
                console.log('[loadQuestions] NSAA 2019 detected - filtering to only Part A, B, E');
                console.log('[loadQuestions] Checking exam_type:', allQuestions[0].examType);
                const beforeCount = filteredQuestions.length;
                const validParts = ['PART A', 'PART B', 'PART E', 'A', 'B', 'E'];
                filteredQuestions = filteredQuestions.filter(q => {
                  const partLetter = (q.partLetter || '').toString().trim().toUpperCase();
                  
                  // Check if partLetter matches valid parts
                  let isValid = validParts.some(valid => {
                    if (partLetter === valid) return true;
                    if (partLetter === `PART ${valid}`) return true;
                    // Handle cases like "PART A: Mathematics"
                    if (partLetter.includes(valid) && !partLetter.includes('SECTION')) {
                      // Make sure it's not "PART C" or "PART D"
                      if (valid === 'A' && (partLetter.includes('PART C') || partLetter.includes('PART D'))) return false;
                      if (valid === 'B' && (partLetter.includes('PART C') || partLetter.includes('PART D'))) return false;
                      return true;
                    }
                    return false;
                  });
                  
                  // Also check partName for advanced math/physics (Part E)
                  if (!isValid && q.partName) {
                    const partNameLower = (q.partName || '').toString().toLowerCase();
                    if (partNameLower.includes('advanced mathematics') && partNameLower.includes('advanced physics')) {
                      isValid = true; // This is Part E
                    }
                  }
                  
                  if (!isValid) {
                    console.log(`[loadQuestions] Filtering out question ${q.questionNumber}: partLetter="${partLetter}", partName="${q.partName}", examType="${q.examType}"`);
                  }
                  return isValid;
                });
                console.log(`[loadQuestions] NSAA 2019 filtering: ${beforeCount} -> ${filteredQuestions.length} questions`);
                
                // Log part distribution after filtering
                const partDistribution = new Map<string, number>();
                const partDetails: Array<{ questionNumber: number; partLetter: string; partName: string }> = [];
                filteredQuestions.forEach(q => {
                  const part = (q.partLetter || '').toString().trim() || 'Unknown';
                  partDistribution.set(part, (partDistribution.get(part) || 0) + 1);
                  partDetails.push({
                    questionNumber: q.questionNumber,
                    partLetter: q.partLetter || '',
                    partName: q.partName || ''
                  });
                });
                console.log('[loadQuestions] NSAA 2019 part distribution after filtering:', Object.fromEntries(partDistribution));
                console.log('[loadQuestions] 🔍 DEEP DEBUG - All filtered questions partLetters:', partDetails);
                
                // Check for any "SECTION" that might have slipped through
                const sectionQuestions = filteredQuestions.filter(q => {
                  const partUpper = (q.partLetter || '').toString().trim().toUpperCase();
                  return partUpper === 'SECTION' || partUpper.startsWith('SECTION ');
                });
                if (sectionQuestions.length > 0) {
                  console.error(`[loadQuestions] ⚠️⚠️⚠️ CRITICAL: Found ${sectionQuestions.length} questions with "SECTION" after filtering!`, 
                    sectionQuestions.map(q => ({
                      questionNumber: q.questionNumber,
                      partLetter: q.partLetter,
                      partName: q.partName,
                      id: q.id
                    }))
                  );
                }
              } else {
                // For other papers, still filter out "SECTION" parts as they're invalid
                const beforeCount = filteredQuestions.length;
                filteredQuestions = filteredQuestions.filter(q => {
                  const partLetter = (q.partLetter || '').toString().trim().toUpperCase();
                  const isSection = partLetter === 'SECTION' || partLetter.startsWith('SECTION ');
                  if (isSection) {
                    console.log(`[loadQuestions] Filtering out invalid "SECTION" part: question ${q.questionNumber}, partLetter="${partLetter}", examType="${q.examType}"`);
                  }
                  return !isSection;
                });
                if (beforeCount !== filteredQuestions.length) {
                  console.log(`[loadQuestions] Filtered out ${beforeCount - filteredQuestions.length} questions with invalid "SECTION" parts`);
                }
              }
              
              // Then filter by selected sections using systematic mapping
              if (state.selectedSections.length > 0) {
                console.log('Filtering questions by sections:', state.selectedSections);
                console.log('Section types:', state.selectedSections.map(s => typeof s));
                
                // Normalize selected sections to strings for comparison
                const normalizedSelectedSections = state.selectedSections.map(s => String(s).trim());
                
                filteredQuestions = allQuestions.filter(q => {
                  const section = sectionByQuestionId.get(q.id);
                  if (!section) {
                    console.warn(`[loadQuestions] Question ${q.questionNumber} has no section mapping`);
                    return false;
                  }
                  
                  const normalizedSection = String(section).trim();
                  const isIncluded = normalizedSelectedSections.includes(normalizedSection);
                  
                  if (isTmuaPaper && !isIncluded) {
                    // Debug: Log why questions are being excluded (only for first few to avoid spam)
                    if (q.questionNumber <= 5 || (q.questionNumber > 20 && q.questionNumber <= 25)) {
                      console.log(`[loadQuestions] Excluding question ${q.questionNumber}: section="${normalizedSection}", selectedSections=[${normalizedSelectedSections.join(', ')}]`);
                    }
                  }
                  return isIncluded;
                });
                console.log('Filtered questions (systematic mapping):', filteredQuestions.length);
                console.log('Sample mapped sections:', filteredQuestions.slice(0, 6).map(q => ({ n: q.questionNumber, part: (q as any).partLetter, name: q.partName, section: sectionByQuestionId.get(q.id) })));
                
                // Debug: Verify both sections are present in filtered results
                if (isTmuaPaper) {
                  const filteredSectionCounts = new Map<string, number>();
                  filteredQuestions.forEach(q => {
                    const section = sectionByQuestionId.get(q.id) || 'Unknown';
                    filteredSectionCounts.set(section, (filteredSectionCounts.get(section) || 0) + 1);
                  });
                  console.log('[loadQuestions] Filtered section distribution:', Object.fromEntries(filteredSectionCounts));
                  
                  // Check if both Paper 1 and Paper 2 are in selected sections but only one appears in filtered
                  const hasPaper1 = state.selectedSections.includes('Paper 1' as any);
                  const hasPaper2 = state.selectedSections.includes('Paper 2' as any);
                  const filteredHasPaper1 = filteredSectionCounts.has('Paper 1');
                  const filteredHasPaper2 = filteredSectionCounts.has('Paper 2');
                  
                  if (hasPaper1 && hasPaper2 && (!filteredHasPaper1 || !filteredHasPaper2)) {
                    console.error('[loadQuestions] ⚠️ BUG DETECTED: Both Paper 1 and Paper 2 selected, but filtered results missing one!', {
                      selected: { hasPaper1, hasPaper2 },
                      filtered: { hasPaper1: filteredHasPaper1, hasPaper2: filteredHasPaper2 },
                      counts: Object.fromEntries(filteredSectionCounts)
                    });
                  }
                }
              }

              // Apply TMUA 2017 Paper 1 footer trimming to question images
              const processedQuestions = await (async () => {
                const shouldTrimTmua2017 = filteredQuestions.some(q =>
                  q.examName === 'TMUA' &&
                  q.examYear === 2017 &&
                  typeof q.paperName === 'string' &&
                  q.paperName.toLowerCase().includes('paper 1') &&
                  typeof q.examType === 'string' &&
                  q.examType.toLowerCase() === 'official'
                );

                if (!shouldTrimTmua2017) {
                  return filteredQuestions;
                }

                console.log('[loadQuestions] Applying TMUA 2017 footer trimming');

                const results = await Promise.all(
                  filteredQuestions.map(async (question) => {
                    const isTargetQuestion =
                      question.examName === 'TMUA' &&
                      question.examYear === 2017 &&
                      typeof question.paperName === 'string' &&
                      question.paperName.toLowerCase().includes('paper 1') &&
                      typeof question.examType === 'string' &&
                      question.examType.toLowerCase() === 'official';

                    if (!isTargetQuestion || !question.questionImage) {
                      return question;
                    }

                    try {
                      const trimmedImage = await cropImageToContent(question.questionImage, {
                        removeFooterPercent: 6,
                        paddingBottom: 24,
                        paddingBottomPercent: 0.2,
                        contentThreshold: 240,
                        minContentRatio: 0.0015,
                      });

                      return trimmedImage === question.questionImage
                        ? question
                        : { ...question, questionImage: trimmedImage };
                    } catch (error) {
                      console.warn('[loadQuestions] TMUA 2017 footer trim failed', {
                        questionNumber: question.questionNumber,
                        error,
                      });
                      return question;
                    }
                  })
                );

                return results;
              })();

              // Order questions by section selection order using mapping
              let sectionStarts: Record<number, string> = {};
              let allSectionsQuestions: Question[][] = [];
              
              if (processedQuestions.length > 0) {
                // Sort by selected sections if provided, otherwise keep original order
                if (state.selectedSections.length > 0) {
                  processedQuestions.sort((a, b) => {
                    const sectionA = sectionByQuestionId.get(a.id) ?? mapPartToSection({ partLetter: (a as any).partLetter, partName: a.partName }, state.paperName as any);
                    const sectionB = sectionByQuestionId.get(b.id) ?? mapPartToSection({ partLetter: (b as any).partLetter, partName: b.partName }, state.paperName as any);
                    let indexA = state.selectedSections.indexOf(sectionA as any);
                    let indexB = state.selectedSections.indexOf(sectionB as any);
                    const fallback = state.selectedSections.length + 1;
                    if (indexA < 0) indexA = fallback;
                    if (indexB < 0) indexB = fallback;
                    if (indexA === indexB) return a.questionNumber - b.questionNumber;
                    return indexA - indexB;
                  });
                  
                  // Group questions by section into allSectionsQuestions array
                  console.log('[loadQuestions] Grouping questions by selected sections:', state.selectedSections);
                  
                  allSectionsQuestions = state.selectedSections.map((section) => {
                    const sectionQuestions = processedQuestions.filter((q) => {
                      const questionSection = sectionByQuestionId.get(q.id) ?? mapPartToSection({ partLetter: (q as any).partLetter, partName: q.partName }, state.paperName as any);
                      return String(questionSection).trim() === String(section).trim();
                    });
                    return sectionQuestions;
                  });
                  
                  // Validate grouping results
                  const groupedInfo = allSectionsQuestions.map((qs, idx) => ({
                    section: state.selectedSections[idx],
                    count: qs.length
                  }));
                  
                  console.log('[loadQuestions] Grouped questions by section:', groupedInfo);
                  
                  // Warn if any section has no questions
                  groupedInfo.forEach((info) => {
                    if (info.count === 0) {
                      console.warn(`[loadQuestions] Section "${info.section}" has no questions!`);
                    }
                  });
                  
                  // Verify total questions match
                  const totalGrouped = allSectionsQuestions.reduce((sum, qs) => sum + qs.length, 0);
                  if (totalGrouped !== processedQuestions.length) {
                    console.error(`[loadQuestions] Question count mismatch: grouped ${totalGrouped}, total ${processedQuestions.length}`);
                  }
                } else {
                  // If no selected sections, put all questions in one section
                  allSectionsQuestions = [processedQuestions];
                }
                
                // Build section start indices in the final order (always compute, even without selected sections)
                let lastSection = '';
                processedQuestions.forEach((q, idx) => {
                  const currentSection = sectionByQuestionId.get(q.id) ?? mapPartToSection({ partLetter: (q as any).partLetter, partName: q.partName }, state.paperName as any) as string;
                  if (currentSection !== lastSection) {
                    // Store the part letter if available, otherwise use the section name
                    const displayName = isTmuaPaper && isTmuaSection(currentSection as any) ? currentSection : (q as any).partLetter || currentSection;
                    sectionStarts[idx] = displayName;
                    lastSection = currentSection;
                  }
                });
                console.log('Section starts computed:', sectionStarts);
                console.log('Section starts entries:', Object.entries(sectionStarts));
                console.log('Total questions:', processedQuestions.length);
              }
              
              console.log('=== DEBUG loadQuestions END ===');
              console.log('Final filtered questions count:', processedQuestions.length);
              console.log('Final questions first 3:', processedQuestions.slice(0, 3).map(q => ({ num: q.questionNumber, part: q.partName })));
              
              // Calculate questionRange from actual loaded questions (based on question numbers, not count)
              const currentState = get();
              const actualQuestionCount = processedQuestions.length;
              
              // Calculate actual question number range from loaded questions
              let actualQuestionStart = 1;
              let actualQuestionEnd = actualQuestionCount;
              
              if (processedQuestions.length > 0) {
                const questionNumbers = processedQuestions.map(q => q.questionNumber).sort((a, b) => a - b);
                actualQuestionStart = questionNumbers[0];
                actualQuestionEnd = questionNumbers[questionNumbers.length - 1];
              }
              
              // Always update questionRange to match actual loaded questions
              // This ensures consistency regardless of how questions were filtered
              const expectedCount = currentState.questionRange.end - currentState.questionRange.start + 1;
              const needsUpdate = actualQuestionCount !== expectedCount || 
                                  currentState.questionRange.start !== actualQuestionStart ||
                                  currentState.questionRange.end !== actualQuestionEnd;
              
              if (needsUpdate) {
                // Only log if there's a significant mismatch (more than just rounding differences)
                if (Math.abs(actualQuestionCount - expectedCount) > 1) {
                  console.log(`[loadQuestions] Question range updated: expected ${expectedCount} (${currentState.questionRange.start}-${currentState.questionRange.end}), got ${actualQuestionCount} (${actualQuestionStart}-${actualQuestionEnd})`);
                }
                
                set({
                  questions: processedQuestions,
                  sectionStarts,
                  questionsLoading: false,
                  questionRange: {
                    start: actualQuestionStart,
                    end: actualQuestionEnd,
                  },
                  // Resize arrays to match actual question count
                  answers: Array.from({ length: actualQuestionCount }, (_, i) => currentState.answers[i] || initialAnswer()),
                  perQuestionSec: Array.from({ length: actualQuestionCount }, (_, i) => currentState.perQuestionSec[i] || 0),
                  correctFlags: Array.from({ length: actualQuestionCount }, (_, i) => currentState.correctFlags[i] ?? null),
                  guessedFlags: Array.from({ length: actualQuestionCount }, (_, i) => currentState.guessedFlags[i] || false),
                  reviewFlags: Array.from({ length: actualQuestionCount }, (_, i) => currentState.reviewFlags?.[i] || false),
                  mistakeTags: Array.from({ length: actualQuestionCount }, (_, i) => (currentState.mistakeTags[i] || 'None') as MistakeTag),
                  visitedQuestions: Array.from({ length: actualQuestionCount }, () => false),
                  questionOrder: Array.from({ length: actualQuestionCount }, (_, i) => i + 1),
                  allSectionsQuestions,
                });
              } else {
                set({ questions: processedQuestions, sectionStarts, allSectionsQuestions, questionsLoading: false });
              }
              
              // Calculate section time limits after questions are loaded
              const finalState = get();
              if (finalState.allSectionsQuestions.length > 0) {
                finalState.calculateSectionTimeLimits();
                
                // Initialize section instruction timer for first section if section mode is active
                if (finalState.selectedSections.length > 0 && 
                    finalState.currentSectionIndex === 0 && 
                    (finalState.sectionInstructionTimer === null || finalState.sectionInstructionTimer === 0)) {
                  console.log('[loadQuestions] Initializing section instruction timer for first section');
                  finalState.setSectionInstructionTimer(60);
                }
              } else if (finalState.selectedSections.length > 0) {
                console.warn('[loadQuestions] Section mode active but allSectionsQuestions is empty. Questions may not be properly grouped.');
              }
            } catch (error) {
              console.error('Error loading questions:', error);
              set({
                questionsError: error instanceof Error ? error.message : 'Failed to load questions',
                questionsLoading: false
              });
            }
          },
      
      setAnswer: (questionIndex, choice) => {
        set((state) => {
          const newAnswers = [...state.answers];
          newAnswers[questionIndex] = { ...newAnswers[questionIndex], choice };
          return { answers: newAnswers };
        });
        get().schedulePersist();
      },
      
      setOther: (questionIndex, other) => {
        set((state) => {
          const newAnswers = [...state.answers];
          newAnswers[questionIndex] = { ...newAnswers[questionIndex], other };
          return { answers: newAnswers };
        });
        get().schedulePersist();
      },
      
      setCorrectChoice: (questionIndex, choice) => {
        set((state) => {
          const newAnswers = [...state.answers];
          const current = newAnswers[questionIndex];
          newAnswers[questionIndex] = { 
            ...current, 
            correctChoice: current.correctChoice === choice ? null : choice 
          };
          return { answers: newAnswers };
        });
        get().schedulePersist();
      },
      
      setExplanation: (questionIndex, explanation) => {
        set((state) => {
          const newAnswers = [...state.answers];
          newAnswers[questionIndex] = { ...newAnswers[questionIndex], explanation };
          return { answers: newAnswers };
        });
        get().schedulePersist();
      },
      
      setAddToDrill: (questionIndex, addToDrill) => {
        set((state) => {
          const newAnswers = [...state.answers];
          newAnswers[questionIndex] = { ...newAnswers[questionIndex], addToDrill };
          return { answers: newAnswers };
        });
        get().schedulePersist();
      },
      
      setCorrectFlag: (questionIndex, correct) => {
        set((state) => {
          const newCorrectFlags = [...state.correctFlags];
          newCorrectFlags[questionIndex] = correct;
          const newAnswers = [...state.answers];
          // Automatically add to drill pool when marked as wrong
          if (correct === false) {
            newAnswers[questionIndex] = { ...newAnswers[questionIndex], addToDrill: true };
          }
          return { correctFlags: newCorrectFlags, answers: newAnswers };
        });
        get().schedulePersist();
      },
      
      setGuessedFlag: (questionIndex, guessed) => {
        set((state) => {
          const newGuessedFlags = [...state.guessedFlags];
          newGuessedFlags[questionIndex] = guessed;
          return { guessedFlags: newGuessedFlags };
        });
        get().schedulePersist();
      },
      
      setReviewFlag: (questionIndex, flagged) => {
        set((state) => {
          const newReviewFlags = [...state.reviewFlags];
          newReviewFlags[questionIndex] = flagged;
          return { reviewFlags: newReviewFlags };
        });
        get().schedulePersist();
      },
      
      setMistakeTag: (questionIndex, tag) => {
        set((state) => {
          const newMistakeTags = [...state.mistakeTags];
          newMistakeTags[questionIndex] = tag;
          return { mistakeTags: newMistakeTags };
        });
        get().schedulePersist();
      },
      
      navigateToQuestion: (index) => {
        set((state) => {
          const newVisitedQuestions = [...state.visitedQuestions];
          newVisitedQuestions[index] = true;
          const newState = { currentQuestionIndex: index, visitedQuestions: newVisitedQuestions };
          return newState;
        });
      },
      
      incrementTime: (questionIndex) => {
        set((state) => {
          const newPerQuestionSec = [...state.perQuestionSec];
          newPerQuestionSec[questionIndex] = (newPerQuestionSec[questionIndex] || 0) + 1;
          return { perQuestionSec: newPerQuestionSec };
        });
      },
      
      setDeadline: (deadline) => {
        set({ deadline });
        get().schedulePersist();
      },
      setEndedAt: async (endedAt) => {
        const state = get();
        set({ endedAt });
        
        // Delete from IndexedDB when session ends
        if (state.sessionId) {
          try {
            await deleteSession(state.sessionId);
          } catch (error) {
            console.error('[paperSessionStore] Failed to delete session from IndexedDB:', error);
          }
        }
        
        await get().persistSessionToServer({ immediate: true });
      },
      setNotes: (notes) => {
        set({ notes });
        get().schedulePersist();
      },
      
      resetSession: async () => {
        const state = get();
        if (state.persistTimer) {
          clearTimeout(state.persistTimer);
        }
        
        // Delete from IndexedDB when resetting
        if (state.sessionId) {
          try {
            await deleteSession(state.sessionId);
          } catch (error) {
            console.error('[paperSessionStore] Failed to delete session from IndexedDB on reset:', error);
          }
        }
        
        set({
          sessionId: null,
          paperId: null,
          paperName: '',
          paperVariant: '',
          sessionName: '',
          timeLimitMinutes: 60,
          questionRange: { start: 1, end: 20 },
          selectedSections: [],
          selectedPartIds: [],
          questions: [],
          questionsLoading: false,
          questionsError: null,
          questionOrder: [],
          currentQuestionIndex: 0,
          answers: [],
          perQuestionSec: [],
          correctFlags: [],
          guessedFlags: [],
          reviewFlags: [],
          mistakeTags: [],
          visitedQuestions: [],
          sectionStarts: {},
          currentSectionIndex: 0,
          sectionTimeLimits: [],
          sectionInstructionTimer: null,
          sectionInstructionDeadline: null,
          allSectionsQuestions: [],
          sectionDeadlines: [],
          sectionStartTimes: [],
          startedAt: null,
          endedAt: null,
          deadline: null,
          lastActiveTimestamp: null,
          sectionElapsedTimes: [],
          isPaused: false,
          pausedAt: null,
          notes: '',
          persistTimer: null,
          sessionPersistPromise: null,
        });
      },

      schedulePersist: () => {
        const state = get();
        if (!state.sessionId) return;
        if (state.persistTimer) {
          clearTimeout(state.persistTimer);
        }
        const timer = setTimeout(() => {
          get()
            .persistSessionToServer()
            .catch((error) => console.error("[papers] scheduled persist failed", error));
          set({ persistTimer: null });
        }, 800);
        set({ persistTimer: timer });
      },

      loadSessionFromDatabase: async (sessionIdToLoad: string) => {
        try {
          const response = await fetch(`/api/papers/sessions?id=${sessionIdToLoad}`);
          if (!response.ok) {
            throw new Error(`Failed to load session: ${response.statusText}`);
          }

          const data = await response.json();
          const sessionData = data.session;
          if (!sessionData) {
            throw new Error('Session not found');
          }

          // Convert session data to store format
          const paperId = sessionData.paper_id;
          const questionRange = {
            start: sessionData.question_start || 1,
            end: sessionData.question_end || 1,
          };
          const totalQuestions = questionRange.end - questionRange.start + 1;

          // Set basic session data
          set({
            sessionId: sessionData.id,
            paperId: paperId,
            paperName: sessionData.paper_name || '',
            paperVariant: sessionData.paper_variant || '',
            sessionName: sessionData.session_name || '',
            timeLimitMinutes: sessionData.time_limit_minutes || 60,
            questionRange: questionRange,
            selectedSections: (sessionData.selected_sections as PaperSection[]) || [],
            selectedPartIds: (sessionData.selected_part_ids as string[]) || [],
            questionOrder: (sessionData.question_order as number[]) || Array.from({ length: totalQuestions }, (_, i) => i + 1),
            currentQuestionIndex: 0,
            startedAt: sessionData.started_at ? new Date(sessionData.started_at).getTime() : null,
            endedAt: sessionData.ended_at ? new Date(sessionData.ended_at).getTime() : null,
            deadline: sessionData.deadline_at ? new Date(sessionData.deadline_at).getTime() : null,
            notes: sessionData.notes || '',
            questions: [],
            questionsLoading: false,
            questionsError: null,
            sessionPersistPromise: null,
            persistTimer: null,
          });

          // Convert answers, perQuestionSec, flags, etc.
          const answers = (sessionData.answers as any[]) || [];
          const perQuestionSec = (sessionData.per_question_seconds as number[]) || [];
          const correctFlags = (sessionData.correct_flags as (boolean | null)[]) || [];
          const guessedFlags = (sessionData.guessed_flags as boolean[]) || [];
          const reviewFlags = (sessionData.review_flags as boolean[]) || [];
          const mistakeTags = (sessionData.mistake_tags as MistakeTag[]) || [];

          // Ensure arrays are the right length
          const paddedAnswers = Array.from({ length: totalQuestions }, (_, i) => 
            answers[i] || initialAnswer()
          );
          const paddedPerQuestionSec = Array.from({ length: totalQuestions }, (_, i) => 
            perQuestionSec[i] || 0
          );
          const paddedCorrectFlags = Array.from({ length: totalQuestions }, (_, i) => 
            correctFlags[i] ?? null
          );
          const paddedGuessedFlags = Array.from({ length: totalQuestions }, (_, i) => 
            guessedFlags[i] || false
          );
          const paddedReviewFlags = Array.from({ length: totalQuestions }, (_, i) => 
            reviewFlags[i] || false
          );
          const paddedMistakeTags = Array.from({ length: totalQuestions }, (_, i) => 
            (mistakeTags[i] || 'None') as MistakeTag
          );

          set({
            answers: paddedAnswers,
            perQuestionSec: paddedPerQuestionSec,
            correctFlags: paddedCorrectFlags,
            guessedFlags: paddedGuessedFlags,
            reviewFlags: paddedReviewFlags,
            mistakeTags: paddedMistakeTags,
            visitedQuestions: Array.from({ length: totalQuestions }, () => false),
            sectionStarts: {},
          });

          // Load questions if paperId is available
          if (paperId) {
            await get().loadQuestions(paperId);
          }
        } catch (error) {
          console.error('[paperSessionStore] Failed to load session from database', error);
          throw error;
        }
      },

      /**
       * Persist session data to the server
       * 
       * This saves the current session state including:
       * - All answers, flags, and timing data
       * - selectedSections array (used for completion tracking)
       * - Session metadata (start/end times, scores, etc.)
       * 
       * The selectedSections array is critical for completion tracking:
       * - It records which sections were attempted in this session
       * - When endedAt is set, these sections are marked as "completed"
       * - Used by roadmap and library to show completion status
       * 
       * @param options.immediate - If true, persist immediately instead of debouncing
       */
      persistSessionToServer: async ({ immediate = false } = {}) => {
        const state = get();
        if (!state.sessionId) {
          console.log('[persistSessionToServer] No sessionId, skipping persist');
          return;
        }

        console.log('[persistSessionToServer] Starting persist', { 
          sessionId: state.sessionId, 
          immediate, 
          paperId: state.paperId,
          paperName: state.paperName,
          endedAt: state.endedAt 
        });

        if (state.sessionPersistPromise) {
          try {
            console.log('[persistSessionToServer] Waiting for existing persist promise');
            await state.sessionPersistPromise;
          } catch {
            // Error already logged when creating session
          }
        }

        if (state.persistTimer && immediate) {
          clearTimeout(state.persistTimer);
          set({ persistTimer: null });
        } else if (state.persistTimer && !immediate) {
          console.log('[persistSessionToServer] Persist timer active, skipping (not immediate)');
          return;
        }

        const totalQuestions = state.questionRange.end - state.questionRange.start + 1;

        const payload = {
          id: state.sessionId, // Unique session ID (UUID)
          paperId: state.paperId,
          paperName: state.paperName,
          paperVariant: state.paperVariant,
          sessionName: state.sessionName,
          questionRange: state.questionRange,
          selectedSections: state.selectedSections, // Critical: tracks which sections were attempted
          selectedPartIds: state.selectedPartIds, // Critical: tracks which part IDs were attempted
          questionOrder: state.questionOrder,
          timeLimitMinutes: state.timeLimitMinutes,
          startedAt: state.startedAt,
          endedAt: state.endedAt,
          deadlineAt: state.deadline,
          perQuestionSec: state.perQuestionSec,
          answers: state.answers,
          correctFlags: state.correctFlags,
          guessedFlags: state.guessedFlags,
          reviewFlags: state.reviewFlags,
          mistakeTags: state.mistakeTags,
          notes: state.notes,
          score: {
            correct: state.correctFlags.filter((flag) => flag === true).length,
            total: totalQuestions,
          },
        };

        console.log('[persistSessionToServer] Payload prepared', {
          sessionId: payload.id,
          paperId: payload.paperId,
          score: payload.score,
          answersCount: payload.answers.length,
          correctFlagsCount: payload.correctFlags.filter(f => f === true).length
        });

        try {
          const response = await fetch("/api/papers/sessions", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          console.log('[persistSessionToServer] Response received', {
            status: response.status,
            ok: response.ok,
            statusText: response.statusText
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('[persistSessionToServer] Persist failed', {
              status: response.status,
              statusText: response.statusText,
              errorText
            });
            throw new Error(`Persist failed with status ${response.status}: ${errorText}`);
          }
          
          const responseData = await response.json().catch(() => null);
          console.log('[persistSessionToServer] Persist successful', { responseData });

          const latest = get();
          if (latest.endedAt) {
            const drillItems = latest.answers
              .map((answer, index) => {
                const question = latest.questions[index];
                const fallbackNumber =
                  latest.questionRange.start + index;
                return {
                  shouldAdd: answer.addToDrill,
                  item: {
                    paperId: latest.paperId,
                    paperName: latest.paperName,
                    questionNumber: question?.questionNumber ?? fallbackNumber,
                    correctChoice: answer.correctChoice,
                    explanation: answer.explanation || "",
                    originSessionId: latest.sessionId,
                    questionId: question?.id ?? null,
                    lastWrongAt: latest.endedAt,
                    lastTimeSec: latest.perQuestionSec[index] ?? null,
                  },
                };
              })
              .filter((entry) => entry.shouldAdd)
              .map((entry) => entry.item);

            if (drillItems.length > 0) {
              try {
                const drillResponse = await fetch("/api/papers/drill-items", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ items: drillItems }),
                });
                
                if (!drillResponse.ok) {
                  console.error("[papers] failed creating drill items", await drillResponse.text());
                }
              } catch (drillError) {
                console.error("[papers] failed creating drill items", drillError);
              }
            }
          }
        } catch (error) {
          console.error("[papers] failed updating session", error);
        }
      },
      
      // Computed getters
      getTotalQuestions: () => {
        const state = get();
        return state.questionRange.end - state.questionRange.start + 1;
      },
      
      getCorrectCount: () => {
        const state = get();
        return state.correctFlags.filter(flag => flag === true).length;
      },
      
      getRemainingTime: () => {
        const state = get();
        if (!state.deadline) return state.timeLimitMinutes * 60;
        return Math.max(0, Math.ceil((state.deadline - Date.now()) / 1000));
      },
      
      // Section management actions
      setCurrentSectionIndex: (index: number) => {
        const state = get();
        let newQuestionIndex = 0; // Fallback
        
        // Find the first question of the new section
        if (state.allSectionsQuestions.length > index) {
          const sectionQuestions = state.allSectionsQuestions[index];
          if (sectionQuestions.length > 0) {
            const firstQuestion = sectionQuestions[0];
            const globalIndex = state.questions.findIndex(q => q.id === firstQuestion.id);
            if (globalIndex >= 0) {
              newQuestionIndex = globalIndex;
            }
          }
        }
        
        // Save elapsed time for previous section before switching
        const now = Date.now();
        const previousSectionIndex = state.currentSectionIndex;
        if (previousSectionIndex !== index && previousSectionIndex >= 0 && !state.isPaused) {
          const previousSectionStartTime = state.sectionStartTimes[previousSectionIndex];
          if (previousSectionStartTime && state.sectionInstructionTimer === null) {
            // Calculate elapsed time for previous section
            const elapsedMs = now - previousSectionStartTime;
            const currentElapsed = state.sectionElapsedTimes[previousSectionIndex] || 0;
            const newSectionElapsedTimes = [...state.sectionElapsedTimes];
            newSectionElapsedTimes[previousSectionIndex] = currentElapsed + elapsedMs;
            set({ sectionElapsedTimes: newSectionElapsedTimes });
          }
        }
        
        // Set section start time and deadline for new section
        const sectionTimeLimit = state.sectionTimeLimits[index] || 60;
        const elapsedMs = state.sectionElapsedTimes[index] || 0;
        const remainingMs = (sectionTimeLimit * 60 * 1000) - elapsedMs;
        const sectionDeadline = now + remainingMs;
        
        // Update arrays to ensure they're long enough
        const newSectionStartTimes = [...state.sectionStartTimes];
        const newSectionDeadlines = [...state.sectionDeadlines];
        newSectionStartTimes[index] = now;
        newSectionDeadlines[index] = sectionDeadline;
        
        set({ 
          currentSectionIndex: index, 
          currentQuestionIndex: newQuestionIndex,
          sectionStartTimes: newSectionStartTimes,
          sectionDeadlines: newSectionDeadlines
        });
      },
      
      setSectionInstructionTimer: (seconds: number) => {
        const now = Date.now();
        const deadline = seconds > 0 ? now + seconds * 1000 : null;
        set({ 
          sectionInstructionTimer: seconds,
          sectionInstructionDeadline: deadline,
          instructionTimerStartedAt: seconds > 0 ? now : null,
          currentPipelineState: seconds > 0 ? "instruction" : "section"
        });
      },
      
      getCurrentSectionQuestions: () => {
        const state = get();
        if (state.allSectionsQuestions.length === 0) {
          // Fallback to questions if allSectionsQuestions not populated
          return state.questions;
        }
        return state.allSectionsQuestions[state.currentSectionIndex] || [];
      },
      
      getSectionTimeLimit: (sectionIndex: number) => {
        const state = get();
        return state.sectionTimeLimits[sectionIndex] || 60;
      },
      
      calculateSectionTimeLimits: () => {
        const state = get();
        if (state.allSectionsQuestions.length === 0) return;
        
        const timeLimits = state.allSectionsQuestions.map((sectionQuestions) => {
          const questionCount = sectionQuestions.length;
          // 1.5 minutes per question (or 75 min fixed for TMUA)
          return state.paperName === 'TMUA' ? 75 : Math.ceil(questionCount * 1.5);
        });
        
        set({ sectionTimeLimits: timeLimits });
      },
      
      setSectionStartTime: (sectionIndex: number, startTime: number) => {
        const state = get();
        const newSectionStartTimes = [...state.sectionStartTimes];
        newSectionStartTimes[sectionIndex] = startTime;
        
        // Reset instruction timer when section starts (transitioning from instruction to section)
        const newSectionInstructionTimer = null;
        const newSectionInstructionDeadline = null;
        const newInstructionTimerStartedAt = null;
        
        // Calculate deadline based on section time limit and elapsed time
        const sectionTimeLimit = state.sectionTimeLimits[sectionIndex] || 60;
        const elapsedMs = state.sectionElapsedTimes[sectionIndex] || 0;
        const remainingMs = (sectionTimeLimit * 60 * 1000) - elapsedMs;
        const sectionDeadline = startTime + remainingMs;
        const newSectionDeadlines = [...state.sectionDeadlines];
        newSectionDeadlines[sectionIndex] = sectionDeadline;
        
        set({
          sectionStartTimes: newSectionStartTimes,
          sectionDeadlines: newSectionDeadlines,
          sectionInstructionTimer: newSectionInstructionTimer,
          sectionInstructionDeadline: newSectionInstructionDeadline,
          instructionTimerStartedAt: newInstructionTimerStartedAt,
          currentPipelineState: "section"
        });
      },
      
      getSectionRemainingTime: (sectionIndex: number) => {
        const state = get();
        
        // Don't count time if on instruction page
        const isOnInstruction = state.sectionInstructionTimer !== null && state.sectionInstructionTimer > 0;
        if (isOnInstruction) {
          // Return full time limit if still on instruction page
          const timeLimit = state.sectionTimeLimits[sectionIndex] || 60;
          return timeLimit * 60;
        }
        
        if (state.isPaused) {
          // If paused, calculate remaining time based on elapsed time
          const timeLimit = state.sectionTimeLimits[sectionIndex] || 60;
          const elapsedMs = state.sectionElapsedTimes[sectionIndex] || 0;
          const elapsedSeconds = Math.floor(elapsedMs / 1000);
          return Math.max(0, timeLimit * 60 - elapsedSeconds);
        }
        
        const deadline = state.sectionDeadlines[sectionIndex];
        if (!deadline) {
          // If no deadline set, return the section time limit
          const timeLimit = state.sectionTimeLimits[sectionIndex] || 60;
          return timeLimit * 60;
        }
        
        // Account for elapsed time when calculating remaining time
        // Only count time when not on instruction page
        const elapsedMs = state.sectionElapsedTimes[sectionIndex] || 0;
        const sectionStartTime = state.sectionStartTimes[sectionIndex];
        let currentElapsed = elapsedMs;
        
        if (sectionStartTime && !state.isPaused) {
          // Add time since section started (if not paused and not on instruction page)
          currentElapsed += Date.now() - sectionStartTime;
        }
        
        const timeLimit = state.sectionTimeLimits[sectionIndex] || 60;
        const totalElapsedSeconds = Math.floor(currentElapsed / 1000);
        return Math.max(0, timeLimit * 60 - totalElapsedSeconds);
      },
      
      // Session persistence actions
      updateLastActiveTimestamp: () => {
        set({ lastActiveTimestamp: Date.now() });
      },
      
      pauseSession: () => {
        const state = get();
        if (!state.sessionId || state.isPaused) return;
        
        const now = Date.now();
        const currentSectionIndex = state.currentSectionIndex;
        const sectionStartTime = state.sectionStartTimes[currentSectionIndex];
        
        // Determine current pipeline state
        const isOnInstruction = state.sectionInstructionTimer !== null && state.sectionInstructionTimer > 0;
        const pipelineState: "instruction" | "section" = isOnInstruction ? "instruction" : "section";
        
        // Calculate instruction timer remaining if on instruction page
        let instructionTimerRemaining = state.sectionInstructionTimer;
        if (isOnInstruction && state.sectionInstructionDeadline) {
          const remainingMs = Math.max(0, state.sectionInstructionDeadline - now);
          instructionTimerRemaining = Math.floor(remainingMs / 1000);
        }
        
        // Calculate elapsed time for current section (only if in active section, not instruction page)
        let currentSectionElapsed = state.sectionElapsedTimes[currentSectionIndex] || 0;
        if (sectionStartTime && !isOnInstruction) {
          // Only count time if not on instruction page
          currentSectionElapsed += now - sectionStartTime;
        }
        
        // Update section elapsed times
        const newSectionElapsedTimes = [...state.sectionElapsedTimes];
        newSectionElapsedTimes[currentSectionIndex] = currentSectionElapsed;
        
        set({
          isPaused: true,
          pausedAt: now,
          sectionElapsedTimes: newSectionElapsedTimes,
          sectionInstructionTimer: instructionTimerRemaining,
          currentPipelineState: pipelineState,
          lastActiveTimestamp: now,
        });
      },
      
      resumeSession: () => {
        const state = get();
        if (!state.sessionId || !state.isPaused) return;
        
        const now = Date.now();
        const currentSectionIndex = state.currentSectionIndex;
        
        // Restore pipeline state
        const wasOnInstruction = state.currentPipelineState === "instruction" && 
                                state.sectionInstructionTimer !== null && 
                                state.sectionInstructionTimer > 0;
        
        if (wasOnInstruction) {
          // Restore instruction timer - recalculate deadline based on remaining time
          const remainingSeconds = state.sectionInstructionTimer || 0;
          const newDeadline = now + (remainingSeconds * 1000);
          
          set({
            isPaused: false,
            pausedAt: null,
            sectionInstructionTimer: remainingSeconds,
            sectionInstructionDeadline: newDeadline,
            instructionTimerStartedAt: now - ((60 - remainingSeconds) * 1000), // Approximate start time
            currentPipelineState: "instruction",
            lastActiveTimestamp: now,
          });
        } else {
          // Resume active section - skip instruction timer
          const sectionTimeLimit = state.sectionTimeLimits[currentSectionIndex] || 60;
          const elapsedMs = state.sectionElapsedTimes[currentSectionIndex] || 0;
          
          // Calculate new deadline based on remaining time
          const remainingMs = (sectionTimeLimit * 60 * 1000) - elapsedMs;
          const newDeadline = now + remainingMs;
          
          // Update section start time and deadline
          const newSectionStartTimes = [...state.sectionStartTimes];
          const newSectionDeadlines = [...state.sectionDeadlines];
          newSectionStartTimes[currentSectionIndex] = now;
          newSectionDeadlines[currentSectionIndex] = newDeadline;
          
          set({
            isPaused: false,
            pausedAt: null,
            sectionStartTimes: newSectionStartTimes,
            sectionDeadlines: newSectionDeadlines,
            sectionInstructionTimer: null, // Explicitly set to null to skip intro
            sectionInstructionDeadline: null,
            instructionTimerStartedAt: null,
            currentPipelineState: "section",
            lastActiveTimestamp: now,
          });
        }
      },
      
      updateTimerState: () => {
        const state = get();
        if (!state.sessionId || state.isPaused) return;
        
        const now = Date.now();
        const currentSectionIndex = state.currentSectionIndex;
        
        // Determine if on instruction page
        const isOnInstruction = state.sectionInstructionTimer !== null && state.sectionInstructionTimer > 0;
        
        if (isOnInstruction && state.sectionInstructionDeadline) {
          // Update instruction timer remaining based on deadline
          const remainingMs = Math.max(0, state.sectionInstructionDeadline - now);
          const remainingSeconds = Math.floor(remainingMs / 1000);
          
          set({
            sectionInstructionTimer: remainingSeconds,
            currentPipelineState: remainingSeconds > 0 ? "instruction" : "section"
          });
        } else if (!isOnInstruction) {
          // Update section elapsed time if in active section
          const sectionStartTime = state.sectionStartTimes[currentSectionIndex];
          if (sectionStartTime) {
            let currentSectionElapsed = state.sectionElapsedTimes[currentSectionIndex] || 0;
            // Add time since section started
            currentSectionElapsed += now - sectionStartTime;
            
            // Update section elapsed times and reset start time
            const newSectionElapsedTimes = [...state.sectionElapsedTimes];
            newSectionElapsedTimes[currentSectionIndex] = currentSectionElapsed;
            
            // Reset section start time to now (we've accumulated the elapsed time)
            const newSectionStartTimes = [...state.sectionStartTimes];
            newSectionStartTimes[currentSectionIndex] = now;
            
            // Recalculate deadline based on updated elapsed time
            const sectionTimeLimit = state.sectionTimeLimits[currentSectionIndex] || 60;
            const remainingMs = (sectionTimeLimit * 60 * 1000) - currentSectionElapsed;
            const newDeadline = now + remainingMs;
            const newSectionDeadlines = [...state.sectionDeadlines];
            newSectionDeadlines[currentSectionIndex] = newDeadline;
            
            set({
              sectionElapsedTimes: newSectionElapsedTimes,
              sectionStartTimes: newSectionStartTimes,
              sectionDeadlines: newSectionDeadlines,
              currentPipelineState: "section"
            });
          }
        }
      },
      
      saveSessionToIndexedDB: async () => {
        const state = get();
        if (!state.sessionId) return;
        
        try {
          // Update timer state before saving to ensure accuracy
          get().updateTimerState();
          const updatedState = get();
          
          // Get current state snapshot
          const stateSnapshot = {
            sessionId: updatedState.sessionId,
            paperId: updatedState.paperId,
            paperName: updatedState.paperName,
            paperVariant: updatedState.paperVariant,
            sessionName: updatedState.sessionName,
            timeLimitMinutes: updatedState.timeLimitMinutes,
            questionRange: updatedState.questionRange,
            selectedSections: updatedState.selectedSections,
            selectedPartIds: updatedState.selectedPartIds,
            questionOrder: updatedState.questionOrder,
            currentQuestionIndex: updatedState.currentQuestionIndex,
            answers: updatedState.answers,
            perQuestionSec: updatedState.perQuestionSec,
            correctFlags: updatedState.correctFlags,
            guessedFlags: updatedState.guessedFlags,
            reviewFlags: updatedState.reviewFlags,
            mistakeTags: updatedState.mistakeTags,
            visitedQuestions: updatedState.visitedQuestions,
            sectionStarts: updatedState.sectionStarts,
            currentSectionIndex: updatedState.currentSectionIndex,
            sectionTimeLimits: updatedState.sectionTimeLimits,
            sectionInstructionTimer: updatedState.sectionInstructionTimer,
            sectionInstructionDeadline: updatedState.sectionInstructionDeadline,
            instructionTimerStartedAt: updatedState.instructionTimerStartedAt,
            currentPipelineState: updatedState.currentPipelineState,
            allSectionsQuestions: updatedState.allSectionsQuestions,
            sectionDeadlines: updatedState.sectionDeadlines,
            sectionStartTimes: updatedState.sectionStartTimes,
            startedAt: updatedState.startedAt,
            endedAt: updatedState.endedAt,
            deadline: updatedState.deadline,
            notes: updatedState.notes,
            questions: updatedState.questions, // Store questions for resume
          };
          
          if (!updatedState.sessionId) return;
          await saveSession(updatedState.sessionId, stateSnapshot, {
            lastActiveTimestamp: updatedState.lastActiveTimestamp || Date.now(),
            sectionElapsedTimes: updatedState.sectionElapsedTimes,
            isPaused: updatedState.isPaused,
            pausedAt: updatedState.pausedAt,
          });
        } catch (error) {
          console.error('[paperSessionStore] Failed to save session to IndexedDB:', error);
        }
      },
      
      loadSessionFromIndexedDB: async (sessionId: string) => {
        try {
          const sessionData = await loadSession(sessionId);
          if (!sessionData) {
            throw new Error('Session not found in IndexedDB');
          }
          
          const state = sessionData.state;
          
          // Restore all state including timer-related state
          set({
            sessionId: state.sessionId,
            paperId: state.paperId,
            paperName: state.paperName,
            paperVariant: state.paperVariant,
            sessionName: state.sessionName,
            timeLimitMinutes: state.timeLimitMinutes,
            questionRange: state.questionRange,
            selectedSections: state.selectedSections || [],
            selectedPartIds: state.selectedPartIds || [],
            questionOrder: state.questionOrder || [],
            currentQuestionIndex: state.currentQuestionIndex || 0,
            answers: state.answers || [],
            perQuestionSec: state.perQuestionSec || [],
            correctFlags: state.correctFlags || [],
            guessedFlags: state.guessedFlags || [],
            reviewFlags: state.reviewFlags || [],
            mistakeTags: state.mistakeTags || [],
            visitedQuestions: state.visitedQuestions || [],
            sectionStarts: state.sectionStarts || {},
            currentSectionIndex: state.currentSectionIndex || 0,
            sectionTimeLimits: state.sectionTimeLimits || [],
            sectionInstructionTimer: state.sectionInstructionTimer ?? null,
            sectionInstructionDeadline: state.sectionInstructionDeadline ?? null,
            instructionTimerStartedAt: state.instructionTimerStartedAt ?? null,
            currentPipelineState: state.currentPipelineState || "section",
            allSectionsQuestions: state.allSectionsQuestions || [],
            sectionDeadlines: state.sectionDeadlines || [],
            sectionStartTimes: state.sectionStartTimes || [],
            startedAt: state.startedAt,
            endedAt: state.endedAt,
            deadline: state.deadline,
            notes: state.notes || '',
            questions: state.questions || [],
            questionsLoading: false,
            questionsError: null,
            lastActiveTimestamp: sessionData.lastActiveTimestamp,
            sectionElapsedTimes: sessionData.sectionElapsedTimes || [],
            isPaused: sessionData.isPaused,
            pausedAt: sessionData.pausedAt,
            sessionPersistPromise: null,
            persistTimer: null,
          });
          
          // If session was paused, keep it paused - don't recalculate timers
          // Timer recalculation will happen when user resumes via resumeSession()
          if (!sessionData.isPaused) {
            // Only recalculate timers if session was active
            const restoredState = get();
            const now = Date.now();
            const timePassed = now - (sessionData.lastActiveTimestamp || now);
            const currentSectionIndex = restoredState.currentSectionIndex;
            
            // Determine if was on instruction page
            const wasOnInstruction = restoredState.currentPipelineState === "instruction" && 
                                     restoredState.sectionInstructionTimer !== null && 
                                     restoredState.sectionInstructionTimer > 0;
            
            if (wasOnInstruction) {
              // Recalculate instruction timer remaining
              const savedRemaining = restoredState.sectionInstructionTimer || 0;
              const remainingAfterTimePassed = Math.max(0, savedRemaining - Math.floor(timePassed / 1000));
              
              if (remainingAfterTimePassed > 0) {
                // Still have time on instruction timer
                const newDeadline = now + (remainingAfterTimePassed * 1000);
                set({
                  sectionInstructionTimer: remainingAfterTimePassed,
                  sectionInstructionDeadline: newDeadline,
                  instructionTimerStartedAt: now - ((60 - remainingAfterTimePassed) * 1000),
                  currentPipelineState: "instruction"
                });
              } else {
                // Instruction timer expired - transition to section
                set({
                  sectionInstructionTimer: 0,
                  sectionInstructionDeadline: null,
                  instructionTimerStartedAt: null,
                  currentPipelineState: "section"
                });
                
                // Start section timer if not already started
                const finalState = get();
                if (!finalState.sectionStartTimes[currentSectionIndex]) {
                  finalState.setSectionStartTime(currentSectionIndex, now);
                }
              }
            } else {
              // Was in active section - don't count time passed as active time
              // Just recalculate deadlines based on remaining time
              const sectionTimeLimit = restoredState.sectionTimeLimits[currentSectionIndex] || 60;
              const elapsedMs = restoredState.sectionElapsedTimes[currentSectionIndex] || 0;
              const remainingMs = (sectionTimeLimit * 60 * 1000) - elapsedMs;
              
              if (remainingMs > 0) {
                const newDeadline = now + remainingMs;
                const newSectionDeadlines = [...restoredState.sectionDeadlines];
                newSectionDeadlines[currentSectionIndex] = newDeadline;
                
                // Reset section start time to now (we've accounted for elapsed time)
                const newSectionStartTimes = [...restoredState.sectionStartTimes];
                newSectionStartTimes[currentSectionIndex] = now;
                
                set({
                  sectionDeadlines: newSectionDeadlines,
                  sectionStartTimes: newSectionStartTimes,
                  currentPipelineState: "section"
                });
              }
            }
          }
          
          // Store the restored question index before loading questions
          const restoredQuestionIndex = state.currentQuestionIndex || 0;
          
          // If questions are not loaded, load them
          const finalState = get();
          if (finalState.questions.length === 0 && finalState.paperId) {
            await finalState.loadQuestions(finalState.paperId);
            
            // After questions load, restore currentQuestionIndex
            const stateAfterLoad = get();
            if (stateAfterLoad.questions.length > 0) {
              // Validate and clamp the restored index
              let targetIndex = restoredQuestionIndex;
              if (targetIndex < 0) {
                targetIndex = 0;
              } else if (targetIndex >= stateAfterLoad.questions.length) {
                targetIndex = stateAfterLoad.questions.length - 1;
              }
              
              // Set the index and navigate to ensure UI is in sync
              set({ currentQuestionIndex: targetIndex });
              stateAfterLoad.navigateToQuestion(targetIndex);
            }
          } else if (finalState.questions.length > 0) {
            // Questions already loaded, validate and restore currentQuestionIndex
            let targetIndex = restoredQuestionIndex;
            if (targetIndex < 0) {
              targetIndex = 0;
            } else if (targetIndex >= finalState.questions.length) {
              targetIndex = finalState.questions.length - 1;
            }
            
            // Set the index and navigate to ensure UI is in sync
            set({ currentQuestionIndex: targetIndex });
            finalState.navigateToQuestion(targetIndex);
          }
        } catch (error) {
          console.error('[paperSessionStore] Failed to load session from IndexedDB:', error);
          throw error;
        }
      },
    }),
    {
      name: 'paper-session-store',
      partialize: (state) => ({
        sessionId: state.sessionId,
        paperId: state.paperId,
        paperName: state.paperName,
        paperVariant: state.paperVariant,
        sessionName: state.sessionName,
        timeLimitMinutes: state.timeLimitMinutes,
        questionRange: state.questionRange,
        selectedSections: state.selectedSections,
        questions: state.questions,
        questionOrder: state.questionOrder,
        currentQuestionIndex: state.currentQuestionIndex,
        answers: state.answers,
        perQuestionSec: state.perQuestionSec,
        correctFlags: state.correctFlags,
        guessedFlags: state.guessedFlags,
        reviewFlags: state.reviewFlags,
        mistakeTags: state.mistakeTags,
        visitedQuestions: state.visitedQuestions,
        sectionStarts: state.sectionStarts,
        currentSectionIndex: state.currentSectionIndex,
        sectionTimeLimits: state.sectionTimeLimits,
        sectionInstructionTimer: state.sectionInstructionTimer,
        sectionInstructionDeadline: state.sectionInstructionDeadline,
        instructionTimerStartedAt: state.instructionTimerStartedAt,
        currentPipelineState: state.currentPipelineState,
        allSectionsQuestions: state.allSectionsQuestions,
        sectionDeadlines: state.sectionDeadlines,
        sectionStartTimes: state.sectionStartTimes,
        startedAt: state.startedAt,
        deadline: state.deadline,
        endedAt: state.endedAt,
        lastActiveTimestamp: state.lastActiveTimestamp,
        sectionElapsedTimes: state.sectionElapsedTimes,
        isPaused: state.isPaused,
        pausedAt: state.pausedAt,
        notes: state.notes,
      }),
    }
  )
);
