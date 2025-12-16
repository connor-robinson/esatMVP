"use client";

import { useQuicklink } from "@/hooks/useQuicklink";

export function QuicklinkProvider({ children }: { children: React.ReactNode }) {
  useQuicklink();
  return <>{children}</>;
}



