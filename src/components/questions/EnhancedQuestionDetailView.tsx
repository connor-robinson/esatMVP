"use client";

import { useState, useCallback } from "react";
import { MathContent } from "@/components/shared/MathContent";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SectionReviewCard } from "./SectionReviewCard";

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

interface SectionStatus {
  [key: string]: "pending" | "approved" | "rejected";
}

interface EnhancedQuestionDetailViewProps {
  question: Question;
  onUpdate?: (questionId: string, updates: Partial<Question>) => Promise<void>;
}

export function EnhancedQuestionDetailView({
  question,
  onUpdate,
}: EnhancedQuestionDetailViewProps) {
  const [sectionStatuses, setSectionStatuses] = useState<SectionStatus>({});
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<Partial<Question>>({});

  const handleSectionApprove = useCallback(
    (sectionKey: string) => {
      setSectionStatuses((prev) => ({ ...prev, [sectionKey]: "approved" }));
    },
    []
  );

  const handleSectionReject = useCallback(
    (sectionKey: string) => {
      setSectionStatuses((prev) => ({ ...prev, [sectionKey]: "rejected" }));
    },
    []
  );

  const handleSectionEdit = useCallback(
    async (sectionKey: string, newContent: string) => {
      const updates: Partial<Question> = { ...editedContent };
      
      // Map section keys to question properties
      switch (sectionKey) {
        case "question_stem":
          updates.question_stem = newContent;
          break;
        case "solution_reasoning":
          updates.solution_reasoning = newContent;
          break;
        case "solution_key_insight":
          updates.solution_key_insight = newContent;
          break;
        default:
          if (sectionKey.startsWith("option_")) {
            const optionKey = sectionKey.replace("option_", "");
            updates.options = {
              ...question.options,
              [optionKey]: newContent,
            };
          } else if (sectionKey.startsWith("distractor_")) {
            const distractorKey = sectionKey.replace("distractor_", "");
            updates.distractor_map = {
              ...question.distractor_map,
              [distractorKey]: newContent,
            };
          }
      }

      setEditedContent(updates);
      setEditingSection(null);

      // Save to backend if update handler provided
      if (onUpdate) {
        await onUpdate(question.id, updates);
      }
    },
    [question, editedContent, onUpdate]
  );

  const handleStartEdit = useCallback((sectionKey: string) => {
    setEditingSection(sectionKey);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingSection(null);
  }, []);

  const allSectionsApproved =
    Object.values(sectionStatuses).every((status) => status === "approved") &&
    Object.keys(sectionStatuses).length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="default">{question.schema_id}</Badge>
          <Badge variant="default">{question.difficulty}</Badge>
          <Badge variant="default">{question.status}</Badge>
        </div>
        <div className="text-sm text-neutral-400">
          {new Date(question.created_at).toLocaleString()}
        </div>
      </div>

      {/* Question Stem Section */}
      <SectionReviewCard
        title="Question Stem"
        content={editedContent.question_stem || question.question_stem}
        sectionKey="question_stem"
        onApprove={handleSectionApprove}
        onReject={handleSectionReject}
        onEdit={handleSectionEdit}
        approved={sectionStatuses["question_stem"] === "approved"}
        rejected={sectionStatuses["question_stem"] === "rejected"}
        isEditing={editingSection === "question_stem"}
        onStartEdit={handleStartEdit}
        onCancelEdit={handleCancelEdit}
      />

      {/* Options Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Options</h3>
        <div className="space-y-4">
          {Object.entries(editedContent.options || question.options || {})
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => {
              const sectionKey = `option_${key}`;
              const isCorrect = key === question.correct_option;
              
              return (
                <div
                  key={key}
                  className={`p-4 rounded border ${
                    isCorrect
                      ? "border-green-500 bg-green-500/10"
                      : "border-neutral-700 bg-neutral-800/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">{key}:</span>
                      {isCorrect && (
                        <Badge className="bg-green-500">Correct Answer</Badge>
                      )}
                      {sectionStatuses[sectionKey] === "approved" && (
                        <Badge className="bg-green-500">Approved</Badge>
                      )}
                      {sectionStatuses[sectionKey] === "rejected" && (
                        <Badge className="bg-red-500">Rejected</Badge>
                      )}
                    </div>
                    {editingSection !== sectionKey && (
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleSectionApprove(sectionKey)}
                          variant="primary"
                          size="sm"
                          disabled={sectionStatuses[sectionKey] === "approved"}
                        >
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleSectionReject(sectionKey)}
                          variant="secondary"
                          size="sm"
                          disabled={sectionStatuses[sectionKey] === "rejected"}
                        >
                          Reject
                        </Button>
                        <Button
                          onClick={() => handleStartEdit(sectionKey)}
                          variant="secondary"
                          size="sm"
                        >
                          Edit
                        </Button>
                      </div>
                    )}
                  </div>
                  {editingSection === sectionKey ? (
                    <div className="space-y-3 mt-3">
                      <textarea
                        value={value}
                        onChange={(e) => {
                          const newOptions = {
                            ...(editedContent.options || question.options),
                            [key]: e.target.value,
                          };
                          setEditedContent({ ...editedContent, options: newOptions });
                        }}
                        className="w-full min-h-[100px] px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-white font-mono text-sm"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() =>
                            handleSectionEdit(sectionKey, editedContent.options?.[key] || value)
                          }
                          variant="primary"
                          size="sm"
                        >
                          Save
                        </Button>
                        <Button
                          onClick={handleCancelEdit}
                          variant="secondary"
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                    ) : (
                      <div className="mt-2 p-3 bg-neutral-900/50 rounded">
                        <MathContent content={value} className="text-base leading-relaxed" />
                      </div>
                    )}
                </div>
              );
            })}
        </div>
      </Card>

      {/* Solution Reasoning Section */}
      {question.solution_reasoning && (
        <SectionReviewCard
          title="Solution Reasoning"
          content={
            editedContent.solution_reasoning || question.solution_reasoning || ""
          }
          sectionKey="solution_reasoning"
          onApprove={handleSectionApprove}
          onReject={handleSectionReject}
          onEdit={handleSectionEdit}
          approved={sectionStatuses["solution_reasoning"] === "approved"}
          rejected={sectionStatuses["solution_reasoning"] === "rejected"}
          isEditing={editingSection === "solution_reasoning"}
          onStartEdit={handleStartEdit}
          onCancelEdit={handleCancelEdit}
        />
      )}

      {/* Solution Key Insight Section */}
      {question.solution_key_insight && (
        <SectionReviewCard
          title="Solution Key Insight"
          content={
            editedContent.solution_key_insight || question.solution_key_insight || ""
          }
          sectionKey="solution_key_insight"
          onApprove={handleSectionApprove}
          onReject={handleSectionReject}
          onEdit={handleSectionEdit}
          approved={sectionStatuses["solution_key_insight"] === "approved"}
          rejected={sectionStatuses["solution_key_insight"] === "rejected"}
          isEditing={editingSection === "solution_key_insight"}
          onStartEdit={handleStartEdit}
          onCancelEdit={handleCancelEdit}
        />
      )}

      {/* Distractor Analysis Section */}
      {question.distractor_map && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Distractor Analysis</h3>
          <div className="space-y-4">
            {Object.entries(
              editedContent.distractor_map || question.distractor_map || {}
            )
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, value]) => {
                const sectionKey = `distractor_${key}`;
                return (
                  <div key={key} className="p-4 rounded bg-neutral-800/50 border border-neutral-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{key}:</span>
                      {editingSection !== sectionKey && (
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleSectionApprove(sectionKey)}
                            variant="primary"
                            size="sm"
                            disabled={sectionStatuses[sectionKey] === "approved"}
                          >
                            Approve
                          </Button>
                          <Button
                            onClick={() => handleSectionReject(sectionKey)}
                            variant="secondary"
                            size="sm"
                            disabled={sectionStatuses[sectionKey] === "rejected"}
                          >
                            Reject
                          </Button>
                          <Button
                            onClick={() => handleStartEdit(sectionKey)}
                            variant="secondary"
                            size="sm"
                          >
                            Edit
                          </Button>
                        </div>
                      )}
                    </div>
                    {editingSection === sectionKey ? (
                      <div className="space-y-3 mt-3">
                        <textarea
                          value={value}
                          onChange={(e) => {
                            const newDistractors = {
                              ...(editedContent.distractor_map || question.distractor_map),
                              [key]: e.target.value,
                            };
                            setEditedContent({
                              ...editedContent,
                              distractor_map: newDistractors,
                            });
                          }}
                          className="w-full min-h-[100px] px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-white font-mono text-sm"
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() =>
                              handleSectionEdit(
                                sectionKey,
                                editedContent.distractor_map?.[key] || value
                              )
                            }
                            variant="primary"
                            size="sm"
                          >
                            Save
                          </Button>
                          <Button
                            onClick={handleCancelEdit}
                            variant="secondary"
                            size="sm"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <MathContent content={value} className="text-sm" />
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </Card>
      )}

      {/* Overall Question Actions */}
      <Card className="p-6 bg-neutral-800/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2">Overall Question Status</h3>
            <p className="text-sm text-neutral-400">
              {allSectionsApproved
                ? "All sections approved - ready to approve question"
                : "Review each section individually"}
            </p>
          </div>
          {allSectionsApproved && (
            <Badge className="bg-green-500">All Sections Approved</Badge>
          )}
        </div>
      </Card>
    </div>
  );
}

