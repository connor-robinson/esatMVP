/**
 * Legacy Roadmap URL. Redirects to Past Papers Home.
 */

import { redirect } from "next/navigation";
import { PAST_PAPERS_HOME_PATH } from "@/lib/papers/pastPapersUiPreference";

export default function PastPapersRoadmapRedirectPage() {
  redirect(PAST_PAPERS_HOME_PATH);
}
