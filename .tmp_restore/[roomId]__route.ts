import { NextResponse } from "next/server";
import { buildDemoResults } from "@/lib/mockCompare/demo";
import {
  getRoom,
  newParticipantId,
  updateRoom,
} from "@/lib/mockCompare/serverStore";
import type { MockCompareResults } from "@/lib/mockCompare/types";
import { MOCK_COMPARE_MAX_PARTICIPANTS } from "@/lib/mockCompare/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ roomId: string }> };

type ActionBody = {
  action?: "join" | "start" | "submit" | "seed_demo_friend" | "seed_demo_both";
  participantId?: string;
  displayName?: string;
  results?: MockCompareResults;
};

export async function GET(_request: Request, context: RouteContext) {
  const { roomId } = await context.params;
  const room = await getRoom(roomId);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  return NextResponse.json({ room });
}

export async function POST(request: Request, context: RouteContext) {
  const { roomId } = await context.params;
  let body: ActionBody;
  try {
    body = (await request.json()) as ActionBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action;
  if (!action) {
    return NextResponse.json({ error: "action required" }, { status: 400 });
  }

  const existing = await getRoom(roomId);
  if (!existing) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  if (action === "join") {
    const participantId =
      (body.participantId && String(body.participantId).slice(0, 64)) ||
      newParticipantId();
    const displayName = String(body.displayName || "Player 2")
      .trim()
      .slice(0, 32);

    const already = existing.participants.find(
      (p) => p.participantId === participantId,
    );
    if (already) {
      const room = await updateRoom(roomId, (r) => {
        const p = r.participants.find((x) => x.participantId === participantId);
        if (p) p.displayName = displayName || p.displayName;
        return r;
      });
      return NextResponse.json({ room, participantId });
    }

    if (existing.participants.length >= MOCK_COMPARE_MAX_PARTICIPANTS) {
      return NextResponse.json(
        { error: "This compare link already has 2 people" },
        { status: 409 },
      );
    }

    const room = await updateRoom(roomId, (r) => {
      r.participants.push({
        participantId,
        displayName: displayName || "Player 2",
        status: "joined",
        results: null,
        joinedAt: Date.now(),
        startedAt: null,
      });
      return r;
    });
    return NextResponse.json({ room, participantId });
  }

  const participantId = String(body.participantId || "");
  if (!participantId) {
    return NextResponse.json(
      { error: "participantId required" },
      { status: 400 },
    );
  }

  const me = existing.participants.find(
    (p) => p.participantId === participantId,
  );
  if (!me) {
    return NextResponse.json(
      { error: "You are not in this room" },
      { status: 403 },
    );
  }

  if (action === "start") {
    const room = await updateRoom(roomId, (r) => {
      const p = r.participants.find((x) => x.participantId === participantId);
      if (p && p.status !== "completed") {
        p.status = "in_progress";
        p.startedAt = p.startedAt ?? Date.now();
      }
      return r;
    });
    return NextResponse.json({ room });
  }

  if (action === "submit") {
    const results = body.results;
    if (!results || typeof results.correctCount !== "number") {
      return NextResponse.json({ error: "results required" }, { status: 400 });
    }
    const room = await updateRoom(roomId, (r) => {
      const p = r.participants.find((x) => x.participantId === participantId);
      if (p) {
        p.status = "completed";
        p.results = {
          ...results,
          completedAt: results.completedAt || Date.now(),
        };
      }
      return r;
    });
    return NextResponse.json({ room });
  }

  if (action === "seed_demo_friend") {
    const room = await updateRoom(roomId, (r) => {
      let friend = r.participants.find(
        (x) => x.participantId !== participantId,
      );
      if (!friend) {
        if (r.participants.length >= MOCK_COMPARE_MAX_PARTICIPANTS) {
          return r;
        }
        friend = {
          participantId: newParticipantId(),
          displayName: "Friend (demo)",
          status: "completed",
          results: buildDemoResults(42),
          joinedAt: Date.now(),
          startedAt: Date.now() - 40 * 60 * 1000,
        };
        r.participants.push(friend);
      } else {
        friend.displayName = friend.displayName || "Friend (demo)";
        friend.status = "completed";
        friend.results = buildDemoResults(42);
      }
      return r;
    });
    return NextResponse.json({ room });
  }

  if (action === "seed_demo_both") {
    const room = await updateRoom(roomId, (r) => {
      const p = r.participants.find((x) => x.participantId === participantId);
      if (p) {
        p.status = "completed";
        p.results = buildDemoResults(7);
      }
      let friend = r.participants.find(
        (x) => x.participantId !== participantId,
      );
      if (!friend) {
        friend = {
          participantId: newParticipantId(),
          displayName: "Friend (demo)",
          status: "completed",
          results: buildDemoResults(42),
          joinedAt: Date.now(),
          startedAt: Date.now() - 40 * 60 * 1000,
        };
        r.participants.push(friend);
      } else {
        friend.status = "completed";
        friend.results = buildDemoResults(42);
      }
      return r;
    });
    return NextResponse.json({ room });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
