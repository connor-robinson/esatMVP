/**
 * Mark Page Intro Component - Shows instructions before marking
 */

"use client";

import { Button } from "@/components/ui/Button";

interface MarkPageIntroProps {
  onNext: () => void;
}

export function MarkPageIntro({
  onNext,
}: MarkPageIntroProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-8 py-16">
      <div className="w-full max-w-3xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-neutral-100">
            Marking Your Paper
          </h1>
        </div>

        {/* Instructions */}
        <div className="space-y-6 text-neutral-300">
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-neutral-100">
              How to use the marking page:
            </h2>
            
            <ul className="space-y-3 list-disc list-inside text-base leading-relaxed">
              <li>
                Review each question and compare your answer with the correct answer
              </li>
              <li>
                Mark questions as correct or incorrect using the checkboxes
              </li>
              <li>
                Add notes or explanations for questions you got wrong
              </li>
              <li>
                Flag questions you'd like to practice again in the drill
              </li>
              <li>
                Review your performance by section and overall
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-white/10">
            <p className="text-base leading-relaxed">
              Take your time to review your answers carefully. You can always come back to this page later from your session archive.
            </p>
          </div>
        </div>

        {/* Next Button */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={onNext}
            variant="primary"
            className="px-8 py-3 text-base font-medium"
          >
            Start Marking
          </Button>
        </div>
      </div>
    </div>
  );
}

