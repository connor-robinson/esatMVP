import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

const STATUS_FILE = path.join(process.cwd(), "scripts", "esat_question_generator", ".generation_status.json");

export async function POST() {
  try {
    // Read current status
    let currentStatus: any = {
      status: "idle",
      total: 0,
      completed: 0,
      successful: 0,
      failed: 0,
    };

    if (fs.existsSync(STATUS_FILE)) {
      try {
        const content = fs.readFileSync(STATUS_FILE, "utf-8");
        currentStatus = JSON.parse(content);
      } catch (error) {
        console.error("Error reading status file:", error);
      }
    }

    // Update status to indicate stop was requested
    const stoppedStatus = {
      ...currentStatus,
      status: "stopped" as const,
      message: "Generation stopped by user",
    };

    // Write stopped status
    try {
      fs.writeFileSync(STATUS_FILE, JSON.stringify(stoppedStatus, null, 2));
    } catch (error) {
      console.error("Error writing status file:", error);
    }

    // Note: We can't actually kill the Python process from here,
    // but we can mark it as stopped so the UI reflects that.
    // The Python script should check the status file periodically
    // and stop if status is "stopped"

    return NextResponse.json({
      message: "Stop request sent",
      status: "stopped",
    });
  } catch (error) {
    console.error("Error stopping generation:", error);
    return NextResponse.json(
      { error: "Failed to stop generation" },
      { status: 500 }
    );
  }
}






























