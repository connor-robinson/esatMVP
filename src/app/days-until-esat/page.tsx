import type { Metadata } from "next";
import { DaysUntilEsatClient } from "@/components/daysUntilEsat/DaysUntilEsatClient";
import { buildSeoMetadata } from "@/lib/seo/config";

const PATH = "/days-until-esat";

const TITLE = "Days Until ESAT";
const DESCRIPTION =
  "Countdown to your ESAT sitting. Pick October 2026 (12–16 Oct) or January 2027 (4–8 Jan). Your date is saved locally.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "days until ESAT",
    "ESAT countdown",
    "ESAT October 2026",
    "ESAT January 2027",
  ],
});

export default function DaysUntilEsatPage() {
  return <DaysUntilEsatClient />;
}
