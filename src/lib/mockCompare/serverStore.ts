/**
 * Guest-safe mock-compare room persistence for local / preview.
 * File-backed so two browsers on the same Next server share state across
 * hot reloads. No auth required.
 */

import { promises as fs } from "fs";
import path from "path";
import type { MockCompareRoom } from "./types";

const STORE_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(STORE_DIR, "mock-compare-rooms.json");

type RoomMap = Record<string, MockCompareRoom>;

declare global {
  // eslint-disable-next-line no-var
  var __mockCompareRooms: RoomMap | undefined;
  // eslint-disable-next-line no-var
  var __mockCompareRoomsLoaded: boolean | undefined;
}

function memory(): RoomMap {
  if (!globalThis.__mockCompareRooms) {
    globalThis.__mockCompareRooms = {};
  }
  return globalThis.__mockCompareRooms;
}

async function ensureLoaded(): Promise<void> {
  if (globalThis.__mockCompareRoomsLoaded) return;
  globalThis.__mockCompareRoomsLoaded = true;
  try {
    const raw = await fs.readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as RoomMap;
    Object.assign(memory(), parsed);
  } catch {
    /* missing / corrupt — start empty */
  }
}

async function persist(): Promise<void> {
  try {
    await fs.mkdir(STORE_DIR, { recursive: true });
    await fs.writeFile(STORE_FILE, JSON.stringify(memory(), null, 2), "utf8");
  } catch {
    /* best-effort */
  }
}

export async function getRoom(roomId: string): Promise<MockCompareRoom | null> {
  await ensureLoaded();
  return memory()[roomId] ?? null;
}

export async function saveRoom(room: MockCompareRoom): Promise<MockCompareRoom> {
  await ensureLoaded();
  memory()[room.roomId] = room;
  await persist();
  return room;
}

export async function updateRoom(
  roomId: string,
  updater: (room: MockCompareRoom) => MockCompareRoom,
): Promise<MockCompareRoom | null> {
  await ensureLoaded();
  const existing = memory()[roomId];
  if (!existing) return null;
  const next = updater(structuredClone(existing));
  memory()[roomId] = next;
  await persist();
  return next;
}

export function newRoomId(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return id;
}

export function newParticipantId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
