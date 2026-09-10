import type { Metadata } from "next";
import { AccessHelpControl } from "@/components/partners/AccessHelpControl";
import { noIndexFollowMetadata } from "@/lib/seo/noIndex";

export const metadata: Metadata = noIndexFollowMetadata;

export default function AccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <AccessHelpControl />
    </>
  );
}
