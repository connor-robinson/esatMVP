import { NextRequest, NextResponse } from "next/server";
import { requireTesterAdmin } from "@/lib/tester/admin";
import {
  createMock,
  countAvailableDiagrams,
  getExcludePublishedFromPractice,
  listMocks,
  setExcludePublishedFromPractice,
} from "@/lib/mockBuilder/server";
import {
  MOCK_BUILDER_SUBJECTS,
  type MockBuilderSubject,
} from "@/lib/mockBuilder/types";
import { getDefaultBlueprint, getDiagramTarget } from "@/lib/mockBuilder/blueprints";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await requireTesterAdmin(request);
  if (!admin.ok || !admin.service) {
    return NextResponse.json(
      { error: admin.error ?? "Unauthorized" },
      { status: admin.status ?? 401 },
    );
  }

  try {
    const mocks = await listMocks(admin.service);
    const exclude = await getExcludePublishedFromPractice(admin.service);
    const diagramAvailability: Record<
      string,
      { available: number; reserved: number; defaultTarget: number }
    > = {};
    for (const subject of MOCK_BUILDER_SUBJECTS) {
      const counts = await countAvailableDiagrams(admin.service, subject);
      diagramAvailability[subject] = {
        ...counts,
        defaultTarget: getDiagramTarget(getDefaultBlueprint(subject)),
      };
    }
    return NextResponse.json({
      mocks,
      settings: { excludePublishedMockQuestionsFromPractice: exclude },
      subjects: MOCK_BUILDER_SUBJECTS,
      diagramAvailability,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to list mocks" },
      { status: 500 },
    );
  }
}

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
    const action = body.action as string | undefined;

    if (action === "settings") {
      const enabled = Boolean(body.excludePublishedMockQuestionsFromPractice);
      await setExcludePublishedFromPractice(admin.service, enabled);
      return NextResponse.json({
        settings: { excludePublishedMockQuestionsFromPractice: enabled },
      });
    }

    const subject = body.subject as MockBuilderSubject;
    const mockNumber = Number(body.mockNumber);
    if (!MOCK_BUILDER_SUBJECTS.includes(subject)) {
      return NextResponse.json({ error: "Invalid subject" }, { status: 400 });
    }
    if (!Number.isFinite(mockNumber) || mockNumber < 1 || mockNumber > 99) {
      return NextResponse.json({ error: "Invalid mock number" }, { status: 400 });
    }

    const diagramCount =
      body.diagramCount == null ? undefined : Number(body.diagramCount);
    if (
      diagramCount != null &&
      (!Number.isFinite(diagramCount) || diagramCount < 0 || diagramCount > 27)
    ) {
      return NextResponse.json(
        { error: "diagramCount must be between 0 and 27" },
        { status: 400 },
      );
    }

    const result = await createMock(admin.service, {
      subject,
      mockNumber,
      createdBy: admin.userId,
      generate: body.generate !== false,
      diagramCount,
    });

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create mock" },
      { status: 500 },
    );
  }
}
