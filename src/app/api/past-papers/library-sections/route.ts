import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { examNameToPaperType } from "@/lib/papers/paperConfig";
import {
  getEsatCampMockPapers,
  getEsatCampMockQuestionPartsForPaperName,
  isEsatCampMockPaperId,
  getEsatCampMockModuleByPaperId,
} from "@/lib/papers/esatCampMocks";
import {
  buildPaperSectionsOutline,
  type SlimQuestionPart,
} from "@/lib/papers/paperLibrarySections";
import type { ExamName, Paper } from "@/types/papers";

export const dynamic = "force-dynamic";

/**
 * GET /api/past-papers/library-sections?paperId=123
 * Section outline for one paper (+ siblings in same exam/year). No question bodies.
 */
export async function GET(request: NextRequest) {
  try {
    const paperIdParam = new URL(request.url).searchParams.get("paperId");
    const paperId = paperIdParam ? Number(paperIdParam) : NaN;
    if (!Number.isFinite(paperId) || paperId <= 0) {
      return NextResponse.json(
        { error: "paperId is required" },
        { status: 400 },
      );
    }

    if (isEsatCampMockPaperId(paperId)) {
      const paper = getEsatCampMockPapers().find((p) => p.id === paperId);
      const moduleForId = getEsatCampMockModuleByPaperId(paperId);
      const paperName = paper?.paperName ?? moduleForId?.paperName;
      if (!paperName) {
        return NextResponse.json({ error: "Paper not found" }, { status: 404 });
      }
      const resolvedPaper =
        paper ??
        getEsatCampMockPapers().find((p) => p.paperName === paperName) ??
        null;
      if (!resolvedPaper) {
        return NextResponse.json({ error: "Paper not found" }, { status: 404 });
      }
      // Mock 1 spans Maths + Physics modules that share the same paperName.
      const partRows = getEsatCampMockQuestionPartsForPaperName(paperName);
      const slimParts: SlimQuestionPart[] = partRows.map((row) => ({
        paperId: row.paperId,
        partLetter: row.partLetter,
        partName: row.partName,
        examType: row.examType,
        paperName: row.paperName,
      }));
      const outline = buildPaperSectionsOutline(resolvedPaper, [], slimParts);
      return NextResponse.json({ ...outline, partRows });
    }

    const supabase = createServerClient();

    const { data: paperRow, error: paperError } = await supabase
      .from("papers")
      .select("id, exam_name, exam_year, paper_name, exam_type, has_conversion")
      .eq("id", paperId)
      .maybeSingle();

    if (paperError || !paperRow) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 });
    }

    const paperRowData = paperRow as Record<string, unknown>;

    const paper: Paper = {
      id: paperRowData.id as number,
      examName: paperRowData.exam_name as Paper["examName"],
      examYear: paperRowData.exam_year as number,
      paperName: paperRowData.paper_name as string,
      examType: paperRowData.exam_type as Paper["examType"],
      hasConversion: paperRowData.has_conversion as boolean,
      createdAt: "",
      updatedAt: "",
    };

    const paperType = examNameToPaperType(paper.examName as ExamName) || "NSAA";
    const mergeSiblings =
      paperType === "NSAA" ||
      paperType === "ENGAA" ||
      paperType === "ESAT" ||
      paperType === "TMUA";

    let paperIds = [paper.id];
    let siblingRows: Paper[] = [];
    if (mergeSiblings) {
      const { data: siblings } = await supabase
        .from("papers")
        .select("id, exam_name, exam_year, paper_name, exam_type, has_conversion")
        .eq("exam_name", paper.examName)
        .eq("exam_year", paper.examYear);

      const siblingsList = (siblings ?? []) as Array<Record<string, unknown>>;
      paperIds = siblingsList.map((r) => r.id as number);
      siblingRows = siblingsList
        .filter((r) => (r.id as number) !== paper.id)
        .map((r) => ({
          id: r.id as number,
          examName: r.exam_name as Paper["examName"],
          examYear: r.exam_year as number,
          paperName: r.paper_name as string,
          examType: r.exam_type as Paper["examType"],
          hasConversion: r.has_conversion as boolean,
          createdAt: "",
          updatedAt: "",
        }));
    }

    const { data: questionRows, error: questionsError } = await supabase
      .from("questions")
      .select(
        "part_letter, part_name, exam_type, paper_name, paper_id, question_number",
      )
      .in("paper_id", paperIds);

    if (questionsError) {
      return NextResponse.json(
        { error: "Failed to load sections" },
        { status: 500 },
      );
    }

    const slimParts: SlimQuestionPart[] = (
      (questionRows ?? []) as Array<Record<string, unknown>>
    ).map((row) => ({
      paperId: row.paper_id as number,
      partLetter: (row.part_letter as string) ?? "",
      partName: (row.part_name as string) ?? "",
      examType: (row.exam_type as string) ?? undefined,
      paperName: (row.paper_name as string) ?? undefined,
    }));

    const partRows = (
      (questionRows ?? []) as Array<Record<string, unknown>>
    ).map((row) => ({
      paperId: row.paper_id as number,
      partLetter: (row.part_letter as string) ?? "",
      partName: (row.part_name as string) ?? "",
      examType: (row.exam_type as string) ?? undefined,
      paperName: (row.paper_name as string) ?? undefined,
      questionNumber: (row.question_number as number) ?? 0,
    }));

    const outline = buildPaperSectionsOutline(paper, siblingRows, slimParts);

    return NextResponse.json({ ...outline, partRows });
  } catch {
    return NextResponse.json(
      { error: "Failed to load sections" },
      { status: 500 },
    );
  }
}
