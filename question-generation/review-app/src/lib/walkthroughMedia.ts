import type { SupabaseClient } from "@supabase/supabase-js";

const CODE_RE = /^[A-Z]{2}\d{2}$/;

export function normalizeWalkthroughCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const c = raw.trim().toUpperCase();
  return CODE_RE.test(c) ? c : null;
}

function randomCode(): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  let s = "";
  for (let i = 0; i < 2; i++) s += letters[Math.floor(Math.random() * 26)];
  for (let i = 0; i < 2; i++) s += digits[Math.floor(Math.random() * 10)];
  return s;
}

/**
 * Allocate LLNN code if missing (matches Python / Tk reviewer behaviour).
 */
export async function ensureMediaUploadCode(
  admin: SupabaseClient,
  questionId: string
): Promise<string> {
  const { data: row, error: selErr } = await admin
    .from("ai_generated_questions")
    .select("id, media_upload_code")
    .eq("id", questionId)
    .maybeSingle();

  if (selErr) throw new Error(selErr.message);
  if (!row) throw new Error("Question not found");
  const existing = row.media_upload_code;
  if (existing && String(existing).trim()) {
    return String(existing).trim().toUpperCase();
  }

  for (let i = 0; i < 300; i++) {
    const code = randomCode();
    const { error: insErr } = await admin.from("media_upload_codes_registry").insert({
      code,
      question_id: questionId,
    });
    if (insErr) {
      const msg = insErr.message?.toLowerCase() || "";
      if (
        msg.includes("duplicate") ||
        msg.includes("unique") ||
        msg.includes("23505")
      ) {
        continue;
      }
      throw new Error(insErr.message);
    }
    const { error: upErr } = await admin
      .from("ai_generated_questions")
      .update({ media_upload_code: code })
      .eq("id", questionId);
    if (upErr) throw new Error(upErr.message);
    return code;
  }
  throw new Error("Could not allocate a unique upload code");
}

const ALLOWED_EXT = new Set([".mp4", ".mov", ".webm", ".m4v", ".mkv"]);

export function extensionFromFilename(name: string): string {
  const lower = name.toLowerCase();
  const dot = lower.lastIndexOf(".");
  if (dot < 0) return ".mp4";
  const ext = lower.slice(dot);
  return ALLOWED_EXT.has(ext) ? ext : ".mp4";
}
