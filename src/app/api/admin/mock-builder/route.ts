import { NextRequest, NextResponse } from "next/server";
import { requireTesterAdmin } from "@/lib/tester/admin";
import {
  createMock,
  countAvailableDiagrams,
  getExcludePublishedFromPractice,
  listMocks,
  loadMockPoolInventoryLite,
  nextMockNumbersFromList,
  setExcludePublishedFromPractice,
} from "@/lib/mockBuilder/server";
import {
  MOCK_BUILDER_SUBJECTS,
  type MockBuilderSubject,
} from "@/lib/mockBuilder/types";
import { getDefaultBlueprint, getDiagramTarget } from "@/lib/mockBuilder/blueprints";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const admin = await requireTesterAdmin(request);
  if (!admin.ok || !admin.service) {
    return NextResponse.json(
      { error: admin.error ?? "Unauthorized" },
      { status: admin.status ?? 401 },
    );
  }

  try {
    // Fast path: light mocks + off-bank counts + diagrams in parallel.
    // Full unattempted-bank inventory loads separately so the table can paint first.
    const [mocks, exclude, inventory, diagramRows] = await Promise.all([
      listMocks(admin.service, { light: true }),
      getExcludePublishedFromPractice(admin.service),
      loadMockPoolInventoryLite(admin.service),
      Promise.all(
        MOCK_BUILDER_SUBJECTS.map(async (subject) => {
          const counts = await countAvailableDiagrams(admin.service!, subject);
          return [
            subject,
            {
              ...counts,
              defaultTarget: getDiagramTarget(getDefaultBlueprint(subject)),
            },
          ] as const;
        }),
      ),
    ]);

    const diagramAvailability = Object.fromEntries(diagramRows);
    const nextMockNumbers = nextMockNumbersFromList(mocks);

    return NextResponse.json({
      mocks,
      settings: { excludePublishedMockQuestionsFromPractice: exclude },
      subjects: MOCK_BUILDER_SUBJECTS,
      diagramAvailability,
      inventory,
      nextMockNumbers,
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

    // One mock per request so each generate gets a full serverless time budget.
    // The admin UI loops this for batch create; each call sees prior drafts'
    // question IDs via loadUsedQuestionIds so pools do not clash.
    const result = await createMock(admin.service, {
      subject,
      mockNumber,
      createdBy: admin.userId,
      generate: body.generate !== false,
      diagramCount,
      autoNumber: body.autoNumber !== false,
    });

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create mock" },
      { status: 500 },
    );
  }
}
