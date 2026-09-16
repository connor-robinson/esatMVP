import { buildNoIndexMetadata } from "@/lib/seo/noIndex";
import { MockPearsonPreviewClient } from "./MockPearsonPreviewClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = buildNoIndexMetadata({
  title: "Mock Pearson preview",
});

export default function MockPearsonPreviewPage() {
  return <MockPearsonPreviewClient />;
}
