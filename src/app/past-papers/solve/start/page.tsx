import { Suspense } from "react";
import { PearsonPleaseWaitScreen } from "@/components/pearson/PearsonPleaseWaitScreen";
import { StartPastPaperClient } from "./StartPastPaperClient";

export const dynamic = "force-dynamic";

export default function StartPastPaperPage() {
  return (
    <Suspense fallback={<PearsonPleaseWaitScreen />}>
      <StartPastPaperClient />
    </Suspense>
  );
}
