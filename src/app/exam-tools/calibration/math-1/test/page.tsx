import type { Metadata } from "next";
import { CalibrationTest } from "@/components/calibration/CalibrationTest";

export const metadata: Metadata = {
  title: "Math 1 Calibration Test",
  robots: { index: false },
};

export default function CalibrationTestPage() {
  return <CalibrationTest />;
}
