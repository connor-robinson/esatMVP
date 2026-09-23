"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users } from "lucide-react";
import {
  fetchCompareRoom,
  getOrCreateParticipantId,
  getSavedDisplayName,
  joinCompareRoom,
  markCompareStarted,
  saveDisplayName,
  setActiveMockCompare,
  setPendingCompareStart,
} from "@/lib/mockCompare/client";
import { startCompareCatalogSitting } from "@/lib/mockCompare/startMock";
import type { MockCompareRoom } from "@/lib/mockCompare/types";

type Props = { roomId: string };

/** Friend join — settings locked from the host's Start choices. */
export function MockCompareJoinClient({ roomId }: Props) {
  const router = useRouter();
  const [room, setRoom] = useState<MockCompareRoom | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [participantId, setParticipantId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const data = await fetchCompareRoom(roomId);
    setRoom(data.room);
  }, [roomId]);

  useEffect(() => {
    setDisplayName(getSavedDisplayName() || "");
    setParticipantId(getOrCreateParticipantId());
    void refresh().catch((err) => {
      setError(err instanceof Error ? err.message : "Room not found");
    });
  }, [refresh]);

  const iAmInRoom = Boolean(
    room?.participants.some((p) => p.participantId === participantId),
  );

  const ensureJoined = async () => {
    if (!room) throw new Error("Room not loaded");
    if (iAmInRoom) return { room, participantId };
    const name = displayName.trim() || "Player 2";
    saveDisplayName(name);
    const data = await joinCompareRoom({ roomId, displayName: name });
    setParticipantId(data.participantId);
    setRoom(data.room);
    return { room: data.room, participantId: data.participantId };
  };

  const handleStart = async () => {
    setBusy(true);
    setError(null);
    try {
      const { room: live, participantId: pid } = await ensureJoined();
      const name = displayName.trim() || "You";
      const ctx = {
        roomId: live.roomId,
        participantId: pid,
        displayName: name,
        paperLabel: live.paperLabel,
        paperId: live.paperId || live.catalogStart?.paperId,
      };
      setActiveMockCompare(ctx);
      await markCompareStarted(live.roomId, pid);

      if (live.roadmapStart) {
        setPendingCompareStart({
          roomId: live.roomId,
          participantId: pid,
          displayName: name,
          paperLabel: live.paperLabel,
          roadmapStart: live.roadmapStart,
        });
        router.push("/past-papers/roadmap?compareStart=1");
        return;
      }

      const paperId = live.catalogStart?.paperId || live.paperId;
      if (!paperId) throw new Error("This room is missing paper settings");
      await startCompareCatalogSitting({ ...ctx, paperId });
      router.push("/past-papers/solve");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start");
      setBusy(false);
    }
  };

  if (error && !room) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-sm text-rose-300">{error}</p>
        <Link
          href="/past-papers/roadmap"
          className="mt-4 inline-block text-sm text-[#93C5FD] hover:text-white"
        >
          ← Back to past papers
        </Link>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="px-4 py-16 text-center text-sm text-[#94A3B8]">
        Loading room…
      </div>
    );
  }

  const slotsLeft = Math.max(0, 2 - room.participants.length);
  const alreadyDone = room.participants.find(
    (p) => p.participantId === participantId && p.status === "completed",
  );

  return (
    <div className="mx-auto w-full max-w-md space-y-6 px-4 py-12 sm:px-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#93C5FD]">
          Friend compare
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Join this mock
        </h1>
        <p className="text-sm leading-relaxed text-[#94A3B8]">
          Your friend already set the papers. Join and start when you&apos;re
          ready.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl bg-[#161D2F] p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3B82F6]/15 text-[#93C5FD]">
            <Users className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div>
            <div className="font-semibold text-white">{room.paperLabel}</div>
            <div className="mt-1 text-sm text-[#94A3B8]">
              {room.participants.length}/2 joined
              {slotsLeft === 0 && !iAmInRoom ? " · room full" : ""}
            </div>
          </div>
        </div>

        <ul className="space-y-2">
          {room.participants.map((p) => (
            <li
              key={p.participantId}
              className="flex items-center justify-between rounded-xl bg-[#0A0F1D] px-4 py-3 text-sm"
            >
              <span className="font-medium text-white">
                {p.displayName}
                {p.participantId === participantId ? " (you)" : ""}
              </span>
              <span className="text-xs uppercase tracking-wide text-[#64748B]">
                {p.status.replace("_", " ")}
              </span>
            </li>
          ))}
        </ul>

        {error ? (
          <div className="rounded-xl bg-rose-500/15 px-3 py-2 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        {!alreadyDone ? (
          <>
            {!iAmInRoom ? (
              <label className="block space-y-2">
                <span className="text-xs font-medium text-[#94A3B8]">
                  Your name
                </span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Friend"
                  maxLength={32}
                  className="w-full rounded-xl bg-[#0A0F1D] px-4 py-3 text-sm text-white placeholder:text-[#64748B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/50"
                />
              </label>
            ) : null}
            <button
              type="button"
              disabled={busy || (!iAmInRoom && slotsLeft === 0)}
              onClick={() => void handleStart()}
              className="w-full rounded-xl bg-[#3B82F6] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-50"
            >
              {busy ? "Starting…" : iAmInRoom ? "Start mock" : "Join & start"}
            </button>
          </>
        ) : (
          <Link
            href="/past-papers/mark"
            className="block w-full rounded-xl bg-[#3B82F6] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[#2563EB]"
          >
            View compare results
          </Link>
        )}
      </div>
    </div>
  );
}
