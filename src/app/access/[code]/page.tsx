"use client";

import { useParams } from "next/navigation";
import { AccessClaimPanel } from "@/components/partners/AccessClaimPanel";

export default function AccessCodePage() {
  const params = useParams();
  const code = decodeURIComponent(String(params.code ?? "")).trim();
  return <AccessClaimPanel code={code} />;
}
