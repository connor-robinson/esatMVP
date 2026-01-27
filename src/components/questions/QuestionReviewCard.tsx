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
    primary_tag?: string | null;
    secondary_tags?: string[] | null;
    subjects?: string | null;
    created_at: string;
  };
  onClick: () => void;
}

// Helper function to get subject color
const getSubjectColor = (subjects: string | null | undefined): string => {
  if (!subjects) return 'bg-white/10 text-white/70';
  
  const subjectsLower = subjects.toLowerCase().trim();
  
  if (subjectsLower === 'math 1' || subjectsLower === 'math1') {
    return 'bg-[#406166]/20 text-[#5da8f0]';
  }
  if (subjectsLower === 'math 2' || subjectsLower === 'math2') {
    return 'bg-[#406166]/20 text-[#5da8f0]';
  }
  if (subjectsLower === 'physics') {
    return 'bg-[#2f2835]/30 text-[#a78bfa]';
  }
  if (subjectsLower === 'chemistry') {
    return 'bg-[#854952]/20 text-[#ef7d7d]';
  }
  if (subjectsLower === 'biology') {
    return 'bg-[#506141]/20 text-[#85BC82]';
  }
  if (subjectsLower === 'paper 1' || subjectsLower === 'paper1') {
    return 'bg-[#406166]/20 text-[#5da8f0]';
  }
  if (subjectsLower === 'paper 2' || subjectsLower === 'paper2') {
    return 'bg-[#406166]/20 text-[#5da8f0]';
  }
  
  return 'bg-white/10 text-white/70';
};

export function QuestionReviewCard({ question, onClick }: QuestionReviewCardProps) {
  return (
    <Card
      className="p-4 cursor-pointer hover:bg-neutral-800 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="default">{question.schema_id}</Badge>
          <Badge variant="default">{question.difficulty}</Badge>
          {question.subjects && (
            <Badge className={getSubjectColor(question.subjects)}>
              {question.subjects}
            </Badge>
          )}
          {question.primary_tag ? (
            <Badge className="bg-blue-500" title={question.primary_tag}>
              {question.primary_tag.length > 30 
                ? question.primary_tag.substring(0, 30) + '...' 
                : question.primary_tag}
            </Badge>
          ) : (
            <Badge variant="default" className="text-neutral-400 border-neutral-600">
              No tag
            </Badge>
          )}
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

