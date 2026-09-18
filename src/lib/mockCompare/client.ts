/**
 * Client-side identity + active compare-room context (no signup).
 */

import type { MockCompareResults } from "./types";

const PARTICIPANT_KEY = "esat_mock_compare_participant_id";
const NAME_KEY = "esat_mock_compare_display_name";
const ACTIVE_ROOM_KEY = "esat_mock_compare_active";

export type ActiveMockCompareContext = {
  roomId: string;
  participantId: string;
  displayName: string;
  paperId: number;
  paperLabel: string;
};

function safeUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateParticipantId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = window.localStorage.getItem(PARTICIPANT_KEY);
    if (!id) {
      id = safeUuid();
      window.localStorage.setItem(PARTICIPANT_KEY, id);
    }
    return id;
  } catch {
    return safeUuid();
  }
}

export function getSavedDisplayName(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveDisplayName(name: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NAME_KEY, name.trim().slice(0, 32));
  } catch {
    /* ignore */
  }
}

export function setActiveMockCompare(ctx: ActiveMockCompareContext): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(ACTIVE_ROOM_KEY, JSON.stringify(ctx));
  } catch {
    /* ignore */
  }
}

export function getActiveMockCompare(): ActiveMockCompareContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(ACTIVE_ROOM_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveMockCompareContext;
  } catch {
    return null;
  }
}

export function clearActiveMockCompare(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(ACTIVE_ROOM_KEY);
  } catch {
    /* ignore */
  }
}

export async function fetchCompareRoom(roomId: string) {
  const res = await fetch(`/api/mock-compare/rooms/${roomId}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "Room not found");
  }
  return res.json() as Promise<{ room: import("./types").MockCompareRoom }>;
}

export async function createCompareRoom(input: {
  moduleId: string;
  mockNumber: number;
  displayName: string;
}) {
  const participantId = getOrCreateParticipantId();
  saveDisplayName(input.displayName);
  const res = await fetch("/api/mock-compare/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      moduleId: input.moduleId,
      mockNumber: input.mockNumber,
      displayName: input.displayName,
      participantId,
    }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "Could not create room");
  }
  return res.json() as Promise<{
    room: import("./types").MockCompareRoom;
    participantId: string;
  }>;
}

export async function joinCompareRoom(input: {
  roomId: string;
  displayName: string;
}) {
  const participantId = getOrCreateParticipantId();
  saveDisplayName(input.displayName);
  const res = await fetch(`/api/mock-compare/rooms/${input.roomId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "join",
      displayName: input.displayName,
      participantId,
    }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "Could not join room");
  }
  return res.json() as Promise<{
    room: import("./types").MockCompareRoom;
    participantId: string;
  }>;
}

export async function markCompareStarted(roomId: string, participantId: string) {
  const res = await fetch(`/api/mock-compare/rooms/${roomId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "start", participantId }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "Could not start");
  }
  return res.json() as Promise<{ room: import("./types").MockCompareRoom }>;
}

export async function submitCompareResults(input: {
  roomId: string;
  participantId: string;
  results: MockCompareResults;
}) {
  const res = await fetch(`/api/mock-compare/rooms/${input.roomId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "submit",
      participantId: input.participantId,
      results: input.results,
    }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "Could not submit results");
  }
  return res.json() as Promise<{ room: import("./types").MockCompareRoom }>;
}

export async function seedDemoFriend(roomId: string, participantId: string) {
  const res = await fetch(`/api/mock-compare/rooms/${roomId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "seed_demo_friend", participantId }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "Could not seed demo friend");
  }
  return res.json() as Promise<{ room: import("./types").MockCompareRoom }>;
}

export async function seedDemoBoth(roomId: string, participantId: string) {
  const res = await fetch(`/api/mock-compare/rooms/${roomId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "seed_demo_both", participantId }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "Could not seed demo");
  }
  return res.json() as Promise<{ room: import("./types").MockCompareRoom }>;
}
