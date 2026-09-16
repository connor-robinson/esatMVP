/**
 * Client hub for Past Papers layout preference.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { PastPapersPreferenceChooser } from "@/components/papers/PastPapersPreferenceChooser";
import {
  applyPastPapersUiPreference,
  pathForPastPapersPreference,
  readPastPapersUiPreference,
  type PastPapersUiPreference,
} from "@/lib/papers/pastPapersUiPreference";

export function PastPapersHubClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const forceChoose = searchParams.get("choose") === "1";
  const [ready, setReady] = useState(false);
  const [showChooser, setShowChooser] = useState(false);

  useEffect(() => {
    const existing = readPastPapersUiPreference();
    if (!forceChoose && existing) {
      router.replace(pathForPastPapersPreference(existing));
      return;
    }
    setShowChooser(true);
    setReady(true);
  }, [forceChoose, router]);

  const handleChoose = (preference: PastPapersUiPreference) => {
    const href = applyPastPapersUiPreference(preference);
    router.replace(href);
  };

  if (!ready || !showChooser) {
    return (
      <Container className="flex min-h-[50vh] items-center justify-center py-10">
        <div
          className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"
          aria-label="Loading past papers"
        />
      </Container>
    );
  }

  return (
    <Container size="lg" className="py-10 sm:py-14">
      <PastPapersPreferenceChooser
        onChoose={handleChoose}
        compact={forceChoose}
      />
    </Container>
  );
}
