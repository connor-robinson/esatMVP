"use client";

import { MathContent } from "@/components/shared/MathContent";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface QuestionReviewCardProps {
  question: {
    id: string;
    generation_id: string;
    schema_id: string;
    difficulty: string;
    question_stem: string;
    correct_option: string;
    created_at: string;
  };
  onClick: () => void;
}

export function QuestionReviewCard({ question, onClick }: QuestionReviewCardProps) {
  return (
    <Card
      className="p-4 cursor-pointer hover:bg-neutral-800 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge variant="default">{question.schema_id}</Badge>
          <Badge variant="default">{question.difficulty}</Badge>
        </div>
        <span className="text-xs text-neutral-400">
          {new Date(question.created_at).toLocaleDateString()}
        </span>
      </div>
      
      <div className="mt-2">
        <MathContent
          content={question.question_stem}
          className="text-sm line-clamp-2"
        />
      </div>
      
      <div className="mt-2 text-xs text-neutral-400">
        Correct: {question.correct_option} • ID: {question.generation_id}
      </div>
    </Card>
  );
}

