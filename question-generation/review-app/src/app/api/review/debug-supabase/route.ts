import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getReviewSupabase, getSupabaseServerDiagnostics } from "@/lib/supabaseService";
import { normalizeReviewQuestion } from "@/lib/utils";

function sha256Utf8(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
} as const;

/**
 * Temporary debugging: which Supabase host does this deployment use at runtime, and does a
 * probe row match? Enable with REVIEW_API_DEBUG=1 on Vercel, then remove or leave disabled.
 *
 * GET /api/review/debug-supabase
 * GET /api/review/debug-supabase?probeId=<uuid>
 */
export async function GET(request: NextRequest) {
  if (process.env.REVIEW_API_DEBUG !== "1") {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE });
  }

  const diag = getSupabaseServerDiagnostics();
  const probeId = request.nextUrl.searchParams.get("probeId")?.trim() ?? "";

  const body: Record<string, unknown> = {
    ok: true,
    connection: diag,
    hint:
      "effectiveHost should match your SQL editor project. Compare question_stem_sha256_raw with SQL: select encode(digest(question_stem, 'sha256'), 'hex') from ai_generated_questions where id = '<id>'; (needs pgcrypto digest). If raw vs normalized_sha256 differ, normalizeReviewQuestion is changing the stem.",
  };

  if (probeId && /^[0-9a-f-]{36}$/i.test(probeId)) {
    try {
      const supabase = getReviewSupabase();
      const { data, error } = await supabase
        .from("ai_generated_questions")
        .select("*")
        .eq("id", probeId)
        .maybeSingle();

      const stem = typeof data?.question_stem === "string" ? data.question_stem : "";
      let normalizedStem = "";
      let normalizeError: string | null = null;
      try {
        if (data && typeof data === "object") {
          normalizedStem = normalizeReviewQuestion(data as Record<string, unknown>).question_stem;
        }
      } catch (e: unknown) {
        normalizeError = e instanceof Error ? e.message : String(e);
      }

      const n = stem.length;
      const midStart = Math.max(0, Math.floor(n / 2) - 60);
      body.probe = {
        id: probeId,
        error: error?.message ?? null,
        updated_at: data?.updated_at ?? null,
        question_stem_length: stem.length,
        question_stem_has_figure: stem.includes("<figure"),
        question_stem_head120: stem.slice(0, 120),
        question_stem_tail200: stem.slice(-200),
        question_stem_mid120: n > 200 ? stem.slice(midStart, midStart + 120) : null,
        question_stem_sha256_raw: stem ? sha256Utf8(stem) : null,
        question_stem_sha256_after_normalize: normalizedStem ? sha256Utf8(normalizedStem) : null,
        stem_unchanged_by_normalize:
          stem && normalizedStem ? stem === normalizedStem : null,
        normalize_threw: normalizeError,
      };

      // Compare against the query shape used by /api/review/questions legacy path:
      // select('*', { count: 'exact' }).eq('id', id).range(0, 0)
      try {
        const { data: rangedRows, error: rangedErr, count } = await supabase
          .from("ai_generated_questions")
          .select("*", { count: "exact" })
          .eq("id", probeId)
          .range(0, 0);
        const ranged = Array.isArray(rangedRows) && rangedRows.length > 0 ? rangedRows[0] : null;
        const rangedStem =
          ranged && typeof (ranged as { question_stem?: unknown }).question_stem === "string"
            ? ((ranged as { question_stem?: string }).question_stem as string)
            : "";
        body.probe_questions_route_shape = {
          error: rangedErr?.message ?? null,
          count: count ?? null,
          row_found: !!ranged,
          updated_at: ranged ? (ranged as { updated_at?: string }).updated_at ?? null : null,
          question_stem_length: rangedStem.length,
          question_stem_has_figure: rangedStem.includes("<figure"),
          question_stem_sha256: rangedStem ? sha256Utf8(rangedStem) : null,
          same_as_maybeSingle_raw:
            stem && rangedStem ? stem === rangedStem : stem.length === rangedStem.length,
        };
      } catch (e: unknown) {
        body.probe_questions_route_shape = {
          error: e instanceof Error ? e.message : String(e),
        };
      }
    } catch (e: unknown) {
      body.probe = {
        id: probeId,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  return NextResponse.json(body, { headers: NO_STORE });
}
