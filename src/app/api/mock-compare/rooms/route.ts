import { NextResponse } from "next/server";
import type { EsatMockModuleId } from "@/lib/esatMockTests/catalog";
import { resolveCompareableMock } from "@/lib/mockCompare/catalogBridge";
import {
  getRoom,
  newParticipantId,
  newRoomId,
  saveRoom,
} from "@/lib/mockCompare/serverStore";
import type { MockCompareRoom } from "@/lib/mockCompare/types";
import { MOCK_COMPARE_MAX_PARTICIPANTS } from "@/lib/mockCompare/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateBody = {
  moduleId?: string;
  mockNumber?: number;
  displayName?: string;
  participantId?: string;
};

export async function POST(request: Request) {
  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const moduleId = body.moduleId as EsatMockModuleId | undefined;
  const mockNumber = Number(body.mockNumber);
  const displayName = String(body.displayName || "Player 1").trim().slice(0, 32);
  if (!moduleId || !Number.isFinite(mockNumber) || mockNumber < 1) {
    return NextResponse.json(
      { error: "moduleId and mockNumber are required" },
      { status: 400 },
    );
  }

  const slot = resolveCompareableMock(moduleId, mockNumber);
  if (!slot) {
    return NextResponse.json(
      { error: "That mock is not available for compare yet" },
      { status: 400 },
    );
  }

  const participantId =
    (body.participantId && String(body.participantId).slice(0, 64)) ||
    newParticipantId();

  const room: MockCompareRoom = {
    roomId: newRoomId(),
    paperId: slot.paperId,
    paperLabel: slot.paperLabel,
    moduleId: slot.moduleId,
    mockNumber: slot.mockNumber,
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

  if (room.participants.length > MOCK_COMPARE_MAX_PARTICIPANTS) {
    return NextResponse.json({ error: "Room full" }, { status: 400 });
  }

  await saveRoom(room);

  // Ensure we don't collide (extremely unlikely)
  const check = await getRoom(room.roomId);
  if (!check) {
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
  }

  return NextResponse.json({ room, participantId });
}
