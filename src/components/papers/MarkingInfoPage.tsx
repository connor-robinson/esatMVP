/**
 * Marking Info Page Component - Combined completion summary and marking instructions with visual illustrations
 */

"use client";

import { Button } from "@/components/ui/Button";
import type { PaperSection } from "@/types/papers";
import { getSectionColor } from "@/config/colors";

interface MarkingInfoPageProps {
  selectedSections: PaperSection[];
  onNext: () => void;
}

export function MarkingInfoPage({
  selectedSections,
  onNext,
}: MarkingInfoPageProps) {
  return (
    <div className="flex flex-col items-center min-h-screen px-8 py-16">
      <div className="w-full max-w-4xl space-y-12">
        {/* Header with Completed Sections */}
        <div className="text-center space-y-6">
          <h1 className="text-3xl font-bold text-neutral-100">
            You have completed:
          </h1>
          
          {/* Completed Sections List */}
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
          
          <p className="text-lg text-neutral-300">
            Great work! Now let's review your answers and set up targeted practice.
          </p>
        </div>

        {/* Overview Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-neutral-100">
            1. Overview Section
          </h2>
          <p className="text-base text-neutral-300 leading-relaxed">
            The overview section at the top of the marking page shows your overall performance. You'll see:
          </p>
          <ul className="list-disc list-inside space-y-2 text-base text-neutral-300 ml-4">
            <li>Your total score and percentage</li>
            <li>Time taken for the entire paper</li>
            <li>Section-by-section breakdown with color-coded performance</li>
            <li>Percentile rankings (if available for your exam type)</li>
          </ul>
          
          {/* Screenshot placeholder */}
          <div className="mt-4 border-2 border-white/20 rounded-lg bg-black/30 p-6 flex items-center justify-center min-h-[300px]">
            <div className="text-center space-y-2">
              <svg className="w-16 h-16 mx-auto text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-neutral-500">Overview Section Screenshot</p>
              <p className="text-xs text-neutral-600">Replace with actual screenshot showing score, time, and section breakdown</p>
            </div>
          </div>
        </div>

        {/* Question Review Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-neutral-100">
            2. Question Review Section
          </h2>
          <p className="text-base text-neutral-300 leading-relaxed">
            Review each question individually in the main panel. For each question you can:
          </p>
          <ul className="list-disc list-inside space-y-2 text-base text-neutral-300 ml-4">
            <li><strong>Mark as correct/incorrect:</strong> Use the checkboxes to indicate whether your answer was right or wrong</li>
            <li><strong>Compare answers:</strong> See your selected answer alongside the correct answer</li>
            <li><strong>Add notes:</strong> Write explanations, working, or reminders for questions you got wrong</li>
            <li><strong>View solutions:</strong> See detailed solutions and explanations for each question</li>
            <li><strong>Review time spent:</strong> Check how long you spent on each question</li>
          </ul>
          
          {/* Screenshot placeholder */}
          <div className="mt-4 border-2 border-white/20 rounded-lg bg-black/30 p-6 flex items-center justify-center min-h-[300px]">
            <div className="text-center space-y-2">
              <svg className="w-16 h-16 mx-auto text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-neutral-500">Question Review Screenshot</p>
              <p className="text-xs text-neutral-600">Replace with actual screenshot showing question with answer comparison and notes</p>
            </div>
          </div>
        </div>

        {/* Mistake Analysis & Drill Setup - Most Important */}
        <div className="space-y-4 border-t border-white/20 pt-8">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold text-neutral-100">
              3. Mistake Analysis & Drill Setup
            </h2>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
              MOST IMPORTANT
            </span>
          </div>
          
          <div className="space-y-4">
            <p className="text-base text-neutral-300 leading-relaxed">
              <strong className="text-neutral-100">This is the most powerful feature for improving your performance.</strong> By analyzing your mistakes and setting up targeted practice, you can focus on exactly what you need to work on.
            </p>
            
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-blue-400">What are Mistake Tags?</h3>
              <p className="text-sm text-neutral-300 leading-relaxed">
                Mistake tags help you categorize why you got questions wrong. Common tags include:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-neutral-300 ml-4">
                <li><strong>Misread question</strong> - You misunderstood what was being asked</li>
                <li><strong>Rushed calculation</strong> - Made an arithmetic error under time pressure</li>
                <li><strong>Concept gap</strong> - Didn't understand the underlying concept</li>
                <li><strong>Method recall</strong> - Knew the concept but forgot the method</li>
                <li><strong>Careless arithmetic</strong> - Simple calculation mistakes</li>
                <li><strong>Time pressure</strong> - Ran out of time or rushed</li>
              </ul>
            </div>
            
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-green-400">What is the Drill?</h3>
              <p className="text-sm text-neutral-300 leading-relaxed">
                The drill is a personalized practice system that creates custom practice sessions based on your mistakes:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-neutral-300 ml-4">
                <li><strong>Targeted practice:</strong> Practice only the questions you got wrong</li>
                <li><strong>Mistake-focused:</strong> Questions are organized by mistake type so you can focus on specific weaknesses</li>
                <li><strong>Spaced repetition:</strong> The system helps you review mistakes at optimal intervals</li>
                <li><strong>Progress tracking:</strong> See how you improve on previously missed questions</li>
              </ul>
            </div>
            
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-purple-400">How to Set Up Your Drill:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-neutral-300 ml-4">
                <li>Scroll down to the <strong>"Mistake Analysis & Drill Setup"</strong> section</li>
                <li>For each question you got wrong, select one or more mistake tags that describe why you missed it</li>
                <li>Check the <strong>"Add to Drill"</strong> checkbox for questions you want to practice again</li>
                <li>The system will automatically create practice sessions from these questions</li>
                <li>You can access your drill from the Skills section to practice anytime</li>
              </ol>
            </div>
          </div>
          
          {/* Screenshot placeholder */}
          <div className="mt-4 border-2 border-white/20 rounded-lg bg-black/30 p-6 flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-2">
              <svg className="w-16 h-16 mx-auto text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-neutral-500">Mistake Analysis & Drill Setup Screenshot</p>
              <p className="text-xs text-neutral-600">Replace with actual screenshot showing mistake tags, drill checkboxes, and the mistake chart</p>
            </div>
          </div>
        </div>

        {/* Final Instructions */}
        <div className="border-t border-white/20 pt-6 space-y-4">
          <p className="text-base text-neutral-300 leading-relaxed">
            Take your time to review your answers carefully and set up your drill. This will help you identify patterns in your mistakes and create targeted practice sessions. You can always come back to this page later from your session archive.
          </p>
        </div>

        {/* Next Button */}
        <div className="flex justify-center pt-6">
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

