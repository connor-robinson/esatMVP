import { EsatUiPreviewPlayer } from "@/components/questionBank/esatUiPreview/EsatUiPreviewPlayer";
import { buildNoIndexMetadata } from "@/lib/seo/noIndex";

export const metadata = buildNoIndexMetadata({
  title: "ESAT UI preview (question bank)",
});

/**
 * Sandbox: Pearson/ESAT demo layout restyled in dark mode with
 * question-bank behaviours (instant mark, reveal, explanation, progress).
 * Uses the first 10 Math 1 calibration questions. Not linked from nav.
 */
export default function EsatUiPreviewPage() {
  return <EsatUiPreviewPlayer />;
}
