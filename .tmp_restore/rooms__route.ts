import { NextResponse } from "next/server";
import type { EsatMockModuleId } from "@/lib/esatMockTests/catalog";
import { resolveCompareableMock } from "@/lib/mockCompare/catalogBridge";
import {
  newParticipantId,
  newRoomId,
  saveRoom,
} from "@/lib/mockCompare/serverStore";
import type {
  MockCompareCatalogStart,
  MockCompareRoadmapStart,
  MockCompareRoom,
} from "@/lib/mockCompare/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateBody = {
  displayName?: string;
  participantId?: string;
  paperLabel?: string;
  paperId?: number;
  moduleId?: string;
  mockNumber?: number;
  roadmapStart?: MockCompareRoadmapStart;
  catalogStart?: MockCompareCatalogStart;
};

export async function POST(request: Request) {
  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const displayName = String(body.displayName || "Player 1").trim().slice(0, 32);
  const participantId =
    (body.participantId && String(body.participantId).slice(0, 64)) ||
    newParticipantId();

  let paperLabel = String(body.paperLabel || "").trim();
  let paperId = typeof body.paperId === "number" ? body.paperId : 0;
  let moduleId: EsatMockModuleId | undefined;
  let mockNumber: number | undefined;
  let catalogStart = body.catalogStart;
  const roadmapStart = body.roadmapStart;

  if (!roadmapStart && !catalogStart && body.moduleId && body.mockNumber) {
    const slot = resolveCompareableMock(
      body.moduleId as EsatMockModuleId,
      Number(body.mockNumber),
    );
    if (!slot) {
      return NextResponse.json(
        { error: "That mock is not available for compare yet" },
        { status: 400 },
      );
    }
    catalogStart = {
      moduleId: slot.moduleId,
      mockNumber: slot.mockNumber,
      paperId: slot.paperId,
    };
    paperLabel = paperLabel || slot.paperLabel;
    paperId = slot.paperId;
  }

  if (catalogStart) {
    paperId = catalogStart.paperId;
    moduleId = catalogStart.moduleId;
    mockNumber = catalogStart.mockNumber;
    if (!paperLabel) {
      const slot = resolveCompareableMock(
        catalogStart.moduleId,
        catalogStart.mockNumber,
      );
      paperLabel = slot?.paperLabel || "ESAT mock";
    }
  }

  if (!paperLabel && roadmapStart) paperLabel = "Shared mock";

  if (!roadmapStart && !catalogStart) {
    return NextResponse.json(
      { error: "Missing session settings for this room" },
      { status: 400 },
    );
  }

  const room: MockCompareRoom = {
    roomId: newRoomId(),
    paperLabel: paperLabel || "Shared mock",
    paperId,
    moduleId,
    mockNumber,
    roadmapStart,
    catalogStart,
    createdAt: Date.now(),
    participants: [
      {
        participantId,
        displayName: displayName || "Player 1",
        status: "joined",
        results: null,
        joinedAt: Date.now(),
        startedAt: null,
      },
    ],
  };

  await saveRoom(room);
  return NextResponse.json({ room, participantId });
}
