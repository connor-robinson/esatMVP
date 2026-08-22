import type { Metadata } from "next";
import { buildSeoMetadata } from "@/lib/seo/config";

export const metadata: Metadata = buildSeoMetadata({
  title: "ESATCAMP Pricing | ESAT & TMUA Prep Plans",
  description:
    "Compare ESATCAMP free and paid plans. Unlock full past papers, the question bank, mental maths drills and analytics for ESAT and TMUA preparation.",
  path: "/pricing",
});

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
