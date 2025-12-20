import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

const STATUS_FILE = path.join(process.cwd(), "scripts", "esat_question_generator", ".generation_status.json");

interface GenerationStatus {
  status: "idle" | "running" | "completed" | "error";
  total: number;
  completed: number;
  successful: number;
  failed: number;
  message?: string;
  error?: string;
}

function writeStatus(status: GenerationStatus) {
  try {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
  } catch (error) {
    console.error("Error writing status file:", error);
  }
}

export async function POST() {
  console.log("[API] POST /api/questions/generate/reset - Resetting status");
  
  const resetStatus: GenerationStatus = {
    status: "idle",
    total: 0,
    completed: 0,
    successful: 0,
    failed: 0,
    message: "Status reset",
  };
  
  writeStatus(resetStatus);
  console.log("[API] Status reset to:", resetStatus);
  
  return NextResponse.json({ 
    message: "Status reset successfully", 
    status: resetStatus 
  });
}


