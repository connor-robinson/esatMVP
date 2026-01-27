"use client";

import { useEffect, useState, useCallback } from "react";
import { QuestionReviewCard } from "@/components/questions/QuestionReviewCard";
import { QuestionDetailView } from "@/components/questions/QuestionDetailView";
import { SimplifiedQuestionDetailView } from "@/components/questions/SimplifiedQuestionDetailView";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { isQuestionGenerationEnabled } from "@/lib/features";
import { useRouter } from "next/navigation";

interface Question {
  id: string;
  generation_id: string;
  schema_id: string;
  difficulty: string;
  status: 'pending' | 'approved' | 'deleted';
  question_stem: string;
  options: Record<string, string>;
  correct_option: string;
  solution_reasoning?: string;
  solution_key_insight?: string;
  distractor_map?: Record<string, string>;
  verifier_report?: any;
  style_report?: any;
  idea_plan?: any;
  primary_tag?: string | null;
  secondary_tags?: string[] | null;
  tags_confidence?: any;
  tags_labeled_at?: string | null;
  tags_labeled_by?: string | null;
  subjects?: string | null;
  test_type?: 'ESAT' | 'TMUA';
  created_at: string;
}

interface GenerationStatus {
  status: "idle" | "running" | "completed" | "error" | "stopped";
  total: number;
  completed: number;
  successful: number;
  failed: number;
  message?: string;
  error?: string;
}

