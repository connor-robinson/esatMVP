import type { Metadata } from "next";
import { CalibrationPearsonBridge } from "@/components/calibration/CalibrationPearsonBridge";

export const metadata: Metadata = {
  title: "Math 1 Calibration Test",
  robots: { index: false, follow: true },
};

export default function CalibrationTestPage() {
  return <CalibrationPearsonBridge />;
}
