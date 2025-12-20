/**
 * Question Bank home page
 * This is a placeholder - will be implemented later
 */

"use client";

import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";

export default function QuestionBankPage() {
  return (
    <Container size="lg" className="py-10">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-white/90 mb-2">Question Bank</h1>
          <p className="text-white/60">
            Browse and practice from our collection of questions
          </p>
        </div>

        <Card className="p-8 text-center">
          <p className="text-white/70">
            Question Bank interface coming soon...
          </p>
        </Card>
      </div>
    </Container>
  );
}


