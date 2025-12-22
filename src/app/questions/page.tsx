/**
 * Question Bank Page
 * Immediately displays questions for practice with filtering options
 */

"use client";

import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { QuestionCard } from "@/components/questionBank/QuestionCard";
import { SolutionView } from "@/components/questionBank/SolutionView";
import { FilterPanel } from "@/components/questionBank/FilterPanel";
import { useQuestionBank } from "@/hooks/useQuestionBank";
import { ArrowRight, RotateCw } from "lucide-react";

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
    setFilters,
    submitAnswer,
    nextQuestion,
    viewSolution,
  } = useQuestionBank();

  return (
    <div className="min-h-[calc(100vh-3.5rem)] py-8">
      <Container size="lg">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white/90 mb-2">
              Question Bank
            </h1>
            <p className="text-white/60">
              Practice questions and improve your skills
            </p>
          </div>

          {/* Filter Panel */}
          <div className="bg-white/5 p-6 rounded-organic-lg backdrop-blur-sm">
            <FilterPanel filters={filters} onFilterChange={setFilters} />
          </div>

          {/* Question Counter */}
          {questionCount > 0 && (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full text-sm text-white/70">
                <span className="font-semibold text-primary">
                  Question {questionCount}
                </span>
              </div>
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
              <QuestionCard
                question={currentQuestion}
                onAnswerSubmit={submitAnswer}
                isAnswered={isAnswered}
                selectedAnswer={selectedAnswer}
                correctAnswer={currentQuestion.correct_option}
              />

              {/* Solution View - shows after answering */}
              {isAnswered && (
                <SolutionView
                  solution_reasoning={currentQuestion.solution_reasoning}
                  solution_key_insight={currentQuestion.solution_key_insight}
                  correct_option={currentQuestion.correct_option}
                  isCorrect={isCorrect ?? false}
                  autoShow={true}
                />
              )}

              {/* Next Question Button */}
              {isAnswered && (
                <div className="flex justify-center">
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
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}


