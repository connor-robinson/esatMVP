"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Copy, Check, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createCompareRoom,
  fetchCompareRoom,
  getOrCreateParticipantId,
  getSavedDisplayName,
  joinCompareRoom,
  saveDisplayName,
  seedDemoBoth,
  setActiveMockCompare,
} from "@/lib/mockCompare/client";
import { startCompareMockSitting } from "@/lib/mockCompare/startMock";
import { listCompareableMocks } from "@/lib/mockCompare/catalogBridge";
import type { MockCompareRoom } from "@/lib/mockCompare/types";
import type { EsatMockModuleId } from "@/lib/esatMockTests/catalog";
import { MockCompareSplitView } from "@/components/mockCompare/MockCompareSplitView";

type Mode = "create" | "lobby";

type MockCompareLobbyClientProps = {
  roomId?: string;
};

const MODULE_IDS: EsatMockModuleId[] = [
  "maths-1",
  "maths-2",
  "physics",
  "chemistry",
  "biology",
];

export function MockCompareLobbyClient({ roomId }: MockCompareLobbyClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode: Mode = roomId ? "lobby" : "create";
  const slots = useMemo(() => listCompareableMocks(), []);

  const initialModule = (() => {
    const raw = searchParams.get("module") as EsatMockModuleId | null;
    return raw && MODULE_IDS.includes(raw) ? raw : "maths-1";
  })();
  const initialMock = Number(searchParams.get("mock") || "1");

  const [displayName, setDisplayName] = useState("");
  const [moduleId, setModuleId] = useState<EsatMockModuleId>(initialModule);
  const [mockNumber, setMockNumber] = useState(
    Number.isFinite(initialMock) && initialMock > 0 ? initialMock : 1,
  );
  const [room, setRoom] = useState<MockCompareRoom | null>(null);
  const [participantId, setParticipantId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    setDisplayName(getSavedDisplayName() || "");
    setParticipantId(getOrCreateParticipantId());
  }, []);

  const availableForModule = slots.filter((s) => s.moduleId === moduleId);

  useEffect(() => {
    if (availableForModule.length === 0) return;
    if (!availableForModule.some((s) => s.mockNumber === mockNumber)) {
      setMockNumber(availableForModule[0].mockNumber);
    }
  }, [availableForModule, mockNumber]);

  const refreshRoom = useCallback(async () => {
    if (!roomId) return;
    try {
      const data = await fetchCompareRoom(roomId);
      setRoom(data.room);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Room not found");
    }
  }, [roomId]);

  useEffect(() => {
    if (mode !== "lobby" || !roomId) return;
    void refreshRoom();
    const t = window.setInterval(() => void refreshRoom(), 2500);
    return () => window.clearInterval(t);
  }, [mode, roomId, refreshRoom]);

  const shareUrl =
    typeof window !== "undefined" && room
      ? `${window.location.origin}/esat-mock-tests/compare/${room.roomId}`
      : room
        ? `/esat-mock-tests/compare/${room.roomId}`
        : "";

  const handleCreate = async () => {
    setError(null);
    setBusy(true);
    try {
      const name = displayName.trim() || "Player 1";
      saveDisplayName(name);
      const data = await createCompareRoom({
        moduleId,
        mockNumber,
        displayName: name,
      });
      setParticipantId(data.participantId);
      router.push(`/esat-mock-tests/compare/${data.room.roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create room");
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    if (!roomId) return;
    setError(null);
    setBusy(true);
    try {
      const name = displayName.trim() || "Player 2";
      saveDisplayName(name);
      const data = await joinCompareRoom({ roomId, displayName: name });
      setParticipantId(data.participantId);
      setRoom(data.room);
      setJoined(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join");
    } finally {
      setBusy(false);
    }
  };

  const iAmInRoom = Boolean(
    room && participantId && room.participants.some((p) => p.participantId === participantId),
  );

  const handleStart = async () => {
    if (!room || !participantId) return;
    if (!iAmInRoom) {
      setError("Join the room first");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const ctx = {
        roomId: room.roomId,
        participantId,
        displayName: displayName.trim() || "You",
        paperId: room.paperId,
        paperLabel: room.paperLabel,
      };
      setActiveMockCompare(ctx);
      await startCompareMockSitting(ctx);
      router.push("/past-papers/solve");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start mock");
      setBusy(false);
    }
  };

  const handlePreviewCompare = async () => {
    if (!room || !roomId) return;
    setBusy(true);
    setError(null);
    try {
      let pid = participantId || getOrCreateParticipantId();
      if (!room.participants.some((p) => p.participantId === pid)) {
        const joinedData = await joinCompareRoom({
          roomId,
          displayName: displayName.trim() || "You",
        });
        pid = joinedData.participantId;
        setParticipantId(pid);
        setRoom(joinedData.room);
      }
      const data = await seedDemoBoth(room.roomId, pid);
      setRoom(data.room);
      setJoined(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not seed demo");
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Could not copy link");
    }
  };

  const bothCompleted =
    room &&
    room.participants.length === 2 &&
    room.participants.every((p) => p.status === "completed" && p.results);

  const meInRoom = room?.participants.find((p) => p.participantId === participantId);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#93C5FD]">
          Compare with a friend
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Same mock. Split results.
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-[#94A3B8] sm:text-base">
          No signup needed. Create a room, send the link, both sit the paper,
          then compare predicted score, accuracy, pacing and a question grid.
          Sign in later if you want deeper stats saved.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl bg-rose-500/15 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {mode === "create" ? (
        <div className="space-y-5 rounded-2xl bg-[#161D2F] p-5 sm:p-6">
          <label className="block space-y-2">
            <span className="text-xs font-medium text-[#94A3B8]">Your name</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Anson"
              maxLength={32}
              className="w-full rounded-xl bg-[#0A0F1D] px-4 py-3 text-sm text-white placeholder:text-[#64748B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/50"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-xs font-medium text-[#94A3B8]">Module</span>
              <select
                value={moduleId}
                onChange={(e) => setModuleId(e.target.value as EsatMockModuleId)}
                className="w-full rounded-xl bg-[#0A0F1D] px-4 py-3 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/50"
              >
                <option value="maths-1">Mathematics 1</option>
                <option value="maths-2">Mathematics 2</option>
                <option value="physics">Physics</option>
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-medium text-[#94A3B8]">Mock</span>
              <select
                value={mockNumber}
                onChange={(e) => setMockNumber(Number(e.target.value))}
                className="w-full rounded-xl bg-[#0A0F1D] px-4 py-3 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/50"
              >
                {availableForModule.map((s) => (
                  <option key={s.mockNumber} value={s.mockNumber}>
                    Mock {s.mockNumber} — {s.paperLabel}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={busy || availableForModule.length === 0}
            className="w-full rounded-xl bg-[#3B82F6] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create room & get link"}
          </button>
        </div>
      ) : null}

      {mode === "lobby" && room ? (
        <div className="space-y-5">
          <div className="space-y-4 rounded-2xl bg-[#161D2F] p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3B82F6]/15 text-[#93C5FD]">
                <Users className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-white">{room.paperLabel}</div>
                <div className="mt-1 text-sm text-[#94A3B8]">
                  Room {room.roomId} · {room.participants.length}/2 joined
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                readOnly
                value={shareUrl}
                className="min-w-0 flex-1 rounded-xl bg-[#0A0F1D] px-4 py-3 text-xs text-[#CBD5E1] focus-visible:outline-none"
              />
              <button
                type="button"
                onClick={() => void copyLink()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white hover:bg-white/[0.12]"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy link"}
              </button>
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
                  <span
                    className={cn(
                      "text-xs font-medium uppercase tracking-wide",
                      p.status === "completed"
                        ? "text-emerald-300"
                        : p.status === "in_progress"
                          ? "text-[#93C5FD]"
                          : "text-[#64748B]",
                    )}
                  >
                    {p.status.replace("_", " ")}
                  </span>
                </li>
              ))}
              {room.participants.length < 2 ? (
                <li className="rounded-xl bg-[#0A0F1D]/60 px-4 py-3 text-sm text-[#64748B]">
                  Waiting for friend…
                </li>
              ) : null}
            </ul>

            {!iAmInRoom ? (
              <div className="space-y-3">
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
                <button
                  type="button"
                  onClick={() => void handleJoin()}
                  disabled={busy}
                  className="w-full rounded-xl bg-[#3B82F6] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-50"
                >
                  {busy ? "Joining…" : "Join room"}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void handleStart()}
                  disabled={busy || meInRoom?.status === "completed"}
                  className="flex-1 rounded-xl bg-[#3B82F6] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-50"
                >
                  {busy
                    ? "Starting…"
                    : meInRoom?.status === "completed"
                      ? "Already finished"
                      : "Start mock"}
                </button>
                <button
                  type="button"
                  onClick={() => void handlePreviewCompare()}
                  disabled={busy}
                  className="flex-1 rounded-xl bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white hover:bg-white/[0.12] disabled:opacity-50"
                >
                  Preview compare UI
                </button>
              </div>
            )}

            <p className="text-xs leading-relaxed text-[#64748B]">
              Tip: open the link in another browser / incognito to act as the
              friend. Or use <span className="text-[#94A3B8]">Preview compare UI</span>{" "}
              to seed demo scores instantly.
            </p>
          </div>

          {(bothCompleted || (joined && room.participants.some((p) => p.results))) &&
          participantId ? (
            <div className="overflow-hidden rounded-2xl bg-[#0A0F1D] p-4 sm:p-5">
              <MockCompareSplitView
                room={room}
                meId={participantId}
                tone="marketing"
                loginHref={`/login?redirectTo=/esat-mock-tests/compare/${room.roomId}`}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {mode === "lobby" && !room && !error ? (
        <div className="rounded-2xl bg-[#161D2F] px-5 py-10 text-center text-sm text-[#94A3B8]">
          Loading room…
        </div>
      ) : null}

      <p className="text-center text-xs text-[#64748B]">
        <Link href="/esat-mock-tests" className="text-[#93C5FD] hover:text-white">
          ← Back to ESAT mock tests
        </Link>
      </p>
    </div>
  );
}
