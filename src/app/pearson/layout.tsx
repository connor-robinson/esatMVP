import type { Metadata } from "next";
import { noIndexFollowMetadata } from "@/lib/seo/noIndex";

/**
 * Isolated Pearson / ESAT player sandbox. Not linked from the main past-papers flow.
 */
export const metadata: Metadata = {
  ...noIndexFollowMetadata,
  title: "ESAT player sandbox",
};

export default function PearsonSandboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
