/**
 * Question Bank Page
 * Immediately displays questions for practice with filtering options
 */

"use client";

import { useState, useEffect } from "react";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { QuestionCard } from "@/components/questionBank/QuestionCard";
import { SolutionModal } from "@/components/questionBank/SolutionModal";
import { FilterPanel } from "@/components/questionBank/FilterPanel";
import { EditModal } from "@/components/questionBank/EditModal";
import { ReviewButton } from "@/components/questionBank/ReviewButton";
import { useQuestionBank } from "@/hooks/useQuestionBank";
import { useQuestionEditor } from "@/hooks/useQuestionEditor";
import { ArrowRight, RotateCw, BookOpen } from "lucide-react";
import type { QuestionBankQuestion } from "@/types/questionBank";

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

  const [showFilters, setShowFilters] = useState(true);
  const [showSolutionModal, setShowSolutionModal] = useState(false);
  const [curriculum, setCurriculum] = useState<any>(null);
  
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

  return (
    <div className="min-h-[calc(100vh-3.5rem)] py-8">
      <Container size="lg">
        <div className="space-y-6">
          {/* Filter Panel - Collapsible */}
          {showFilters ? (
            <div className="bg-white/5 p-6 rounded-organic-lg backdrop-blur-sm">
              <FilterPanel 
                filters={filters} 
                onFilterChange={setFilters}
                onToggleFilters={() => setShowFilters(false)}
                showToggle={true}
              />
            </div>
          ) : (
            <div className="flex justify-end">
              <button
                onClick={() => setShowFilters(true)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-organic-md text-sm text-white/70 transition-all duration-fast"
              >
                Show Filters
              </button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="bg-error/10 border border-error/20 rounded-organic-lg p-6 text-center">
              <p className="text-error mb-4">{error}</p>
              <Button onClick={nextQuestion} variant="secondary">
                <RotateCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          )}

          {/* Question Display */}
          {currentQuestion && !isLoading && (
            <div className="space-y-6">
              {/* Question metadata pills */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Review Status Pill */}
                {currentQuestion.status === 'pending_review' && (
                  <span className="px-3 py-1.5 rounded-full bg-error/20 border border-error/30 text-xs text-error font-bold uppercase">
                    Pending Review
                  </span>
                )}
                {currentQuestion.status === 'needs_revision' && (
                  <span className="px-3 py-1.5 rounded-full bg-error/20 border border-error/30 text-xs text-error font-bold uppercase">
                    Needs Revision
                  </span>
                )}
                {currentQuestion.status === 'approved' && (
                  <span className="px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/30 text-xs text-green-400 font-bold uppercase">
                    Approved
                  </span>
                )}
                {currentQuestion.status === 'rejected' && (
                  <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs text-white/40 font-bold uppercase">
                    Rejected
                  </span>
                )}
                
                {/* New/Attempted Status Pill */}
                {hasBeenAttempted ? (
                  <span className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary font-medium">
                    Attempted
                  </span>
                ) : (
                  <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs text-white/70 font-medium">
                    New
                  </span>
                )}
                
                <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/60">
                  {currentQuestion.difficulty}
                </span>

                <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/60 font-mono">
                  {currentQuestion.schema_id}
                </span>

                {currentQuestion.paper && (
                  <span className="px-3 py-1.5 rounded-full bg-secondary/20 border border-secondary/30 text-xs text-secondary font-medium">
                    {currentQuestion.paper}
                  </span>
                )}

                {currentQuestion.primary_tag && (
                  <span className="px-3 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-xs text-primary">
                    {getTopicTitle(currentQuestion.primary_tag)}
                  </span>
                )}

                {currentQuestion.secondary_tags && currentQuestion.secondary_tags.map((tag) => (
                  <span key={tag} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/40">
                    {getTopicTitle(tag)}
                  </span>
                ))}
              </div>

              <QuestionCard
                question={currentQuestion}
                onAnswerSubmit={submitAnswer}
                isAnswered={isAnswered}
                selectedAnswer={selectedAnswer}
                correctAnswer={currentQuestion.correct_option}
                isCorrect={isCorrect}
                onEditQuestionStem={handleEditQuestionStem}
                onEditOption={handleEditOption}
              />

              {/* View Solution and Next Question Buttons */}
              {isAnswered && (
                <div className="flex justify-center gap-4">
                  <Button
                    onClick={() => setShowSolutionModal(true)}
                    variant="secondary"
                    size="lg"
                    className="min-w-[200px]"
                  >
                    <BookOpen className="w-5 h-5 mr-2" />
                    View Solution
                  </Button>
                  <Button
                    onClick={nextQuestion}
                    variant="primary"
                    size="lg"
                    className="min-w-[200px]"
                  >
                    Next Question
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              )}

              {/* Solution Modal */}
              <SolutionModal
                isOpen={showSolutionModal}
                onClose={() => setShowSolutionModal(false)}
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
        </div>
      </Container>
    </div>
  );
}


