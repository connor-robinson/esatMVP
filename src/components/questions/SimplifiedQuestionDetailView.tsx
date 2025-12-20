"use client";

import { useState, useCallback } from "react";
import { MathContent } from "@/components/shared/MathContent";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

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
  primary_tag?: string | null;
  secondary_tags?: string[] | null;
  tags_confidence?: any;
  tags_labeled_at?: string | null;
  tags_labeled_by?: string | null;
  created_at: string;
}

interface SimplifiedQuestionDetailViewProps {
  question: Question;
  onUpdate?: (questionId: string, updates: Partial<Question>) => Promise<void>;
  onApprove?: (questionId: string) => Promise<void>;
  onReject?: (questionId: string) => Promise<void>;
}

export function SimplifiedQuestionDetailView({
  question,
  onUpdate,
  onApprove,
  onReject,
}: SimplifiedQuestionDetailViewProps) {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<Partial<Question>>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleStartEdit = useCallback((sectionKey: string) => {
    setEditingSection(sectionKey);
    // Initialize edited content with current values
    switch (sectionKey) {
      case "question_stem":
        setEditedContent(prev => ({ ...prev, question_stem: question.question_stem }));
        break;
      case "options":
        setEditedContent(prev => ({ ...prev, options: { ...question.options } }));
        break;
      case "solution_reasoning":
        setEditedContent(prev => ({ ...prev, solution_reasoning: question.solution_reasoning || "" }));
        break;
      case "solution_key_insight":
        setEditedContent(prev => ({ ...prev, solution_key_insight: question.solution_key_insight || "" }));
        break;
      case "distractor_map":
        setEditedContent(prev => ({ ...prev, distractor_map: { ...(question.distractor_map || {}) } }));
        break;
    }
  }, [question]);

  const handleSaveEdit = useCallback(async () => {
    if (!onUpdate || !editingSection) return;
    
    setIsSaving(true);
    try {
      await onUpdate(question.id, editedContent);
      setEditingSection(null);
    } catch (error) {
      console.error("Error saving edit:", error);
    } finally {
      setIsSaving(false);
    }
  }, [onUpdate, question.id, editedContent, editingSection]);

  const handleCancelEdit = useCallback(() => {
    setEditingSection(null);
    setEditedContent({});
  }, []);

  const handleApprove = useCallback(async () => {
    if (onApprove) {
      await onApprove(question.id);
    }
  }, [onApprove, question.id]);

  const handleReject = useCallback(async () => {
    if (onReject) {
      await onReject(question.id);
    }
  }, [onReject, question.id]);

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
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Question Stem</h3>
          {editingSection !== "question_stem" && (
            <Button
              onClick={() => handleStartEdit("question_stem")}
              variant="secondary"
              size="sm"
            >
              Edit
            </Button>
          )}
        </div>
        {editingSection === "question_stem" ? (
          <div className="space-y-3">
            <textarea
              value={editedContent.question_stem || question.question_stem}
              onChange={(e) => setEditedContent(prev => ({ ...prev, question_stem: e.target.value }))}
              className="w-full min-h-[150px] px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-white font-mono text-sm"
            />
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSaveEdit}
                variant="primary"
                size="sm"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
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
          <div className="p-4 bg-neutral-900/50 rounded">
            <MathContent content={editedContent.question_stem || question.question_stem} className="text-base leading-relaxed" />
          </div>
        )}
      </Card>

      {/* Options Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Options</h3>
          {editingSection !== "options" && (
            <Button
              onClick={() => handleStartEdit("options")}
              variant="secondary"
              size="sm"
            >
              Edit All Options
            </Button>
          )}
        </div>
        {editingSection === "options" ? (
          <div className="space-y-4">
            {Object.entries(editedContent.options || question.options || {})
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-400">
                    Option {key} {key === question.correct_option && "(Correct)"}
                  </label>
                  <textarea
                    value={value}
                    onChange={(e) => {
                      const newOptions = {
                        ...(editedContent.options || question.options),
                        [key]: e.target.value,
                      };
                      setEditedContent(prev => ({ ...prev, options: newOptions }));
                    }}
                    className="w-full min-h-[80px] px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-white font-mono text-sm"
                  />
                </div>
              ))}
            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={handleSaveEdit}
                variant="primary"
                size="sm"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save All Options"}
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
          <div className="space-y-4">
            {Object.entries(editedContent.options || question.options || {})
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, value]) => {
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
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-lg">{key}:</span>
                      {isCorrect && (
                        <Badge className="bg-green-500">Correct Answer</Badge>
                      )}
                    </div>
                    <div className="mt-2">
                      <MathContent content={value} className="text-base leading-relaxed" />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </Card>

      {/* Solution Reasoning Section */}
      {question.solution_reasoning && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Solution Reasoning</h3>
            {editingSection !== "solution_reasoning" && (
              <Button
                onClick={() => handleStartEdit("solution_reasoning")}
                variant="secondary"
                size="sm"
              >
                Edit
              </Button>
            )}
          </div>
          {editingSection === "solution_reasoning" ? (
            <div className="space-y-3">
              <textarea
                value={editedContent.solution_reasoning || question.solution_reasoning || ""}
                onChange={(e) => setEditedContent(prev => ({ ...prev, solution_reasoning: e.target.value }))}
                className="w-full min-h-[150px] px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-white font-mono text-sm"
              />
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSaveEdit}
                  variant="primary"
                  size="sm"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save"}
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
            <div className="p-4 bg-neutral-900/50 rounded">
              <MathContent content={editedContent.solution_reasoning || question.solution_reasoning || ""} className="text-base leading-relaxed" />
            </div>
          )}
        </Card>
      )}

      {/* Solution Key Insight Section */}
      {question.solution_key_insight && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Solution Key Insight</h3>
            {editingSection !== "solution_key_insight" && (
              <Button
                onClick={() => handleStartEdit("solution_key_insight")}
                variant="secondary"
                size="sm"
              >
                Edit
              </Button>
            )}
          </div>
          {editingSection === "solution_key_insight" ? (
            <div className="space-y-3">
              <textarea
                value={editedContent.solution_key_insight || question.solution_key_insight || ""}
                onChange={(e) => setEditedContent(prev => ({ ...prev, solution_key_insight: e.target.value }))}
                className="w-full min-h-[100px] px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-white font-mono text-sm"
              />
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSaveEdit}
                  variant="primary"
                  size="sm"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save"}
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
            <div className="p-4 bg-neutral-900/50 rounded">
              <MathContent content={editedContent.solution_key_insight || question.solution_key_insight || ""} className="text-base leading-relaxed" />
            </div>
          )}
        </Card>
      )}

      {/* Distractor Analysis Section */}
      {question.distractor_map && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Distractor Analysis</h3>
            {editingSection !== "distractor_map" && (
              <Button
                onClick={() => handleStartEdit("distractor_map")}
                variant="secondary"
                size="sm"
              >
                Edit All Distractors
              </Button>
            )}
          </div>
          {editingSection === "distractor_map" ? (
            <div className="space-y-4">
              {Object.entries(editedContent.distractor_map || question.distractor_map || {})
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <label className="text-sm font-semibold text-neutral-400">
                      Distractor {key}
                    </label>
                    <textarea
                      value={value}
                      onChange={(e) => {
                        const newDistractors = {
                          ...(editedContent.distractor_map || question.distractor_map),
                          [key]: e.target.value,
                        };
                        setEditedContent(prev => ({ ...prev, distractor_map: newDistractors }));
                      }}
                      className="w-full min-h-[80px] px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-white font-mono text-sm"
                    />
                  </div>
                ))}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={handleSaveEdit}
                  variant="primary"
                  size="sm"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save All Distractors"}
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
            <div className="space-y-4">
              {Object.entries(editedContent.distractor_map || question.distractor_map || {})
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, value]) => (
                  <div key={key} className="p-4 rounded bg-neutral-800/50 border border-neutral-700">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">{key}:</span>
                    </div>
                    <div className="mt-2">
                      <MathContent content={value} className="text-sm" />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Card>
      )}

      {/* Tags Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Curriculum Tags</h3>
          {editingSection !== "tags" && (
            <Button
              onClick={() => setEditingSection("tags")}
              variant="secondary"
              size="sm"
            >
              Edit Tags
            </Button>
          )}
        </div>
        {editingSection === "tags" ? (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold mb-2">Primary Tag</label>
              <input
                type="text"
                value={editedContent.primary_tag || question.primary_tag || ""}
                onChange={(e) => setEditedContent(prev => ({ ...prev, primary_tag: e.target.value }))}
                placeholder="e.g., M1, MM1, P1"
                className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Secondary Tags (comma-separated)</label>
              <input
                type="text"
                value={(editedContent.secondary_tags || question.secondary_tags || []).join(", ")}
                onChange={(e) => {
                  const tags = e.target.value.split(",").map(t => t.trim()).filter(t => t);
                  setEditedContent(prev => ({ ...prev, secondary_tags: tags }));
                }}
                placeholder="e.g., M2, M3"
                className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={async () => {
                  if (onUpdate) {
                    setIsSaving(true);
                    try {
                      await onUpdate(question.id, {
                        primary_tag: editedContent.primary_tag,
                        secondary_tags: editedContent.secondary_tags,
                      });
                      setEditingSection(null);
                    } catch (error) {
                      console.error("Error saving tags:", error);
                    } finally {
                      setIsSaving(false);
                    }
                  }
                }}
                variant="primary"
                size="sm"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Tags"}
              </Button>
              <Button
                onClick={() => {
                  setEditingSection(null);
                  setEditedContent(prev => {
                    const { primary_tag, secondary_tags, ...rest } = prev;
                    return rest;
                  });
                }}
                variant="secondary"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {question.primary_tag ? (
              <div>
                <span className="text-sm font-semibold text-neutral-400">Primary: </span>
                <Badge className="bg-blue-500">{question.primary_tag}</Badge>
              </div>
            ) : (
              <div className="text-sm text-neutral-500">No primary tag assigned</div>
            )}
            {question.secondary_tags && question.secondary_tags.length > 0 ? (
              <div>
                <span className="text-sm font-semibold text-neutral-400">Secondary: </span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {question.secondary_tags.map((tag) => (
                    <Badge key={tag} variant="default">{tag}</Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-neutral-500">No secondary tags</div>
            )}
            {question.tags_labeled_by && (
              <div className="text-xs text-neutral-500 mt-2">
                Labeled by: {question.tags_labeled_by}
                {question.tags_labeled_at && ` on ${new Date(question.tags_labeled_at).toLocaleDateString()}`}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Final Approve/Reject Actions */}
      <Card className="p-6 bg-neutral-800/50 border-2 border-neutral-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2">Question Review</h3>
            <p className="text-sm text-neutral-400">
              Review the question above. Click Approve to accept or Reject to decline.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleReject}
              variant="secondary"
              size="lg"
            >
              Reject
            </Button>
            <Button
              onClick={handleApprove}
              variant="primary"
              size="lg"
            >
              Approve Question
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

