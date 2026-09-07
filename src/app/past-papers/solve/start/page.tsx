import { Suspense } from "react";
import { LoadingPage } from "@/components/shared/LoadingPage";
import { StartPastPaperClient } from "./StartPastPaperClient";

export const dynamic = "force-dynamic";

export default function StartPastPaperPage() {
  return (
    <Suspense
      fallback={
        <LoadingPage
          variant="session"
          hint="Sit the paper under timed conditions, then mark with the answer key."
          message="Starting your paper"
        />
      }
    >
      <StartPastPaperClient />
    </Suspense>
  );
}
