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
import type { Answer, Letter, MistakeTag, PaperSection, Question } from '@/types/papers';
import { saveSession, loadSession, deleteSession } from '@/lib/storage/sessionStorage';

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
  sectionInstructionTimer: number | null;
  sectionInstructionDeadline: number | null;
  allSectionsQuestions: Question[][];
  sectionDeadlines: number[]; // Deadline timestamp for each section
  sectionStartTimes: number[]; // Start timestamp for each section
  
  // Timing
  startedAt: number | null;
  endedAt: number | null;
  deadline: number | null;
  
  // Session persistence state
  lastActiveTimestamp: number | null; // When user was last active
  sectionElapsedTimes: number[]; // Elapsed time per section in milliseconds
  isPaused: boolean; // Whether session is currently paused
  pausedAt: number | null; // Timestamp when paused
  
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
        
        set({
          sessionId, // Unique identifier for this session
          paperId: config.paperId,
          paperName: config.paperName,
          paperVariant: config.paperVariant,
          sessionName: config.sessionName,
          timeLimitMinutes: config.timeLimitMinutes,
          questionRange: config.questionRange,
          selectedSections, // Sections attempted in this session
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
              
              // Update questionRange to match actual loaded questions count
              const currentState = get();
              const actualQuestionCount = processedQuestions.length;
              const expectedCount = currentState.questionRange.end - currentState.questionRange.start + 1;
              
              if (actualQuestionCount !== expectedCount) {
                console.warn(`[loadQuestions] Question count mismatch: expected ${expectedCount}, got ${actualQuestionCount}. Updating questionRange.`);
                set({
                  questions: processedQuestions,
                  sectionStarts,
                  questionsLoading: false,
                  questionRange: {
                    start: 1,
                    end: actualQuestionCount,
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
          return { correctFlags: newCorrectFlags };
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
        if (!state.sessionId) return;

        if (state.sessionPersistPromise) {
          try {
            await state.sessionPersistPromise;
          } catch {
            // Error already logged when creating session
          }
        }

        if (state.persistTimer && immediate) {
          clearTimeout(state.persistTimer);
          set({ persistTimer: null });
        } else if (state.persistTimer && !immediate) {
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

        try {
          const response = await fetch("/api/papers/sessions", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error(`Persist failed with status ${response.status}`);
          }

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
        const deadline = seconds > 0 ? Date.now() + seconds * 1000 : null;
        set({ 
          sectionInstructionTimer: seconds,
          sectionInstructionDeadline: deadline
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
        
        // Calculate deadline based on section time limit and elapsed time
        const sectionTimeLimit = state.sectionTimeLimits[sectionIndex] || 60;
        const elapsedMs = state.sectionElapsedTimes[sectionIndex] || 0;
        const remainingMs = (sectionTimeLimit * 60 * 1000) - elapsedMs;
        const sectionDeadline = startTime + remainingMs;
        const newSectionDeadlines = [...state.sectionDeadlines];
        newSectionDeadlines[sectionIndex] = sectionDeadline;
        
        set({
          sectionStartTimes: newSectionStartTimes,
          sectionDeadlines: newSectionDeadlines
        });
      },
      
      getSectionRemainingTime: (sectionIndex: number) => {
        const state = get();
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
        const elapsedMs = state.sectionElapsedTimes[sectionIndex] || 0;
        const sectionStartTime = state.sectionStartTimes[sectionIndex];
        let currentElapsed = elapsedMs;
        
        if (sectionStartTime && !state.isPaused) {
          // Add time since section started (if not paused)
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
        
        // Calculate elapsed time for current section
        let currentSectionElapsed = state.sectionElapsedTimes[currentSectionIndex] || 0;
        if (sectionStartTime && state.sectionInstructionTimer === null) {
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
          lastActiveTimestamp: now,
        });
      },
      
      resumeSession: () => {
        const state = get();
        if (!state.sessionId || !state.isPaused) return;
        
        const now = Date.now();
        const currentSectionIndex = state.currentSectionIndex;
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
          lastActiveTimestamp: now,
        });
      },
      
      saveSessionToIndexedDB: async () => {
        const state = get();
        if (!state.sessionId) return;
        
        try {
          // Get current state snapshot
          const stateSnapshot = {
            sessionId: state.sessionId,
            paperId: state.paperId,
            paperName: state.paperName,
            paperVariant: state.paperVariant,
            sessionName: state.sessionName,
            timeLimitMinutes: state.timeLimitMinutes,
            questionRange: state.questionRange,
            selectedSections: state.selectedSections,
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
            allSectionsQuestions: state.allSectionsQuestions,
            sectionDeadlines: state.sectionDeadlines,
            sectionStartTimes: state.sectionStartTimes,
            startedAt: state.startedAt,
            endedAt: state.endedAt,
            deadline: state.deadline,
            notes: state.notes,
            questions: state.questions, // Store questions for resume
          };
          
          await saveSession(state.sessionId, stateSnapshot, {
            lastActiveTimestamp: state.lastActiveTimestamp || Date.now(),
            sectionElapsedTimes: state.sectionElapsedTimes,
            isPaused: state.isPaused,
            pausedAt: state.pausedAt,
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
          
          // Restore all state
          set({
            sessionId: state.sessionId,
            paperId: state.paperId,
            paperName: state.paperName,
            paperVariant: state.paperVariant,
            sessionName: state.sessionName,
            timeLimitMinutes: state.timeLimitMinutes,
            questionRange: state.questionRange,
            selectedSections: state.selectedSections || [],
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
          
          // If questions are not loaded, load them
          const finalState = get();
          if (finalState.questions.length === 0 && finalState.paperId) {
            await finalState.loadQuestions(finalState.paperId);
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
