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
      <Card className="p-6 bg-white/[0.02] border border-white/10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-white/60" strokeWidth={2} />
            <h3 className="text-sm font-mono text-white/60 uppercase tracking-wide">
              Exam Countdown
            </h3>
          </div>
          <div className="text-sm text-white/70 font-mono">
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
      "p-6 bg-white/[0.02] border transition-all duration-fast ease-signature",
      isVerySoon ? "border-red-500/30 bg-red-500/5" : isSoon ? "border-yellow-500/30 bg-yellow-500/5" : "border-white/10"
    )}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Calendar className={cn(
            "w-5 h-5 transition-colors",
            isVerySoon ? "text-red-400" : isSoon ? "text-yellow-400" : "text-white/60"
          )} strokeWidth={2} />
          <h3 className="text-sm font-mono text-white/60 uppercase tracking-wide">
            Exam Countdown
          </h3>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-mono text-white/50 uppercase tracking-wide">
            {examType}
          </div>
          
          {dateRange && (
            <div className="text-sm text-white/70 font-mono">
              {dateRange}
            </div>
          )}

          {daysUntil !== null && (
            <div className="pt-2">
              {isPast ? (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-white/50" strokeWidth={2} />
                  <span className="text-lg font-mono text-white/50">
                    Exam has passed
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Clock className={cn(
                    "w-4 h-4 transition-colors",
                    isVerySoon ? "text-red-400" : isSoon ? "text-yellow-400" : "text-white/70"
                  )} strokeWidth={2} />
                  <span className={cn(
                    "text-2xl font-mono font-semibold transition-colors",
                    isVerySoon ? "text-red-400" : isSoon ? "text-yellow-400" : "text-white/90"
                  )}>
                    {daysUntil} {daysUntil === 1 ? 'day' : 'days'}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="text-xs font-mono text-white/40 pt-2 border-t border-white/10">
            {isEarlyApplicant ? 'Early Applicant' : 'Late Applicant'}
          </div>
        </div>
      </div>
    </Card>
  );
}

