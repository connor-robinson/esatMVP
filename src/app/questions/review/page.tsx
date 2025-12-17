"use client";

import { useEffect, useState } from "react";
import { QuestionReviewCard } from "@/components/questions/QuestionReviewCard";
import { QuestionDetailView } from "@/components/questions/QuestionDetailView";
import { ReviewActions } from "@/components/questions/ReviewActions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface Question {
  id: string;
  generation_id: string;
  schema_id: string;
  difficulty: string;
  status: string;
  question_stem: string;
  options: Record<string, string>;
  correct_option: string;
  solution_reasoning?: string;
  solution_key_insight?: string;
  distractor_map?: Record<string, string>;
  verifier_report?: any;
  style_report?: any;
  idea_plan?: any;
  created_at: string;
}

export default function ReviewPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<any>(null);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/questions?status=pending_review&page=${page}&limit=20`
      );
      const data = await response.json();
      setQuestions(data.questions || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching questions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/questions/stats");
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchQuestionDetail = async (id: string) => {
    try {
      const response = await fetch(`/api/questions/${id}`);
      const data = await response.json();
      setSelectedQuestion(data.question);
    } catch (error) {
      console.error("Error fetching question detail:", error);
    }
  };

  const handleStatusUpdate = async (status: string, notes?: string) => {
    if (!selectedQuestion) return;

    try {
      const response = await fetch(
        `/api/questions/${selectedQuestion.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status, review_notes: notes }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      // Refresh questions list
      await fetchQuestions();
      await fetchStats();

      // Update selected question
      await fetchQuestionDetail(selectedQuestion.id);
    } catch (error) {
      console.error("Error updating status:", error);
      throw error;
    }
  };

  useEffect(() => {
    fetchQuestions();
    fetchStats();
  }, [page]);

  if (loading && questions.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Question Review</h1>
        <p className="text-neutral-400">
          Review and approve AI-generated questions
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="text-sm text-neutral-400">Total</div>
            <div className="text-2xl font-bold">{stats.total || 0}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-neutral-400">Pending</div>
            <div className="text-2xl font-bold text-yellow-400">
              {stats.byStatus?.pending_review || 0}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-neutral-400">Approved</div>
            <div className="text-2xl font-bold text-green-400">
              {stats.byStatus?.approved || 0}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-neutral-400">Rejected</div>
            <div className="text-2xl font-bold text-red-400">
              {stats.byStatus?.rejected || 0}
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Question List */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-4">
              Pending Questions ({questions.length})
            </h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {questions.length === 0 ? (
                <p className="text-neutral-400 text-center py-8">
                  No pending questions
                </p>
              ) : (
                questions.map((question) => (
                  <QuestionReviewCard
                    key={question.id}
                    question={question}
                    onClick={() => fetchQuestionDetail(question.id)}
                  />
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-neutral-700">
                <Button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  variant="secondary"
                >
                  Previous
                </Button>
                <span className="text-sm text-neutral-400">
                  Page {page} of {totalPages}
                </span>
                <Button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  variant="secondary"
                >
                  Next
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Question Detail */}
        <div className="lg:col-span-2">
          {selectedQuestion ? (
            <div className="space-y-4">
              <QuestionDetailView question={selectedQuestion} />
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Review Actions</h3>
                <ReviewActions
                  questionId={selectedQuestion.id}
                  currentStatus={selectedQuestion.status}
                  onStatusUpdate={handleStatusUpdate}
                />
              </Card>
            </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-neutral-400">
                Select a question from the list to review
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

