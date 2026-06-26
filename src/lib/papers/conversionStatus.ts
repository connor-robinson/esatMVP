import fs from "fs";
import path from "path";
import type { ConversionRunStatus } from "@/types/conversions";

export const CONVERSION_STATUS_FILE = path.join(
  process.cwd(),
  "question-generation",
  "past_paper_converter",
  ".conversion_status.json",
);

export const CONVERSION_WRAPPER_SCRIPT = path.join(
  process.cwd(),
  "question-generation",
  "past_paper_converter",
  "run_with_progress.py",
);

export function readConversionStatus(): ConversionRunStatus {
  try {
    if (fs.existsSync(CONVERSION_STATUS_FILE)) {
      return JSON.parse(fs.readFileSync(CONVERSION_STATUS_FILE, "utf-8"));
    }
  } catch (error) {
    console.error("[conversionStatus] read error:", error);
  }
  return {
    status: "idle",
    total: 0,
    completed: 0,
    successful: 0,
    failed: 0,
  };
}

export function writeConversionStatus(status: ConversionRunStatus): void {
  try {
    fs.writeFileSync(CONVERSION_STATUS_FILE, JSON.stringify(status, null, 2));
  } catch (error) {
    console.error("[conversionStatus] write error:", error);
  }
}
