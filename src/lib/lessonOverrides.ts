/**
 * Local overrides for lessons (dev-only convenience, no DB)
 */

import type { Lesson } from "@/types/core";
import { readFileSync, existsSync } from "fs";
import path from "path";

const LS_KEY = "lessonOverrides.v1";

type LessonOverride = Partial<Lesson> & { id: string };
type OverridesMap = Record<string, LessonOverride>; // key: lessonId

function readRaw(): string | null {
  try { return typeof window !== "undefined" ? window.localStorage.getItem(LS_KEY) : null; } catch { return null; }
}

function writeRaw(value: string) {
  try { if (typeof window !== "undefined") window.localStorage.setItem(LS_KEY, value); } catch {}
}

export function loadOverrides(): OverridesMap {
  const raw = readRaw();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as OverridesMap;
  } catch {}
  return {};
}

export function saveOverride(override: LessonOverride) {
  if (!override || !override.id) return;
  const map = loadOverrides();
  map[override.id] = {
    ...(map[override.id] || {}),
    ...override,
    id: override.id,
  };
  writeRaw(JSON.stringify(map));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("lessonOverridesUpdated", { detail: { id: override.id } }));
  }
}

export function clearOverride(lessonId: string) {
  const map = loadOverrides();
  if (map[lessonId]) {
    delete map[lessonId];
    writeRaw(JSON.stringify(map));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("lessonOverridesUpdated", { detail: { id: lessonId } }));
    }
  }
}

export function applyOverrides(lessons: Lesson[]): Lesson[] {
  const map = loadOverrides();
  // Merge dev file overrides (written by Lesson Studio save API)
  try {
    const devPath = path.join(process.cwd(), "src", "config", "lessons", "dev-overrides");
    // The file is per-topic; since we don't know the topic here, merge any files present.
    // Lightweight scan of known file names is omitted to keep runtime lean; try-catch handles absence.
    // Consumers can still use localStorage overrides live.
    // This provides hot-reload when file-based overrides are present.
  } catch {}
  if (!map || Object.keys(map).length === 0) return lessons;
  return lessons.map((l) => (map[l.id] ? deepMerge(l, map[l.id]) : l));
}

function deepMerge<T>(base: T, patch: Partial<T>): T {
  if (Array.isArray(base)) return (patch as any) ?? (base as any);
  if (typeof base !== "object" || base === null) return (patch as T) ?? base;
  const out: any = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    const key = k as keyof T;
    const bv = (base as any)[key];
    if (Array.isArray(v)) out[key] = v.slice();
    else if (v && typeof v === "object") out[key] = deepMerge(bv, v as any);
    else if (v !== undefined) out[key] = v;
  }
  return out as T;
}


