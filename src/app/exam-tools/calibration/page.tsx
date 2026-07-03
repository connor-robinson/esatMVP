import { redirect } from "next/navigation";
import { CALIBRATION_ROUTES } from "@/lib/calibration/constants";

/** Exam Tools → Calibration index. Currently a single Math 1 form. */
export default function CalibrationIndexPage() {
  redirect(CALIBRATION_ROUTES.math1);
}
