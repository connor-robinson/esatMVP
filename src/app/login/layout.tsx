import type { Metadata } from "next";
import { noIndexFollowMetadata } from "@/lib/seo/noIndex";

export const metadata: Metadata = noIndexFollowMetadata;

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
