"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { AccessCodeEntry } from "@/components/partners/AccessCodeEntry";

function AccessCodePageInner() {
  const params = useParams();
  const code = decodeURIComponent(String(params.code ?? "")).trim();
  return <AccessCodeEntry initialCode={code} autoPeek />;
}

export default function AccessCodePage() {
  return (
    <Suspense fallback={null}>
      <AccessCodePageInner />
    </Suspense>
  );
}
