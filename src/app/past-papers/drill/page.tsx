import { redirect } from "next/navigation";

/** Legacy drill stub → Mistakes */
export default function PapersDrillRedirectPage() {
  redirect("/past-papers/mistakes");
}
