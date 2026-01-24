/**
 * Section Completion Summary Component - Shows all completed sections before marking
 */

"use client";

import { Button } from "@/components/ui/Button";
import type { PaperSection } from "@/types/papers";
import { getSectionColor } from "@/config/colors";

interface SectionCompletionSummaryProps {
  selectedSections: PaperSection[];
  onNext: () => void;
}

export function SectionCompletionSummary({
  selectedSections,
  onNext,
}: SectionCompletionSummaryProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-8 py-16">
      <div className="w-full max-w-3xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-neutral-100">
            You have completed:
          </h1>
        </div>

        {/* Completed Sections List */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 justify-center">
            {selectedSections.map((section, index) => (
              <div
                key={index}
                className="px-4 py-2 rounded-lg text-base font-medium text-white shadow-lg"
                style={{ backgroundColor: getSectionColor(section) }}
              >
                {section}
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-4 text-neutral-300 text-center">
          <p className="text-base leading-relaxed">
            Great work! You've completed all sections. You can now review your answers and see how you performed.
          </p>
        </div>

        {/* Next Button */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={onNext}
            variant="primary"
            className="px-8 py-3 text-base font-medium"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

