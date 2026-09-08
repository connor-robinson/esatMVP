import type { Metadata } from "next";
import { noIndexFollowMetadata } from "@/lib/seo/noIndex";

export const metadata: Metadata = {
  ...noIndexFollowMetadata,
  title: "Feedback",
};

export default function FeedbackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
