"use client";

import { Suspense } from "react";
import { AccessManualEntry } from "@/components/partners/AccessManualEntry";

export default function AccessPage() {
  return (
    <Suspense fallback={null}>
      <AccessManualEntry />
    </Suspense>
  );
}
