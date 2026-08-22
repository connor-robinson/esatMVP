import type { Metadata } from "next";
import { buildSeoMetadata } from "@/lib/seo/config";

export const metadata: Metadata = buildSeoMetadata({
  title: "Help & Contact | ESATCAMP",
  description:
    "Get help with ESATCAMP. Contact support about your account, billing, or ESAT and TMUA preparation tools.",
  path: "/help",
});

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
