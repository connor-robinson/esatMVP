"use client";

import { useMemo } from "react";
import { Calendar, Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { calculateDaysUntilExam, formatExamDateRange, getExamDateDisplay, type ExamType } from "@/lib/profile/countdown";
import { cn } from "@/lib/utils";

interface CountdownCardProps {
  examType: ExamType | null;
  isEarlyApplicant: boolean;
}

export function CountdownCard({ examType, isEarlyApplicant }: CountdownCardProps) {
  const daysUntil = useMemo(() => calculateDaysUntilExam(examType, isEarlyApplicant), [examType, isEarlyApplicant]);
  const dateRange = useMemo(() => formatExamDateRange(examType, isEarlyApplicant), [examType, isEarlyApplicant]);
  const examDisplay = useMemo(() => getExamDateDisplay(examType, isEarlyApplicant), [examType, isEarlyApplicant]);

  if (!examType) {
    return (
      <Card className="p-6 bg-surface border border-border">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-text-subtle" strokeWidth={2} />
            <h3 className="text-sm font-mono text-text-subtle uppercase tracking-wide">
              Exam Countdown
            </h3>
          </div>
          <div className="text-sm text-text-muted font-mono">
            Select an exam type in settings to see countdown
          </div>
        </div>
      </Card>
    );
  }

  const isPast = daysUntil !== null && daysUntil < 0;
  const isSoon = daysUntil !== null && daysUntil <= 30 && daysUntil >= 0;
  const isVerySoon = daysUntil !== null && daysUntil <= 7 && daysUntil >= 0;

  return (
    <Card className={cn(
      "p-6 bg-surface border transition-all duration-fast ease-signature",
      isVerySoon ? "border-error/30 bg-error/5" : isSoon ? "border-warning/30 bg-warning/5" : "border-border"
    )}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Calendar className={cn(
            "w-5 h-5 transition-colors",
            isVerySoon ? "text-error" : isSoon ? "text-warning" : "text-text-subtle"
          )} strokeWidth={2} />
          <h3 className="text-sm font-mono text-text-subtle uppercase tracking-wide">
            Exam Countdown
          </h3>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-mono text-text-subtle uppercase tracking-wide">
            {examType}
          </div>
          
          {dateRange && (
            <div className="text-sm text-text-muted font-mono">
              {dateRange}
            </div>
          )}

          {daysUntil !== null && (
            <div className="pt-2">
              {isPast ? (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-text-subtle" strokeWidth={2} />
                  <span className="text-lg font-mono text-text-subtle">
                    Exam has passed
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Clock className={cn(
                    "w-4 h-4 transition-colors",
                    isVerySoon ? "text-error" : isSoon ? "text-warning" : "text-text-muted"
                  )} strokeWidth={2} />
                  <span className={cn(
                    "text-2xl font-mono font-semibold transition-colors",
                    isVerySoon ? "text-error" : isSoon ? "text-warning" : "text-text"
                  )}>
                    {daysUntil} {daysUntil === 1 ? 'day' : 'days'}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="text-xs font-mono text-text-disabled pt-2 border-t border-border-subtle">
            {isEarlyApplicant ? 'Early Applicant' : 'Late Applicant'}
          </div>
        </div>
      </div>
    </Card>
  );
}

