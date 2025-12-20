import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { isQuestionGenerationEnabled } from "@/lib/features";

// Helper function to read GEMINI_API_KEY directly from .env.local file
// This ensures we always get the latest value, even if the server was started with an old key
function getGeminiApiKeyFromFile(): string | null {
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      const envLines = envContent.split("\n");
      for (const line of envLines) {
        const trimmed = line.trim();
        // Skip comments and empty lines
        if (!trimmed || trimmed.startsWith("#")) continue;
        
        // Handle GEMINI_API_KEY specifically
        if (trimmed.startsWith("GEMINI_API_KEY=")) {
          // Extract value, handling quotes and whitespace
          const match = trimmed.match(/^GEMINI_API_KEY=(.+)$/);
          if (match) {
            let value = match[1].trim();
            // Remove surrounding quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || 
                (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            return value || null;
          }
        }
      }
    }
  } catch (error) {
    console.error("[API] Error reading GEMINI_API_KEY from .env.local:", error);
  }
  return null;
}

const execAsync = promisify(exec);

interface GenerationStatus {
  status: "idle" | "running" | "completed" | "error" | "stopped";
  total: number;
  completed: number;
  successful: number;
  failed: number;
  message?: string;
  error?: string;
}

const STATUS_FILE = path.join(process.cwd(), "scripts", "esat_question_generator", ".generation_status.json");

function readStatus(): GenerationStatus {
  try {
    if (fs.existsSync(STATUS_FILE)) {
      const content = fs.readFileSync(STATUS_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("Error reading status file:", error);
  }
  return {
    status: "idle",
    total: 0,
    completed: 0,
    successful: 0,
    failed: 0,
  };
}

function writeStatus(status: GenerationStatus) {
  try {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
  } catch (error) {
    console.error("Error writing status file:", error);
  }
}

export async function POST(request: Request) {
  console.log("[API] POST /api/questions/generate called");
  
  // Check if feature is enabled
  const isEnabled = isQuestionGenerationEnabled();
  console.log("[API] Feature enabled:", isEnabled);
  
  if (!isEnabled) {
    console.log("[API] Feature disabled, returning 403");
    return NextResponse.json(
      { error: "Question generation is not enabled in this environment" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { count = 10, workers = 2 } = body;
    console.log("[API] Generation request:", { count, workers });

    // Check if already running
    const currentStatus = readStatus();
    console.log("[API] Current status:", currentStatus);
    
    if (currentStatus.status === "running") {
      console.log("[API] Generation already in progress");
      return NextResponse.json(
        { error: "Generation already in progress" },
        { status: 400 }
      );
    }

    // Initialize status
    const status: GenerationStatus = {
      status: "running",
      total: count,
      completed: 0,
      successful: 0,
      failed: 0,
      message: "Starting question generation...",
    };
    writeStatus(status);
    console.log("[API] Status initialized:", status);

    // Start generation in background
    const scriptPath = path.join(
      process.cwd(),
      "scripts",
      "esat_question_generator",
      "generate_with_progress.py"
    );
    console.log("[API] Script path:", scriptPath);
    console.log("[API] Script exists:", fs.existsSync(scriptPath));
    
    if (!fs.existsSync(scriptPath)) {
      console.error("[API] Script file not found:", scriptPath);
      return NextResponse.json(
        { error: `Script file not found: ${scriptPath}` },
        { status: 500 }
      );
    }

    // Set environment variables
    // IMPORTANT: Always read GEMINI_API_KEY directly from .env.local file
    // This ensures we get the latest value even if the server was started with an old key
    let geminiApiKey = getGeminiApiKeyFromFile();
    
    if (!geminiApiKey) {
      // Fallback to process.env if file reading fails
      geminiApiKey = process.env.GEMINI_API_KEY || null;
      if (geminiApiKey) {
        console.log("[API] Using GEMINI_API_KEY from process.env (fallback)");
      }
    } else {
      console.log("[API] Loaded GEMINI_API_KEY from .env.local file directly");
      // Also update process.env so other parts of the code can use it
      process.env.GEMINI_API_KEY = geminiApiKey;
    }
    
    const env = {
      ...process.env,
      N_ITEMS: count.toString(),
      MAX_WORKERS: workers.toString(),
      // Explicitly pass GEMINI_API_KEY
      GEMINI_API_KEY: geminiApiKey || process.env.GEMINI_API_KEY || "",
    };
    
    // Minimal logging - only log if key is missing
    if (!env.GEMINI_API_KEY) {
      console.error("[API] ERROR: GEMINI_API_KEY not found!");
    }
    
    // Verify GEMINI_API_KEY is available
    if (!env.GEMINI_API_KEY) {
      console.error("[API] ERROR: GEMINI_API_KEY not found in environment variables!");
      return NextResponse.json(
        { error: "GEMINI_API_KEY environment variable is not set. Please check your .env.local file." },
        { status: 500 }
      );
    }

    // Run the script asynchronously (use python3 on Unix, python on Windows)
    const pythonCmd = process.platform === "win32" ? "python" : "python3";
    const command = `${pythonCmd} "${scriptPath}"`;
    console.log("[API] Executing command:", command);
    console.log("[API] Working directory:", path.join(process.cwd(), "scripts", "esat_question_generator"));
    
    execAsync(
      command,
      {
        cwd: path.join(process.cwd(), "scripts", "esat_question_generator"),
        env,
        // Don't fail on non-zero exit codes - the script may complete with failures
        // but that's still a successful execution
      }
    )
      .then((result) => {
        console.log("[API] Script execution completed:", result);
        // Script completed - read the final status from the file
        const finalStatus = readStatus();
        console.log("[API] Final status from file:", finalStatus);
        // Ensure status is marked as completed
        finalStatus.status = "completed";
        writeStatus(finalStatus);
      })
      .catch((error) => {
        console.error("[API] Script execution error:", error);
        console.error("[API] Error details:", {
          message: error.message,
          code: (error as any).code,
          signal: (error as any).signal,
          stdout: (error as any).stdout,
          stderr: (error as any).stderr,
        });
        
        // Only treat as error if we can't read the status file
        // The script may exit with code 1 if all questions failed, but that's OK
        const currentStatus = readStatus();
        console.log("[API] Status after error:", currentStatus);
        
        if (currentStatus.status === "running") {
          // Script crashed unexpectedly
          const errorStatus: GenerationStatus = {
            status: "error",
            total: count,
            completed: currentStatus.completed || 0,
            successful: currentStatus.successful || 0,
            failed: currentStatus.failed || 0,
            error: error.message || "Script execution failed",
            message: `Generation failed: ${error.message || "Unknown error"}`,
          };
          writeStatus(errorStatus);
          console.log("[API] Wrote error status:", errorStatus);
        } else {
          // Script completed but may have had failures - that's OK
          const finalStatus = readStatus();
          finalStatus.status = "completed";
          writeStatus(finalStatus);
          console.log("[API] Wrote completed status:", finalStatus);
        }
      });

    return NextResponse.json({
      message: "Question generation started",
      status: "running",
    });
  } catch (error) {
    console.error("Error starting generation:", error);
    return NextResponse.json(
      { error: "Failed to start generation" },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return current generation status
  const status = readStatus();
  console.log("[API] GET /api/questions/generate - Current status:", status);
  return NextResponse.json(status);
}


