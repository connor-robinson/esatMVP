/**
 * Question Bank Page - Redirect to Bank
 * Redirects to /questions/bank for backward compatibility
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Container } from "@/components/layout/Container";

export default function QuestionBankRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/questions/questionbank');
  }, [router]);

  return (
    <Container>
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    </Container>
  );
}
