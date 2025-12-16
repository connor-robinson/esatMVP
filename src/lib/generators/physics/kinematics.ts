import { GeneratedQuestion } from "@/types/core";
import { randomInt } from "@/lib/utils";

type Weights = Record<string, number> | undefined;

const TYPES = [
  "basic-speed",
  "distance-from-speed-time",
  "time-from-distance-speed",
  "average-velocity",
  "acceleration-basic",
  "suvat-find-one",
] as const;
type KinematicsType = typeof TYPES[number];

export function generateKinematics(level: number, weights?: Weights): GeneratedQuestion {
  const type = pickType(level, weights);
  switch (type) {
    case "basic-speed":
      return genBasicSpeed();
    case "distance-from-speed-time":
      return genDistanceFromSpeedTime();
    case "time-from-distance-speed":
      return genTimeFromDistanceSpeed();
    case "average-velocity":
      return genAverageVelocity();
    case "acceleration-basic":
      return genAccelerationBasic();
    case "suvat-find-one":
      return genSuvatFindOne();
    default:
      return genBasicSpeed();
  }
}

function pickType(level: number, weights?: Weights): KinematicsType {
  // default distributions by level
  const base: Record<KinematicsType, number> =
    level <= 1
      ? { "basic-speed": 0.7, "distance-from-speed-time": 0.2, "time-from-distance-speed": 0.1, "average-velocity": 0, "acceleration-basic": 0, "suvat-find-one": 0 }
      : level === 2
      ? { "basic-speed": 0.2, "distance-from-speed-time": 0.3, "time-from-distance-speed": 0.3, "average-velocity": 0.2, "acceleration-basic": 0, "suvat-find-one": 0 }
      : level === 3
      ? { "basic-speed": 0.1, "distance-from-speed-time": 0.15, "time-from-distance-speed": 0.15, "average-velocity": 0.2, "acceleration-basic": 0.4, "suvat-find-one": 0 }
      : { "basic-speed": 0.05, "distance-from-speed-time": 0.15, "time-from-distance-speed": 0.1, "average-velocity": 0.15, "acceleration-basic": 0.25, "suvat-find-one": 0.3 };

  const merged = { ...base } as Record<string, number>;
  if (weights) {
    for (const [k, v] of Object.entries(weights)) {
      if (k in merged && typeof v === "number" && v >= 0) merged[k] = v;
    }
  }
  const entries = Object.entries(merged) as Array<[KinematicsType, number]>;
  const total = entries.reduce((s, [, w]) => s + w, 0) || 1;
  let r = Math.random() * total;
  for (const [t, w] of entries) {
    r -= w;
    if (r <= 0) return t;
  }
  return entries[entries.length - 1][0];
}

function genBasicSpeed(): GeneratedQuestion {
  const distanceKm = randomInt(50, 240); // km
  const timeH = randomInt(1, 5); // h
  const speed = distanceKm / timeH; // km/h
  const question = `A vehicle travels ${distanceKm} km in ${timeH} h. What is its speed?`;
  return withMeta({
    question,
    answer: `${round(speed)} km/h`,
    difficulty: 1,
  }, { value: speed, unit: "km/h" });
}

function genDistanceFromSpeedTime(): GeneratedQuestion {
  const speed = randomInt(30, 120); // km/h
  const time = randomInt(1, 6); // h
  const dist = speed * time; // km
  const question = `How far do you travel in ${time} h at ${speed} km/h?`;
  return withMeta({
    question,
    answer: `${dist} km`,
    difficulty: 1,
  }, { value: dist, unit: "km" });
}

function genTimeFromDistanceSpeed(): GeneratedQuestion {
  const distance = randomInt(60, 360); // km
  const speed = randomInt(40, 120); // km/h
  const time = distance / speed; // h
  const question = `How long does it take to travel ${distance} km at ${speed} km/h?`;
  return withMeta({
    question,
    answer: `${round(time)} h`,
    difficulty: 1,
  }, { value: time, unit: "h" });
}

function genAverageVelocity(): GeneratedQuestion {
  const disp = randomInt(20, 140); // m
  const t = randomInt(5, 60); // s
  const v = disp / t; // m/s
  const question = `An object has a displacement of ${disp} m in ${t} s. What is its average velocity (m/s)?`;
  return withMeta({
    question,
    answer: `${round(v)} m/s`,
    difficulty: 2,
  }, { value: v, unit: "m/s" });
}

function genAccelerationBasic(): GeneratedQuestion {
  const u = randomInt(0, 15); // m/s
  const v = randomInt(u + 5, u + 25); // m/s
  const t = randomInt(2, 10); // s
  const a = (v - u) / t; // m/s^2 (we'll keep unit implicit in answer text)
  const question = `A body accelerates from ${u} m/s to ${v} m/s in ${t} s. What is its acceleration (m/s^2)?`;
  return withMeta({
    question,
    answer: `${round(a)} m/s^2`,
    difficulty: 2,
  }, { value: a, unit: "m/s^2" });
}

function genSuvatFindOne(): GeneratedQuestion {
  // s = ut + 1/2 a t^2
  const u = randomInt(0, 20); // m/s
  const a = randomInt(1, 5); // m/s^2
  const t = randomInt(2, 8); // s
  const s = u * t + 0.5 * a * t * t; // m
  const question = `Using s = ut + 1/2 at^2, with u=${u} m/s, a=${a} m/s^2, t=${t} s. Find s (m).`;
  return withMeta({
    question,
    answer: `${round(s)} m`,
    difficulty: 3,
  }, { value: s, unit: "m" });
}

function withMeta(base: Omit<GeneratedQuestion, "id" | "topicId"> & { answer: string }, numeric: { value: number; unit: string }): GeneratedQuestion {
  return {
    id: cryptoRandomId(),
    topicId: "kinematics",
    question: base.question,
    answer: base.answer,
    difficulty: base.difficulty,
    timeLimit: base.timeLimit,
    numericAnswer: numeric,
    accepts: {
      units: inferUnitsFromAnswer(base.answer),
      tolerance: 0.01,
      aliases: { kph: "km/h", mps: "m/s" },
    },
  };
}

function inferUnitsFromAnswer(ans: string): string[] {
  const m = ans.match(/[a-zA-Z/^]+/g);
  if (!m) return [];
  // pick last token as unit
  const last = m[m.length - 1];
  if (last.includes("/")) return [last];
  return [last];
}

function round(x: number): number {
  return Math.round(x * 100) / 100;
}

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return (crypto as any).randomUUID();
  return `q_${Math.random().toString(36).slice(2, 10)}`;
}


