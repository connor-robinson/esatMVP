/**
 * Question Bank Page
 * Immediately displays questions for practice with filtering options
 */

"use client";

import { useState, useEffect } from "react";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { QuestionCard } from "@/components/questionBank/QuestionCard";
import { FilterPopup } from "@/components/questionBank/FilterPopup";
import { EditModal } from "@/components/questionBank/EditModal";
import { ReviewButton } from "@/components/questionBank/ReviewButton";
import { MathContent } from "@/components/shared/MathContent";
import { SolutionModal } from "@/components/questionBank/SolutionModal";
import { useQuestionBank } from "@/hooks/useQuestionBank";
import { useQuestionEditor } from "@/hooks/useQuestionEditor";
import { ArrowRight, RotateCw, BookOpen, X, Settings, Clock, Pencil, Eye, AlertCircle, Filter } from "lucide-react";
import type { QuestionBankQuestion } from "@/types/questionBank";
import { cn, formatTime } from "@/lib/utils";

export default function QuestionBankPage() {
  const {
    currentQuestion,
    isLoading,
    error,
    filters,
    isAnswered,
    selectedAnswer,
    isCorrect,
    questionCount,
    hasBeenAttempted,
    setFilters,
    submitAnswer,
    nextQuestion,
    viewSolution,
    updateCurrentQuestion,
  } = useQuestionBank();

  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [curriculum, setCurriculum] = useState<any>(null);
  const [sessionMode, setSessionMode] = useState(false);
  const [sessionQuestions, setSessionQuestions] = useState<QuestionBankQuestion[]>([]);
  const [sessionCurrentIndex, setSessionCurrentIndex] = useState(0);
  const [timerStartTime, setTimerStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [showDetailedExplanation, setShowDetailedExplanation] = useState(false);
  
  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalTitle, setEditModalTitle] = useState("");
  const [editModalContent, setEditModalContent] = useState("");
  const [editModalField, setEditModalField] = useState<string>("");
  const [editModalOptionLetter, setEditModalOptionLetter] = useState<string | null>(null);
  
  const { updateQuestion, updateQuestionField } = useQuestionEditor();

  // Fetch curriculum data for tag lookups
  useEffect(() => {
    fetch('/api/question-bank/curriculum')
      .then(res => res.json())
      .then(data => setCurriculum(data))
      .catch(err => console.error('Error fetching curriculum:', err));
  }, []);

  // Reset answer revealed state when question changes
  useEffect(() => {
    setAnswerRevealed(false);
    setShowDetailedExplanation(false);
  }, [currentQuestion?.id]);

  // Timer effect - count up timer
  useEffect(() => {
    if (timerStartTime === null) {
      setTimerStartTime(Date.now());
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - timerStartTime);
    }, 100); // Update every 100ms for smooth display

    return () => clearInterval(interval);
  }, [timerStartTime]);

  // Reset timer function
  const resetTimer = () => {
    const newStartTime = Date.now();
    setTimerStartTime(newStartTime);
    setElapsedTime(0);
  };

  // Edit handlers
  const handleEditQuestionStem = () => {
    if (!currentQuestion) return;
    setEditModalTitle("Edit Question");
    setEditModalContent(currentQuestion.question_stem);
    setEditModalField("question_stem");
    setEditModalOptionLetter(null);
    setEditModalOpen(true);
  };

  const handleEditOption = (optionLetter: string) => {
    if (!currentQuestion) return;
    setEditModalTitle(`Edit Option ${optionLetter}`);
    setEditModalContent(currentQuestion.options[optionLetter]);
    setEditModalField("options");
    setEditModalOptionLetter(optionLetter);
    setEditModalOpen(true);
  };

  const handleEditKeyInsight = () => {
    if (!currentQuestion) return;
    setEditModalTitle("Edit Key Insight");
    setEditModalContent(currentQuestion.solution_key_insight || "");
    setEditModalField("solution_key_insight");
    setEditModalOptionLetter(null);
    setEditModalOpen(true);
  };

  const handleEditReasoning = () => {
    if (!currentQuestion) return;
    setEditModalTitle("Edit Solution");
    setEditModalContent(currentQuestion.solution_reasoning || "");
    setEditModalField("solution_reasoning");
    setEditModalOptionLetter(null);
    setEditModalOpen(true);
  };

  const handleEditDistractor = (optionLetter: string) => {
    if (!currentQuestion || !currentQuestion.distractor_map) return;
    setEditModalTitle(`Edit Distractor Analysis for Option ${optionLetter}`);
    setEditModalContent(currentQuestion.distractor_map[optionLetter] || "");
    setEditModalField("distractor_map");
    setEditModalOptionLetter(optionLetter);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (newContent: string) => {
    if (!currentQuestion) return;

    try {
      let updatedQuestion: QuestionBankQuestion | null;
      
      if (editModalField === "options" && editModalOptionLetter) {
        // Update a specific option
        const updatedOptions = { ...currentQuestion.options, [editModalOptionLetter]: newContent };
        updatedQuestion = await updateQuestion(currentQuestion.id, "options", updatedOptions);
        console.log('[Questions Page] Updated options:', updatedQuestion);
      } else if (editModalField === "distractor_map" && editModalOptionLetter) {
        // Update a specific distractor
        const updatedDistractors = { ...currentQuestion.distractor_map, [editModalOptionLetter]: newContent };
        updatedQuestion = await updateQuestion(currentQuestion.id, "distractor_map", updatedDistractors);
        console.log('[Questions Page] Updated distractor:', updatedQuestion);
      } else {
        // Update a regular field
        updatedQuestion = await updateQuestion(currentQuestion.id, editModalField as any, newContent);
        console.log('[Questions Page] Updated field:', editModalField, updatedQuestion);
      }
      
      // Update the current question state with the updated data
      if (updatedQuestion) {
        updateCurrentQuestion(updatedQuestion);
      }
    } catch (error) {
      console.error('[Questions Page] Failed to save edit:', error);
      throw error; // Re-throw so EditModal can show the error
    }
  };

  const handleMarkAsReviewed = () => {
    // Refresh the question to get updated status
    nextQuestion();
  };

  // Helper to find topic title from code
  const getTopicTitle = (tagCode: string) => {
    if (!curriculum || !tagCode) return tagCode;
    
    // 1. Identify the paper and clean the code
    let paperId = '';
    let cleanCode = '';
    
    if (tagCode.startsWith('M1-')) { 
      paperId = 'math1'; 
      cleanCode = tagCode.replace('M1-', ''); 
    } else if (tagCode.startsWith('M2-')) { 
      paperId = 'math2'; 
      cleanCode = tagCode.replace('M2-', ''); 
    } else if (tagCode.startsWith('P-')) { 
      paperId = 'physics'; 
      cleanCode = tagCode.replace('P-', ''); 
    } else if (tagCode.startsWith('biology-')) { 
      paperId = 'biology'; 
      cleanCode = tagCode.replace('biology-', ''); 
    } else if (tagCode.startsWith('chemistry-')) { 
      paperId = 'chemistry'; 
      cleanCode = tagCode.replace('chemistry-', ''); 
    }
    
    // If no prefix matched, return as-is
    if (!paperId) {
      return tagCode;
    }
    
    // 2. Find the paper in curriculum
    const paper = curriculum.papers?.find((p: any) => p.paper_id === paperId);
    if (!paper) return tagCode;
    
    // 3. Match the topic by code
    // For tags like "M1-M5", cleanCode is "M5", but curriculum has code "5"
    // For tags like "M2-MM1", cleanCode is "MM1", curriculum has code "MM1"
    // For tags like "biology-B1", cleanCode is "B1", but curriculum has code "1"
    
    // Try exact match first
    let topic = paper.topics.find((t: any) => t.code === cleanCode);
    
    // If not found, try removing letter prefix (B1 -> 1, P1 -> 1, etc.)
    if (!topic) {
      const numericCode = cleanCode.replace(/^[A-Z]+/, '');
      topic = paper.topics.find((t: any) => t.code === numericCode);
    }
    
    return topic ? topic.title : tagCode;
  };

  // Helper to get active filters as display items
  const getActiveFilters = () => {
    const activeFilters: Array<{ label: string; value: string; type: string; onRemove: () => void }> = [];
    
    // Handle subject (can be array or single value)
    const subjects = Array.isArray(filters.subject) ? filters.subject : (filters.subject !== 'All' ? [filters.subject] : []);
    subjects.forEach((subject) => {
      activeFilters.push({
        label: subject,
        value: subject,
        type: 'subject',
        onRemove: () => {
          const newSubjects = subjects.filter(s => s !== subject);
          setFilters({ ...filters, subject: newSubjects.length > 0 ? newSubjects : 'All' });
        },
      });
    });
    
    // Handle difficulty (can be array or single value)
    const difficulties = Array.isArray(filters.difficulty) ? filters.difficulty : (filters.difficulty !== 'All' ? [filters.difficulty] : []);
    difficulties.forEach((difficulty) => {
      activeFilters.push({
        label: difficulty,
        value: difficulty,
        type: 'difficulty',
        onRemove: () => {
          const newDifficulties = difficulties.filter(d => d !== difficulty);
          setFilters({ ...filters, difficulty: newDifficulties.length > 0 ? newDifficulties : 'All' });
        },
      });
    });
    
    if (filters.attemptedStatus !== 'Mix') {
      activeFilters.push({
        label: filters.attemptedStatus,
        value: filters.attemptedStatus,
        type: 'attemptedStatus',
        onRemove: () => setFilters({ ...filters, attemptedStatus: 'Mix' }),
      });
    }
    
    // Handle attempt result (can be array or single value)
    const attemptResults = Array.isArray(filters.attemptResult) ? filters.attemptResult : (filters.attemptResult ? [filters.attemptResult] : []);
    attemptResults.forEach((result) => {
      activeFilters.push({
        label: result,
        value: result,
        type: 'attemptResult',
        onRemove: () => {
          const newResults = attemptResults.filter(r => r !== result);
          setFilters({ ...filters, attemptResult: newResults.length > 0 ? newResults : [] });
        },
      });
    });
    
    if (filters.searchTag) {
      activeFilters.push({
        label: filters.searchTag,
        value: filters.searchTag,
        type: 'topic',
        onRemove: () => setFilters({ ...filters, searchTag: '' }),
      });
    }
    
    return activeFilters;
  };

  // Get filter color based on type
  const getFilterColor = (type: string, value: string) => {
    if (type === 'subject') {
      const subjectColors: Record<string, string> = {
        'Math 1': 'bg-[#406166]/20 text-[#5da8f0]',
        'Math 2': 'bg-[#406166]/20 text-[#5da8f0]',
        'Physics': 'bg-[#2f2835]/30 text-[#a78bfa]',
        'Chemistry': 'bg-[#854952]/20 text-[#ef7d7d]',
        'Biology': 'bg-[#506141]/20 text-[#85BC82]',
      };
      return subjectColors[value] || 'bg-white/10 text-white/70';
    }
    if (type === 'difficulty') {
      if (value === 'Easy') return 'bg-[#506141]/20 text-[#85BC82]';
      if (value === 'Medium') return 'bg-[#967139]/20 text-[#b8a066]';
      if (value === 'Hard') return 'bg-[#854952]/20 text-[#ef7d7d]';
      return 'bg-white/10 text-white/70';
    }
    if (type === 'attemptedStatus') {
      if (value === 'New' || value === 'Attempted') return 'bg-white/20 text-white/70';
      if (value === 'Mix') return 'bg-white/10 text-white/60';
      return 'bg-white/10 text-white/70';
    }
    if (type === 'attemptResult') {
      return 'bg-white/20 text-white/70';
    }
    if (type === 'topic') {
      return 'bg-white/10 text-white/70';
    }
    return 'bg-white/10 text-white/70';
  };

  const handleStartSession = async (config: { count: number; topics: string[]; difficulties: string[] }) => {
    // Build query params for session
    const params = new URLSearchParams();
    // Handle subject (can be array or single value)
    const subjects = Array.isArray(filters.subject) ? filters.subject : (filters.subject !== 'All' ? [filters.subject] : []);
    if (subjects.length > 0) {
      // For multiple subjects, we'll need to fetch separately or use OR logic
      // For now, use the first subject or fetch all and filter client-side
      if (subjects.length === 1) {
        params.append('subject', subjects[0]);
      }
    }
    if (config.difficulties.length > 0) {
      // If multiple difficulties, we need to fetch them separately or use a different approach
      // For now, if multiple are selected, we'll fetch all and filter client-side
      if (config.difficulties.length === 1) {
        params.append('difficulty', config.difficulties[0]);
      }
    }
    if (config.topics.length > 0) {
      params.append('tags', config.topics.join(','));
    }
    // Fetch more questions than needed to account for filtering
    params.append('limit', (config.count * 2).toString());
    params.append('random', 'true');

    try {
      const response = await fetch(`/api/question-bank/questions?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch session questions');
      
      const data = await response.json();
      if (data.questions && data.questions.length > 0) {
        // Filter by difficulties if multiple were selected
        let filteredQuestions = data.questions;
        if (config.difficulties.length > 1) {
          filteredQuestions = data.questions.filter((q: QuestionBankQuestion) => 
            config.difficulties.includes(q.difficulty)
          );
        }
        
        // Take only the requested count
        const sessionQs = filteredQuestions.slice(0, config.count);
        
        if (sessionQs.length > 0) {
          setSessionQuestions(sessionQs);
          setSessionCurrentIndex(0);
          setSessionMode(true);
          // Update current question to first session question
          updateCurrentQuestion(sessionQs[0]);
        } else {
          alert('No questions found matching your criteria. Please try different filters.');
        }
      } else {
        alert('No questions found matching your criteria. Please try different filters.');
      }
    } catch (err) {
      console.error('Failed to start session:', err);
      alert('Failed to start session. Please try again.');
    }
  };

  // Handle next question in session mode
  const handleNextQuestionInSession = async () => {
    if (sessionMode && sessionQuestions.length > 0) {
      const nextIndex = sessionCurrentIndex + 1;
      if (nextIndex < sessionQuestions.length) {
        setSessionCurrentIndex(nextIndex);
        updateCurrentQuestion(sessionQuestions[nextIndex]);
      } else {
        // Session complete
        setSessionMode(false);
        setSessionQuestions([]);
        setSessionCurrentIndex(0);
        // Return to normal mode
        await nextQuestion();
      }
    } else {
      await nextQuestion();
    }
  };


  return (
    <div className="min-h-[calc(100vh-3.5rem)] py-8">
      <Container size="lg">
        <div className="space-y-6">
          {/* Session Progress Indicator */}
          {sessionMode && sessionQuestions.length > 0 && (
            <div className="bg-primary/10 rounded-organic-md p-4 border border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-primary">Session Mode</span>
                <span className="text-xs text-white/60">
                  Question {sessionCurrentIndex + 1} of {sessionQuestions.length}
                </span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300 ease-signature"
                  style={{ width: `${((sessionCurrentIndex + 1) / sessionQuestions.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Active Filters Row */}
          <div className="flex items-center justify-between gap-4 flex-wrap px-6 py-3 rounded-organic-md bg-white/[0.02]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-white/50 font-mono">Active Filters:</span>
                {(() => {
                  const activeFilters = getActiveFilters();
                  if (activeFilters.length === 0) {
                    return <span className="text-xs text-white/40 italic">No filters active</span>;
                  }
                  
                  // Group filters by type
                  const groupedFilters: Record<string, typeof activeFilters> = {};
                  activeFilters.forEach(filter => {
                    if (!groupedFilters[filter.type]) {
                      groupedFilters[filter.type] = [];
                    }
                    groupedFilters[filter.type].push(filter);
                  });
                  
                  // Display groups with "/" within groups, spacing between groups
                  return (
                    <div className="flex items-center gap-3 flex-wrap">
                      {Object.entries(groupedFilters).map(([type, filters], groupIndex) => (
                        <div key={type} className="flex items-center">
                          {filters.map((filter, index) => (
                            <span key={`${filter.type}-${filter.value}`} className="flex items-center">
                              <button
                                onClick={filter.onRemove}
                                className={cn(
                                  "group relative px-3 py-1.5 rounded-organic-md text-xs font-mono transition-all duration-fast ease-signature cursor-pointer",
                                  "hover:line-through",
                                  getFilterColor(filter.type, filter.value)
                                )}
                                aria-label={`Remove ${filter.label} filter`}
                              >
                                <span>{filter.label}</span>
                              </button>
                              {index < filters.length - 1 && (
                                <span className="text-white/40 px-2">/</span>
                              )}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                })()}
            </div>
            
            {/* Filter button - top right */}
            <button
              onClick={() => setShowFilterPopup(true)}
              className="p-2.5 bg-white/10 hover:bg-white/15 rounded-organic-md text-white/70 hover:text-white/90 transition-all duration-fast ease-signature flex items-center justify-center"
              title="Filters & Settings"
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="bg-interview/10 rounded-organic-lg p-6 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <AlertCircle className="w-5 h-5 text-interview" />
                <p className="text-interview font-mono text-sm">{error}</p>
              </div>
              <Button onClick={nextQuestion} variant="secondary">
                <RotateCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          )}

          {/* Question Display */}
          {currentQuestion && !isLoading && (
            <div className="space-y-6">
              <QuestionCard
                question={currentQuestion}
                onAnswerSubmit={submitAnswer}
                isAnswered={isAnswered}
                selectedAnswer={selectedAnswer}
                correctAnswer={currentQuestion.correct_option}
                isCorrect={isCorrect}
                onEditQuestionStem={handleEditQuestionStem}
                onEditOption={handleEditOption}
                answerRevealed={answerRevealed}
                onRevealAnswer={() => setAnswerRevealed(true)}
                allowRetry={isAnswered && !isCorrect && !answerRevealed}
                getTopicTitle={getTopicTitle}
                elapsedTime={elapsedTime}
                onResetTimer={resetTimer}
              />

              {/* Action Buttons - shown after answer is revealed or correct */}
              {(answerRevealed || (isAnswered && isCorrect)) && (
                <div className="flex justify-center gap-4">
                  <Button
                    onClick={handleNextQuestionInSession}
                    variant="primary"
                    size="lg"
                    className="min-w-[200px]"
                  >
                    {sessionMode && sessionCurrentIndex < sessionQuestions.length - 1
                      ? `Next Question (${sessionCurrentIndex + 1}/${sessionQuestions.length})`
                      : sessionMode
                      ? 'Finish Session'
                      : 'Next Question'}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  <Button
                    onClick={() => setShowDetailedExplanation(true)}
                    variant="secondary"
                    size="lg"
                    className="min-w-[200px]"
                  >
                    <BookOpen className="w-5 h-5 mr-2" />
                    View Detailed Explanation
                  </Button>
                </div>
              )}

              {/* Detailed Explanation Modal */}
              {currentQuestion && (
                <SolutionModal
                  isOpen={showDetailedExplanation}
                  onClose={() => setShowDetailedExplanation(false)}
                  solution_reasoning={currentQuestion.solution_reasoning}
                  solution_key_insight={currentQuestion.solution_key_insight}
                  distractor_map={currentQuestion.distractor_map}
                  correct_option={currentQuestion.correct_option}
                  options={currentQuestion.options}
                  isCorrect={isCorrect ?? false}
                  selectedAnswer={selectedAnswer}
                  onEditKeyInsight={handleEditKeyInsight}
                  onEditReasoning={handleEditReasoning}
                  onEditDistractor={handleEditDistractor}
                />
              )}

              {/* Edit Modal */}
              <EditModal
                isOpen={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                title={editModalTitle}
                content={editModalContent}
                onSave={handleSaveEdit}
              />

              {/* Review Button - only show if pending review or needs revision */}
              {(currentQuestion.status === 'pending_review' || currentQuestion.status === 'needs_revision') && (
                <>
                  {console.log('[Questions Page] Rendering ReviewButton with ID:', currentQuestion.id)}
                  <ReviewButton
                    questionId={currentQuestion.id}
                    onReviewed={handleMarkAsReviewed}
                  />
                </>
              )}
            </div>
          )}

          {/* Filter Popup */}
          <FilterPopup
            isOpen={showFilterPopup}
            onClose={() => setShowFilterPopup(false)}
            filters={filters}
            onFilterChange={setFilters}
            onStartSession={handleStartSession}
          />
        </div>
      </Container>
    </div>
  );
}


