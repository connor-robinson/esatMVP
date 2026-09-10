import { NextRequest, NextResponse } from "next/server";
import { requireTesterAdmin } from "@/lib/tester/admin";
import { enrichMockMetadataForSubject } from "@/lib/mockBuilder/server";
import {
  MOCK_BUILDER_SUBJECTS,
  type MockBuilderSubject,
} from "@/lib/mockBuilder/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/admin/mock-builder/label-metadata
 * AI-assign mock_difficulty 1-5 (Vertex) for approved bank questions missing labels.
 */
export async function POST(request: NextRequest) {
  const admin = await requireTesterAdmin(request);
  if (!admin.ok || !admin.service) {
    return NextResponse.json(
      { error: admin.error ?? "Unauthorized" },
      { status: admin.status ?? 401 },
    );
  }

  try {
    const body = await request.json();
    const subject = body.subject as MockBuilderSubject;
    if (!MOCK_BUILDER_SUBJECTS.includes(subject)) {
      return NextResponse.json({ error: "Invalid subject" }, { status: 400 });
    }
    const maxQuestions = Math.min(
      300,
      Math.max(12, Number(body.maxQuestions) || 120),
    );

    const result = await enrichMockMetadataForSubject(admin.service, subject, {
      maxQuestions,
      onlyMissingDifficulty: body.onlyMissingDifficulty !== false,
    });

    return NextResponse.json({
      subject,
      ...result,
      message:
        result.labeledCount === 0
          ? result.attempted === 0
            ? "No unlabeled questions found for this subject."
            : "AI returned no labels (check Vertex ADC / model access)."
          : `Labeled ${result.labeledCount}/${result.attempted} questions via ${result.source ?? "unknown"}.`,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Labeling failed" },
      { status: 500 },
    );
  }
}
