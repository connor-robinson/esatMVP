import type { ReactNode } from "react";

/**
 * Dark shell for crawlable mock HTML pages (matches /esat-mock-tests chrome).
 */
export default function EsatMockHtmlPaperLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0A0F1D] text-white">{children}</div>
  );
}