export default function ReviewPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<any>(null);
  const [primaryTagFilter, setPrimaryTagFilter] = useState<string>("");
  const [secondaryTagFilter, setSecondaryTagFilter] = useState<string>("");
  const [subjectsFilter, setSubjectsFilter] = useState<string>("");
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>({
    status: "idle",
    total: 0,
    completed: 0,
    successful: 0,
    failed: 0,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationCount, setGenerationCount] = useState(10);

  // Fetch initial status on mount
  useEffect(() => {
    const fetchInitialStatus = async () => {
      try {
        const response = await fetch("/api/questions/generate");
        if (response.ok) {
          const status: GenerationStatus = await response.json();
          setGenerationStatus(status);
          // If status is running, start polling
          if (status.status === "running") {
            setIsGenerating(true);
          }
        }
      } catch (error) {
        console.error("Error fetching initial status:", error);
      }
    };
    fetchInitialStatus();
  }, []);

  // Only allow access on localhost
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isLocalhost = 
        window.location.hostname === "localhost" || 
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname === "[::1]";
      
      if (!isLocalhost) {
        // Redirect to home if not on localhost
        setTimeout(() => {
          try {
            if (router && typeof router.push === "function") {
              router.push("/");
            } else {
              window.location.href = "/";
            }
          } catch (error) {
            console.error("Redirect error:", error);
            window.location.href = "/";
          }
        }, 0);
      }
    }
  }, [router]);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: "pending",
        page: page.toString(),
        limit: "20",
      });
      
      if (primaryTagFilter) {
        params.append("primary_tag", primaryTagFilter);
      }
      if (secondaryTagFilter) {
        params.append("secondary_tag", secondaryTagFilter);
      }
      if (subjectsFilter) {
        params.append("subjects", subjectsFilter);
      }
      
      const response = await fetch(`/api/questions?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch questions");
      }
      const data = await response.json();
      setQuestions(data.questions || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching questions:", error);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [page, primaryTagFilter, secondaryTagFilter, subjectsFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/questions/stats");
      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, []);

  const fetchQuestionDetail = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/questions/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch question detail");
      }
      const data = await response.json();
      setSelectedQuestion(data.question);
    } catch (error) {
      console.error("Error fetching question detail:", error);
    }
  }, []);

  const handleStatusUpdate = async (status: string) => {
    if (!selectedQuestion) return;

    try {
      const response = await fetch(
        `/api/questions/${selectedQuestion.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Failed to update status (${response.status})`;
        throw new Error(errorMessage);
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

  const handleQuestionUpdate = async (questionId: string, updates: Partial<Question & { status?: string }>) => {
    try {
      // Check if this is a tag update
      if (updates.primary_tag !== undefined || updates.secondary_tags !== undefined) {
        // Use tags endpoint
        const response = await fetch(
          `/api/questions/${questionId}/tags`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              primary_tag: updates.primary_tag,
              secondary_tags: updates.secondary_tags,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to update question tags");
        }

        const data = await response.json();
        setSelectedQuestion(data.question);
      } else {
        // Use regular update endpoint
        const response = await fetch(
          `/api/questions/${questionId}/update`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updates),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to update question");
        }

        const data = await response.json();
        setSelectedQuestion(data.question);
      }
      
      // Refresh questions list to show updated content
      await fetchQuestions();
      
      // Re-typeset MathJax after update
      setTimeout(() => {
        if (typeof window !== 'undefined' && (window as any).MathJax?.typesetPromise) {
          (window as any).MathJax.typesetPromise();
        }
      }, 200);
    } catch (error) {
      console.error("Error updating question:", error);
      throw error;
    }
  };

  const handleApprove = async (questionId: string) => {
    try {
      await handleStatusUpdate("approved");
      
      // Refresh questions to get updated list
      await fetchQuestions();
      
      // Wait a moment for state to update, then find next pending question
      setTimeout(async () => {
        const pendingQuestions = questions.filter(q => q.status === "pending" && q.id !== questionId);
        
        if (pendingQuestions.length > 0) {
          // Move to first pending question
          const nextQuestion = pendingQuestions[0];
          await fetchQuestionDetail(nextQuestion.id);
        } else {
          // No more pending questions, try to fetch fresh list
          const response = await fetch("/api/questions?status=pending&page=1&limit=100");
          if (response.ok) {
            const data = await response.json();
            if (data.questions && data.questions.length > 0) {
              await fetchQuestionDetail(data.questions[0].id);
            } else {
              setSelectedQuestion(null);
            }
          } else {
            setSelectedQuestion(null);
          }
        }
      }, 100);
    } catch (error) {
      console.error("Error approving question:", error);
      // Show error to user
      alert(`Failed to approve question: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleReject = async (questionId: string) => {
    try {
      await handleStatusUpdate("deleted");
      
      // Refresh questions to get updated list
      await fetchQuestions();
      
      // Wait a moment for state to update, then find next pending question
      setTimeout(async () => {
        const pendingQuestions = questions.filter(q => q.status === "pending" && q.id !== questionId);
        
        if (pendingQuestions.length > 0) {
          // Move to first pending question
          const nextQuestion = pendingQuestions[0];
          await fetchQuestionDetail(nextQuestion.id);
        } else {
          // No more pending questions, try to fetch fresh list
          const response = await fetch("/api/questions?status=pending&page=1&limit=100");
          if (response.ok) {
            const data = await response.json();
            if (data.questions && data.questions.length > 0) {
              await fetchQuestionDetail(data.questions[0].id);
            } else {
              setSelectedQuestion(null);
            }
          } else {
            setSelectedQuestion(null);
          }
        }
      }, 100);
    } catch (error) {
      console.error("Error rejecting question:", error);
      // Show error to user
      alert(`Failed to reject question: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const resetGeneration = async () => {
    try {
      const response = await fetch("/api/questions/generate/reset", {
        method: "POST",
      });
      if (response.ok) {
        setGenerationStatus({
          status: "idle",
          total: 0,
          completed: 0,
          successful: 0,
          failed: 0,
        });
        setIsGenerating(false);
        console.log("Generation status reset");
      }
    } catch (error) {
      console.error("Error resetting generation:", error);
    }
  };

  const stopGeneration = async () => {
    try {
      const response = await fetch("/api/questions/generate/stop", {
        method: "POST",
      });
      if (response.ok) {
        setIsGenerating(false);
        setGenerationStatus((prev) => ({
          ...prev,
          status: "stopped",
          message: "Generation stopped",
        }));
        console.log("Generation stop requested");
        // Refresh questions after stopping
        await fetchQuestions();
        await fetchStats();
      }
    } catch (error) {
      console.error("Error stopping generation:", error);
    }
  };

  const startGeneration = async () => {
    if (isGenerating) {
      console.log("Generation already in progress");
      // Show current status even if already running
      const response = await fetch("/api/questions/generate");
      if (response.ok) {
        const status: GenerationStatus = await response.json();
        setGenerationStatus(status);
        setIsGenerating(status.status === "running");
      }
      return;
    }

    console.log("Starting generation...", { count: generationCount, workers: 2 });
    setIsGenerating(true);
    
    try {
      const response = await fetch("/api/questions/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          count: generationCount,
          workers: 2,
        }),
      });

      console.log("Response status:", response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error("API error:", errorData);
        
        // If it's "already in progress", fetch the current status
        if (errorData.error?.includes("already in progress")) {
          const statusResponse = await fetch("/api/questions/generate");
          if (statusResponse.ok) {
            const status: GenerationStatus = await statusResponse.json();
            setGenerationStatus(status);
            setIsGenerating(status.status === "running");
            return;
          }
        }
        
        throw new Error(errorData.error || `Failed to start generation: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Generation started:", data);

      // Initialize status
      setGenerationStatus({
        status: "running",
        total: generationCount,
        completed: 0,
        successful: 0,
        failed: 0,
        message: "Starting question generation...",
      });

      // Polling will start automatically via useEffect
    } catch (error) {
      console.error("Error starting generation:", error);
      setIsGenerating(false);
      setGenerationStatus({
        status: "error",
        total: generationCount,
        completed: 0,
        successful: 0,
        failed: 0,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to start generation",
      });
    }
  };

  // Poll for generation status when generating
  useEffect(() => {
    if (!isGenerating) return;

    let interval: NodeJS.Timeout | null = null;
    
    // Immediate first poll
    const pollStatus = async () => {
      try {
        const response = await fetch("/api/questions/generate");
        if (!response.ok) {
          throw new Error("Failed to fetch status");
        }
        const status: GenerationStatus = await response.json();
        console.log("Polled status:", status);
        setGenerationStatus(status);

        if (status.status === "completed" || status.status === "error" || status.status === "stopped") {
          setIsGenerating(false);
          // Refresh questions and stats
          await fetchQuestions();
          await fetchStats();
        } else if (status.status === "idle") {
          // Status reset to idle, stop polling
          setIsGenerating(false);
        }
      } catch (error) {
        console.error("Error polling status:", error);
        setIsGenerating(false);
      }
    };

    // Poll immediately, then set up interval
    pollStatus();
    
    try {
      // OPTIMIZED: Increased from 2 seconds to 10 seconds to reduce egress usage
      // Reduces polling calls from 30/min to 6/min (80% reduction)
      interval = setInterval(pollStatus, 10000); // Poll every 10 seconds
    } catch (error) {
      console.error("Error setting up polling:", error);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isGenerating, fetchQuestions, fetchStats]);

  useEffect(() => {
    fetchQuestions();
    fetchStats();
  }, [page, fetchQuestions, fetchStats]);
  
  // Refresh questions when generation completes
  useEffect(() => {
    if (generationStatus.status === "completed") {
      fetchQuestions();
      fetchStats();
    }
  }, [generationStatus.status, fetchQuestions, fetchStats]);

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

      {/* Generation Controls */}
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold mb-2">Generate Questions</h2>
            <p className="text-sm text-neutral-400">
              Generate new questions using AI workers
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm">Count:</label>
              <input
                type="number"
                min="1"
                max="50"
                value={generationCount}
                onChange={(e) => setGenerationCount(parseInt(e.target.value) || 10)}
                disabled={isGenerating}
                className="w-20 px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-white"
              />
            </div>
            <Button
              onClick={(e) => {
                e.preventDefault();
                console.log("Button clicked, isGenerating:", isGenerating);
                startGeneration();
              }}
              disabled={isGenerating}
              variant="primary"
              type="button"
            >
              {isGenerating ? "Generating..." : `Generate ${generationCount} Questions`}
            </Button>
            {isGenerating && (
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  stopGeneration();
                }}
                variant="secondary"
                type="button"
              >
                Stop
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar - Show when running OR when there's a status */}
        {(generationStatus.status === "running" || generationStatus.status === "stopped" || (isGenerating && generationStatus.status !== "idle")) && (
          <div className="space-y-2 mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-400">
                {generationStatus.message || "Generating questions..."}
              </span>
              <span className="text-neutral-400">
                {generationStatus.successful}/{generationStatus.total} successful
                {generationStatus.completed > 0 && ` (${generationStatus.completed} attempts)`}
              </span>
            </div>
            {generationStatus.total > 0 && (
              <div className="w-full bg-neutral-800 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min((generationStatus.successful / generationStatus.total) * 100, 100)}%`,
                  }}
                />
              </div>
            )}
            <div className="flex items-center gap-4 text-xs text-neutral-400">
              <span className="text-green-400">✓ Successful: {generationStatus.successful}</span>
              <span className="text-red-400">✗ Failed: {generationStatus.failed}</span>
              {generationStatus.total > 0 && (
                <span className="text-yellow-400">
                  Progress: {Math.round((generationStatus.successful / generationStatus.total) * 100)}%
                </span>
              )}
            </div>
            {isGenerating && (
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <LoadingSpinner size="sm" />
                <span>Generation in progress...</span>
              </div>
            )}
            <Button
              onClick={resetGeneration}
              variant="secondary"
              size="sm"
              className="mt-2"
            >
              Reset Status
            </Button>
          </div>
        )}

        {/* Completion Message */}
        {generationStatus.status === "completed" && (
          <div className="p-3 rounded bg-green-500/10 border border-green-500/20">
            <p className="text-sm text-green-400">
              {generationStatus.message || "Generation completed!"}
            </p>
          </div>
        )}

        {/* Error Message */}
        {generationStatus.status === "error" && (
          <div className="p-3 rounded bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400">
              {generationStatus.error || "Generation failed"}
            </p>
          </div>
        )}
      </Card>

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
              {stats.byStatus?.pending || 0}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-neutral-400">Approved</div>
            <div className="text-2xl font-bold text-green-400">
              {stats.byStatus?.approved || 0}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-neutral-400">Deleted</div>
            <div className="text-2xl font-bold text-red-400">
              {stats.byStatus?.deleted || 0}
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
            
            {/* Filters */}
            <div className="mb-4 space-y-2">
              <div>
                <label className="block text-sm font-semibold mb-1">Filter by Subject</label>
                <select
                  value={subjectsFilter}
                  onChange={(e) => {
                    setSubjectsFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm"
                >
                  <option value="">All Subjects</option>
                  <option value="Math 1">Math 1</option>
                  <option value="Math 2">Math 2</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Biology">Biology</option>
                  <option value="Paper 1">Paper 1 (TMUA)</option>
                  <option value="Paper 2">Paper 2 (TMUA)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Filter by Primary Tag</label>
                <input
                  type="text"
                  value={primaryTagFilter}
                  onChange={(e) => {
                    setPrimaryTagFilter(e.target.value);
                    setPage(1);
                  }}
                  placeholder="e.g., Biology - Cells, Chemistry - Atomic structure"
                  className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Filter by Secondary Tag</label>
                <input
                  type="text"
                  value={secondaryTagFilter}
                  onChange={(e) => {
                    setSecondaryTagFilter(e.target.value);
                    setPage(1);
                  }}
                  placeholder="e.g., Biology - Enzymes, Chemistry - The Periodic Table"
                  className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm"
                />
              </div>
              {(primaryTagFilter || secondaryTagFilter || subjectsFilter) && (
                <Button
                  onClick={() => {
                    setPrimaryTagFilter("");
                    setSecondaryTagFilter("");
                    setSubjectsFilter("");
                    setPage(1);
                  }}
                  variant="secondary"
                  size="sm"
                  className="w-full"
                >
                  Clear Filters
                </Button>
              )}
            </div>
            
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
              <SimplifiedQuestionDetailView
                question={selectedQuestion}
                onUpdate={handleQuestionUpdate as any}
                onApprove={handleApprove}
                onReject={handleReject}
              />
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

