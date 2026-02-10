/**
 * Papers Submit page - Submission confirmation before marking
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { usePaperSessionStore } from "@/store/paperSessionStore";

export default function PapersSubmitPage() {
  const router = useRouter();
  const {
    sessionId,
    sessionName,
    paperName,
    timeLimitMinutes,
    startedAt,
    endedAt,
    getTotalQuestions,
    persistSessionToServer,
  } = usePaperSessionStore();
  
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  // Redirect if no active session
  useEffect(() => {
    if (!sessionId) {
      router.push("/past-papers/library");
    }
  }, [sessionId, router]);

  // Save session to server when page loads
  useEffect(() => {
    if (sessionId && !hasSaved && !isSaving) {
      setIsSaving(true);
      persistSessionToServer({ immediate: true })
        .then(() => {
          setHasSaved(true);
          setIsSaving(false);
        })
        .catch((error) => {
          console.error("Failed to save session:", error);
          setIsSaving(false);
        });
    }
  }, [sessionId, hasSaved, isSaving, persistSessionToServer]);

  const handleContinueToMark = () => {
    router.push("/past-papers/mark");
  };

  const totalQuestions = getTotalQuestions();
  const timeTaken = startedAt && endedAt ? Math.floor((endedAt - startedAt) / 1000) : 0;
  const minutes = Math.floor(timeTaken / 60);
  const seconds = timeTaken % 60;

  if (!sessionId) {
    return null; // Will redirect
  }

  return (
    <Container size="lg" className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-2xl space-y-8 text-center">
        {/* Main Message */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-neutral-100">
            You have submitted your page
          </h1>
          <p className="text-lg text-neutral-300">
            Move onto mark
          </p>
        </div>

        {/* Session Summary */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-neutral-200 mb-4">
            Session Summary
          </h2>
          
          <div className="grid grid-cols-2 gap-4 text-left">
            <div>
              <p className="text-sm text-neutral-400 mb-1">Session</p>
              <p className="text-base text-neutral-100">{sessionName || "Untitled Session"}</p>
            </div>
            
            <div>
              <p className="text-sm text-neutral-400 mb-1">Paper</p>
              <p className="text-base text-neutral-100">{paperName}</p>
            </div>
            
            <div>
              <p className="text-sm text-neutral-400 mb-1">Total Questions</p>
              <p className="text-base text-neutral-100">{totalQuestions}</p>
            </div>
            
            <div>
              <p className="text-sm text-neutral-400 mb-1">Time Taken</p>
              <p className="text-base text-neutral-100">
                {minutes > 0 ? `${minutes}m ` : ""}{seconds}s
              </p>
            </div>
          </div>
        </div>

        {/* Status Message */}
        {isSaving && (
          <div className="text-neutral-400">
            <p>Saving your session...</p>
          </div>
        )}

        {hasSaved && !isSaving && (
          <div className="text-green-400">
            <p>✓ Session saved successfully</p>
          </div>
        )}

        {/* Continue Button */}
        <div className="pt-4">
          <Button
            variant="primary"
            size="lg"
            onClick={handleContinueToMark}
            disabled={isSaving}
            className="px-8 py-3 text-base font-medium"
          >
            Continue to Mark
          </Button>
        </div>
      </div>
    </Container>
  );
}

