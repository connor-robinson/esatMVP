/**
 * Zustand store for paper session state management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { mapPartToSection, deriveTmuaSectionFromQuestion, isTmuaSection } from '@/lib/papers/sectionMapping';
import { cropImageToContent } from '@/lib/utils/imageCrop';
import type { Answer, Letter, MistakeTag, PaperSection, Question } from '@/types/papers';

interface PaperSessionState {
  // Session data
  sessionId: string | null;
  paperId: number | null;
  paperName: string;
  paperVariant: string;
  sessionName: string;
  timeLimitMinutes: number;
  questionRange: { start: number; end: number };
  selectedSections: PaperSection[];
  
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
  mistakeTags: MistakeTag[];
  visitedQuestions: boolean[];
  // Section boundaries for quick nav headers
  sectionStarts: Record<number, string>;
  
  // Timing
  startedAt: number | null;
  endedAt: number | null;
  deadline: number | null;
  
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

  schedulePersist: () => void;
  persistSessionToServer: (options?: { immediate?: boolean }) => Promise<void>;
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
      mistakeTags: [],
      visitedQuestions: [],
      sectionStarts: {},
      
      startedAt: null,
      endedAt: null,
      deadline: null,
      
      notes: '',
      sessionPersistPromise: null,
      persistTimer: null,
      
      // Actions
      startSession: (config) => {
        const totalQuestions = config.questionRange.end - config.questionRange.start + 1;
        const sessionId = crypto.randomUUID();
        const startedAt = Date.now();
        const deadline = startedAt + config.timeLimitMinutes * 60 * 1000;
        
        set({
          sessionId,
          paperId: config.paperId,
          paperName: config.paperName,
          paperVariant: config.paperVariant,
          sessionName: config.sessionName,
          timeLimitMinutes: config.timeLimitMinutes,
          questionRange: config.questionRange,
          selectedSections: config.selectedSections || [],
          questionOrder: config.questionOrder || Array.from({ length: totalQuestions }, (_, i) => i + 1),
          currentQuestionIndex: 0,
          answers: Array.from({ length: totalQuestions }, initialAnswer),
          perQuestionSec: Array.from({ length: totalQuestions }, () => 0),
          correctFlags: Array.from({ length: totalQuestions }, () => null),
          guessedFlags: Array.from({ length: totalQuestions }, () => false),
          mistakeTags: Array.from({ length: totalQuestions }, () => 'None' as MistakeTag),
          visitedQuestions: Array.from({ length: totalQuestions }, () => false),
          startedAt,
          endedAt: null,
          deadline,
          notes: '',
          // Clear questions when starting new session to ensure fresh load
          questions: [],
          questionsLoading: false,
          questionsError: null,
          sessionPersistPromise: null,
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
          mistakeTags: Array.from({ length: totalQuestions }, () => 'None' as MistakeTag),
          notes: '',
          score: null,
        };

        const createPromise = fetch("/api/papers/sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error("Failed to create paper session");
            }
          })
          .catch((error) => {
            console.error("[papers] failed to create session", error);
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
              
              const { getQuestions } = await import('@/lib/supabase/questions');
              const allQuestions = await getQuestions(paperId);
              console.log('Loaded all questions count:', allQuestions.length);
              console.log('First question:', allQuestions[0]);
              console.log('Sample question partNames:', allQuestions.slice(0, 5).map(q => ({ num: q.questionNumber, part: q.partName })));
              
              const isTmuaPaper = state.paperName === 'TMUA';
              const totalQuestions = allQuestions.length;
              const sectionByQuestionId = new Map<number, string>();

              allQuestions.forEach((question, index) => {
                const section = isTmuaPaper
                  ? deriveTmuaSectionFromQuestion(question, index, totalQuestions)
                  : mapPartToSection({ partLetter: (question as any).partLetter, partName: question.partName }, state.paperName as any);
                sectionByQuestionId.set(question.id, section);
              });

              // Filter questions by selected sections using systematic mapping
              let filteredQuestions = allQuestions;
              if (state.selectedSections.length > 0) {
                console.log('Filtering questions by sections:', state.selectedSections);
                filteredQuestions = allQuestions.filter(q => {
                  const section = sectionByQuestionId.get(q.id);
                  return section ? state.selectedSections.includes(section as any) : false;
                });
                console.log('Filtered questions (systematic mapping):', filteredQuestions.length);
                console.log('Sample mapped sections:', filteredQuestions.slice(0, 6).map(q => ({ n: q.questionNumber, part: (q as any).partLetter, name: q.partName, section: sectionByQuestionId.get(q.id) })));
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
              
              set({ questions: processedQuestions, sectionStarts, questionsLoading: false });
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
          return { currentQuestionIndex: index, visitedQuestions: newVisitedQuestions };
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
      setEndedAt: (endedAt) => {
        set({ endedAt });
        get().persistSessionToServer({ immediate: true });
      },
      setNotes: (notes) => {
        set({ notes });
        get().schedulePersist();
      },
      
      resetSession: () => {
        const state = get();
        if (state.persistTimer) {
          clearTimeout(state.persistTimer);
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
          mistakeTags: [],
          visitedQuestions: [],
          startedAt: null,
          endedAt: null,
          deadline: null,
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
          id: state.sessionId,
          paperId: state.paperId,
          paperName: state.paperName,
          paperVariant: state.paperVariant,
          sessionName: state.sessionName,
          questionRange: state.questionRange,
          selectedSections: state.selectedSections,
          questionOrder: state.questionOrder,
          timeLimitMinutes: state.timeLimitMinutes,
          startedAt: state.startedAt,
          endedAt: state.endedAt,
          deadlineAt: state.deadline,
          perQuestionSec: state.perQuestionSec,
          answers: state.answers,
          correctFlags: state.correctFlags,
          guessedFlags: state.guessedFlags,
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
        mistakeTags: state.mistakeTags,
        visitedQuestions: state.visitedQuestions,
        startedAt: state.startedAt,
        deadline: state.deadline,
        endedAt: state.endedAt,
        notes: state.notes,
        sectionStarts: state.sectionStarts,
      }),
    }
  )
);
