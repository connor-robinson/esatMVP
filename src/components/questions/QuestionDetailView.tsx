"use client";

import { MathContent } from "@/components/shared/MathContent";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface QuestionDetailViewProps {
  question: {
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
  };
}

export function QuestionDetailView({ question }: QuestionDetailViewProps) {
  return (
    <div className="space-y-4">
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

      {/* Question Stem */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Question</h3>
        <MathContent content={question.question_stem} className="text-base" />
      </Card>

      {/* Options */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Options</h3>
        <div className="space-y-3">
          {Object.entries(question.options || {})
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => (
              <div
                key={key}
                className={`p-3 rounded border ${
                  key === question.correct_option
                    ? "border-green-500 bg-green-500/10"
                    : "border-neutral-700"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="font-semibold">{key}:</span>
                  <MathContent content={value} className="flex-1" />
                  {key === question.correct_option && (
                    <Badge className="bg-green-500">Correct</Badge>
                  )}
                </div>
              </div>
            ))}
        </div>
      </Card>

      {/* Solution */}
      {(question.solution_reasoning || question.solution_key_insight) && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Solution</h3>
          {question.solution_reasoning && (
            <div className="mb-4">
              <h4 className="font-medium mb-2">Reasoning:</h4>
              <MathContent content={question.solution_reasoning} />
            </div>
          )}
          {question.solution_key_insight && (
            <div>
              <h4 className="font-medium mb-2">Key Insight:</h4>
              <MathContent content={question.solution_key_insight} />
            </div>
          )}
        </Card>
      )}

      {/* Distractor Analysis */}
      {question.distractor_map && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Distractor Analysis</h3>
          <div className="space-y-2">
            {Object.entries(question.distractor_map)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, value]) => (
                <div key={key} className="p-2 rounded bg-neutral-800">
                  <span className="font-semibold">{key}:</span>{" "}
                  <MathContent content={value} className="inline" />
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Verifier Report */}
      {question.verifier_report && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Verifier Report</h3>
          <div className="space-y-2">
            <div>
              <span className="font-medium">Verdict:</span>{" "}
              <Badge
                variant={
                  question.verifier_report.verdict === "PASS"
                    ? "success"
                    : "error"
                }
              >
                {question.verifier_report.verdict}
              </Badge>
            </div>
            {question.verifier_report.confidence && (
              <div>
                <span className="font-medium">Confidence:</span>{" "}
                {question.verifier_report.confidence}
              </div>
            )}
            {question.verifier_report.notes && (
              <div>
                <span className="font-medium">Notes:</span>
                <ul className="list-disc list-inside mt-1">
                  {Array.isArray(question.verifier_report.notes)
                    ? question.verifier_report.notes.map((note: string, i: number) => (
                        <li key={i}>{note}</li>
                      ))
                    : null}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Style Report */}
      {question.style_report && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Style Report</h3>
          <div className="space-y-2">
            <div>
              <span className="font-medium">Verdict:</span>{" "}
              <Badge
                variant={
                  question.style_report.verdict === "PASS"
                    ? "success"
                    : "error"
                }
              >
                {question.style_report.verdict}
              </Badge>
            </div>
            {question.style_report.scores && (
              <div>
                <span className="font-medium">Scores:</span>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {Object.entries(question.style_report.scores).map(
                    ([key, value]) => (
                      <div key={key} className="text-sm">
                        {key}: {String(value)}/10
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
            {question.style_report.summary && (
              <div className="mt-2">
                <span className="font-medium">Summary:</span>{" "}
                {question.style_report.summary}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

