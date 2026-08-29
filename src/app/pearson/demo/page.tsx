import { redirect } from "next/navigation";

/** Legacy URL: sample sandbox moved to live NSAA 2023 paper demo. */
export default function PearsonDemoRedirectPage() {
  redirect("/past-papers/pearson-demo");
}
