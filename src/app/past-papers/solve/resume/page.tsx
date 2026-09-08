import { redirect } from "next/navigation";

/** Old paused-session screen. Sittings can no longer pause. */
export default function PastPaperResumeRedirectPage() {
  redirect("/past-papers/solve");
}
