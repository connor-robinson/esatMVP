import type { Metadata } from "next";
import { noIndexFollowMetadata } from "@/lib/seo/noIndex";

/** Question bank application shell. Public SEO lives on `/is-esat-a-question-bank`. */
export const metadata: Metadata = noIndexFollowMetadata;

export default function QuestionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
