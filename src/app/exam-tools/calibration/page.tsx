import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CALIBRATION_ROUTES } from "@/lib/calibration/constants";
import { noIndexFollowMetadata } from "@/lib/seo/noIndex";

/** Exam Tools → Calibration index. Currently a single Math 1 form. */
export const metadata: Metadata = noIndexFollowMetadata;

export default function CalibrationIndexPage() {
  redirect(CALIBRATION_ROUTES.math1);
}
