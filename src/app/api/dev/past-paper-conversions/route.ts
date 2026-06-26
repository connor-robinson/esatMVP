import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/stripe/supabase-admin";
import { isQuestionGenerationEnabled } from "@/lib/features";
import type {
  ConversionPreviewRow,
  ConversionReport,
  ConversionStatus,
} from "@/types/conversions";
import type { DiagramAsset, ExamName, Letter } from "@/types/papers";

export const dynamic = "force-dynamic";

type DbConversionRow = {
  id: string;
  question_id: number;
  status: ConversionStatus;
  question_stem: string | null;
  options: Partial<Record<Letter, string>> | null;
  diagram_assets: DiagramAsset[] | null;
  detected_question_number: number | null;
  option_letters: string[] | null;
  confidence: number | null;
  conversion_report: ConversionReport | null;
  source_image_url: string;
  created_at: string;
  questions: {
    exam_name: ExamName;
    exam_year: number;
    paper_name: string;
    question_number: number;
    question_image: string;
    paper_id: number;
  } | null;
};

function normalizeQuestionJoin(
  questions: DbConversionRow["questions"] | DbConversionRow["questions"][] | null,
): DbConversionRow["questions"] {
  if (!questions) return null;
  if (Array.isArray(questions)) return questions[0] ?? null;
  return questions;
}

function mapRow(raw: Omit<DbConversionRow, "questions"> & { questions: unknown }): ConversionPreviewRow | null {
  const q = normalizeQuestionJoin(raw.questions as DbConversionRow["questions"] | DbConversionRow["questions"][]);
  if (!q) return null;
  return {
    id: raw.id,
    questionId: raw.question_id,
    status: raw.status,
    questionStem: raw.question_stem,
    options: raw.options,
    diagramAssets: raw.diagram_assets,
    detectedQuestionNumber: raw.detected_question_number,
    optionLetters: raw.option_letters,
    confidence: raw.confidence != null ? Number(raw.confidence) : null,
    conversionReport: raw.conversion_report ?? {},
    sourceImageUrl: raw.source_image_url,
    createdAt: raw.created_at,
    examName: q.exam_name,
    examYear: q.exam_year,
    paperName: q.paper_name,
    paperId: q.paper_id,
    questionNumber: q.question_number,
    questionImage: q.question_image,
  };
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function GET(request: Request) {
  if (!isQuestionGenerationEnabled()) {
    return NextResponse.json({ error: "Not enabled" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const paperIdParam = searchParams.get("paperId");
  const statusFilter = searchParams.get("status") ?? "all";
  const limit = Math.min(Number(searchParams.get("limit") ?? 24) || 24, 100);
  const offset = Number(searchParams.get("offset") ?? 0) || 0;
  const doShuffle = searchParams.get("shuffle") === "1";

  try {
    let questionIds: number[] | null = null;
    if (paperIdParam) {
      const paperId = Number(paperIdParam);
      if (Number.isFinite(paperId)) {
        const { data: qRows, error: qErr } = await supabaseAdmin
          .from("questions")
          .select("id")
          .eq("paper_id", paperId);
        if (qErr) {
          return NextResponse.json({ error: qErr.message }, { status: 500 });
        }
        questionIds = (qRows ?? []).map((r) => r.id);
        if (questionIds.length === 0) {
          return NextResponse.json({ conversions: [], total: 0 });
        }
      }
    }

    let query = supabaseAdmin
      .from("question_conversions")
      .select(
        `
        id,
        question_id,
        status,
        question_stem,
        options,
        diagram_assets,
        detected_question_number,
        option_letters,
        confidence,
        conversion_report,
        source_image_url,
        created_at,
        questions (
          exam_name,
          exam_year,
          paper_name,
          question_number,
          question_image,
          paper_id
        )
      `,
        { count: "exact" },
      )
      .neq("status", "superseded")
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }
    if (questionIds) {
      query = query.in("question_id", questionIds);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error("[dev/past-paper-conversions]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let rows = (data ?? [])
      .map((row) => mapRow(row as Omit<DbConversionRow, "questions"> & { questions: unknown }))
      .filter((r): r is ConversionPreviewRow => r != null);

    if (doShuffle) {
      rows = shuffle(rows);
    }

    return NextResponse.json({ conversions: rows, total: count ?? rows.length });
  } catch (e) {
    console.error("[dev/past-paper-conversions]", e);
    return NextResponse.json({ error: "Failed to load conversions" }, { status: 500 });
  }
}
