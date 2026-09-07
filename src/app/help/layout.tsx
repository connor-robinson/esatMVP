import type { Metadata } from "next";
import { buildNoIndexMetadata } from "@/lib/seo/noIndex";

/**
 * Thin signed-in support form. Keep crawlable so Google can see noindex, but
 * do not treat it as an indexable landing page.
 */
export const metadata: Metadata = buildNoIndexMetadata({
  title: "Help & Contact | ESATCAMP",
  description:
    "Get help with ESATCAMP. Contact support about your account, billing, or ESAT and TMUA preparation tools.",
});

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
