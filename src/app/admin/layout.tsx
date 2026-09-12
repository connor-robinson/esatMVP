import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { noIndexFollowMetadata } from "@/lib/seo/noIndex";

export const metadata: Metadata = noIndexFollowMetadata;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
