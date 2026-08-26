"use client";

import { Suspense } from "react";
import { AccessCodeEntry } from "@/components/partners/AccessCodeEntry";

export default function AccessPage() {
  return (
    <Suspense fallback={null}>
      <AccessCodeEntry />
    </Suspense>
  );
}
