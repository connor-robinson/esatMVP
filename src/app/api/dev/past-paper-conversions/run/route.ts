import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { isQuestionGenerationEnabled } from "@/lib/features";
import {
  readConversionStatus,
  writeConversionStatus,
} from "@/lib/papers/conversionStatus";
import type { ConversionRunStatus } from "@/types/conversions";

const execAsync = promisify(exec);

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isQuestionGenerationEnabled()) {
    return NextResponse.json({ error: "Not enabled in this environment" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const paperId = Number(body.paperId);
    const limit = body.limit != null ? Number(body.limit) : undefined;
    const dryRun = Boolean(body.dryRun);

    if (!Number.isFinite(paperId) || paperId <= 0) {
      return NextResponse.json({ error: "paperId is required" }, { status: 400 });
    }

    const current = readConversionStatus();
    if (current.status === "running") {
      return NextResponse.json({ error: "Conversion already in progress" }, { status: 400 });
    }

    if (!fs.existsSync(path.join(process.cwd(), "question-generation", "past_paper_converter", "run_with_progress.py"))) {
      return NextResponse.json(
        { error: "Conversion script not found (past_paper_converter/run_with_progress.py)" },
        { status: 500 },
      );
    }

    const initial: ConversionRunStatus = {
      status: "running",
      total: 0,
      completed: 0,
      successful: 0,
      failed: 0,
      message: "Starting conversion...",
      paperId,
    };
    writeConversionStatus(initial);

    const pythonCmd = process.platform === "win32" ? "python" : "python3";
    const args = ["-m", "past_paper_converter.run_with_progress", "--paper-id", String(paperId)];
    if (limit != null && Number.isFinite(limit) && limit > 0) {
      args.push("--limit", String(limit));
    }
    if (dryRun) args.push("--dry-run");
    const command = `${pythonCmd} ${args.join(" ")}`;
    const cwd = path.join(process.cwd(), "question-generation");

    execAsync(command, { cwd, env: process.env })
      .then(() => {
        const final = readConversionStatus();
        final.status = "completed";
        writeConversionStatus(final);
      })
      .catch((error: Error & { stdout?: string; stderr?: string }) => {
        const after = readConversionStatus();
        if (after.status === "running") {
          writeConversionStatus({
            ...after,
            status: "error",
            error: error.message || "Script execution failed",
            message: `Conversion failed: ${error.message || "Unknown error"}`,
          });
        } else {
          after.status = "completed";
          writeConversionStatus(after);
        }
      });

    return NextResponse.json({ message: "Conversion started", status: "running" });
  } catch (error) {
    console.error("[dev/past-paper-conversions/run]", error);
    return NextResponse.json({ error: "Failed to start conversion" }, { status: 500 });
  }
}
