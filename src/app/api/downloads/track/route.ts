import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireRouteUser } from "@/lib/supabase/auth";
import { parseMockPdfHref } from "@/lib/downloads/mockPdfDownload";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const ALLOWED_SOURCES = new Set([
  "esat_mock_tests",
  "roadmap",
  "other",
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const href = typeof body.href === "string" ? body.href.trim() : "";
    if (!href || href.length > 500) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const category = body.category === "mock" ? "mock" : null;
    if (!category) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const parsed = parseMockPdfHref(href);
    const asset =
      body.asset === "answers" || body.asset === "paper"
        ? body.asset
        : parsed.asset;
    if (asset !== "paper" && asset !== "answers") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const sourceRaw =
      typeof body.source === "string" ? body.source.trim() : "other";
    const source = ALLOWED_SOURCES.has(sourceRaw) ? sourceRaw : "other";

    let moduleId: string | null =
      typeof body.moduleId === "string" ? body.moduleId : parsed.moduleId;
    if (moduleId && moduleId.length > 40) moduleId = null;

    let mockNumber: number | null =
      typeof body.mockNumber === "number" && Number.isFinite(body.mockNumber)
        ? Math.trunc(body.mockNumber)
        : parsed.mockNumber;
    if (mockNumber != null && (mockNumber < 1 || mockNumber > 5)) {
      mockNumber = null;
    }

    const { user } = await requireRouteUser(request);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase.from("pdf_download_events").insert({
      user_id: user?.id ?? null,
      category,
      asset,
      href,
      module_id: moduleId,
      mock_number: mockNumber,
      source,
    });

    if (error) {
      console.error("[downloads/track] insert failed", {
        code: error.code,
        message: error.message,
      });
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[downloads/track]", err);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
