/**
 * Generate a month of FermiGuessr questions via Vertex / Gemini.
 *
 * Default: 2026-10-01 for 31 days (Halloween edition included).
 *
 *   npx tsx scripts/generate-fermi-month.ts
 *   npx tsx scripts/generate-fermi-month.ts --start 2026-10-01 --days 31
 *   npx tsx scripts/generate-fermi-month.ts --start 2026-10-01 --days 3   # smoke test
 *
 * Writes data/fermi-questions-batch-02.json incrementally (resume-safe).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { GoogleAuth } from "google-auth-library";
import {
  type FermiBatchFile,
  type FermiBatchQuestion,
  type FermiDifficulty,
  normalizeFermiBatch,
} from "../src/lib/fermi/batchQuestion";
import { getDayContext, listDateKeys } from "../src/lib/fermi/dayContext";
import { stripTrackingParams } from "../src/lib/fermi/stripUtm";
import { FERMI_QUESTIONS } from "../src/config/fermiQuestions";
import {
  extractJsonObject,
  mockBuilderModelId,
  resolveVertexLocation,
} from "../src/lib/mockBuilder/vertexClient";

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.resolve(process.cwd(), ".env.local"));
loadEnvFile(path.resolve(process.cwd(), ".env"));

const ROOT = process.cwd();
const OUT_PATH = path.join(ROOT, "data", "fermi-questions-batch-02.json");
const BATCH_01_PATH = path.join(ROOT, "data", "fermi-questions-batch-01.json");
const START_ID = 1001;
const ROUND = 5;

function argValue(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  if (i < 0) return null;
  return process.argv[i + 1] ?? null;
}

function normalizeQuestionText(q: string): string {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function loadUsedQuestions(): Set<string> {
  const used = new Set<string>();
  for (const q of FERMI_QUESTIONS) {
    used.add(normalizeQuestionText(q.question));
  }
  if (existsSync(BATCH_01_PATH)) {
    const raw = JSON.parse(readFileSync(BATCH_01_PATH, "utf8")) as Array<{
      question: string;
    }>;
    for (const q of raw) used.add(normalizeQuestionText(q.question));
  }
  return used;
}

async function getVertexAccessToken(): Promise<string | null> {
  try {
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    return typeof token === "string" ? token : token?.token ?? null;
  } catch {
    return null;
  }
}

function vertexGenerateUrl(project: string, location: string, model: string): string {
  if (location === "global") {
    return `https://aiplatform.googleapis.com/v1/projects/${project}/locations/global/publishers/google/models/${model}:generateContent`;
  }
  return `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`;
}

async function generateCreativeJson(promptText: string, model: string): Promise<string> {
  const body = {
    contents: [{ role: "user", parts: [{ text: promptText }] }],
    generationConfig: {
      temperature: 0.95,
      topP: 0.95,
      responseMimeType: "application/json",
    },
  };

  let lastErr: unknown = null;
  for (let netAttempt = 1; netAttempt <= 5; netAttempt++) {
    try {
      const project =
        process.env.GOOGLE_CLOUD_PROJECT || process.env.VERTEX_PROJECT || "";
      if (project) {
        const location = resolveVertexLocation(
          process.env.VERTEX_GENAI_LOCATION ||
            process.env.GOOGLE_CLOUD_LOCATION ||
            "",
        );
        const token = await getVertexAccessToken();
        if (token) {
          const res = await fetch(vertexGenerateUrl(project, location, model), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
          });
          if (res.ok) {
            const data = (await res.json()) as {
              candidates?: Array<{
                content?: { parts?: Array<{ text?: string }> };
              }>;
            };
            const text =
              data.candidates?.[0]?.content?.parts
                ?.map((p) => p.text ?? "")
                .join("") ?? "";
            if (text) return text;
          } else {
            const errText = await res.text().catch(() => "");
            console.warn(`Vertex HTTP ${res.status}: ${errText.slice(0, 200)}`);
            lastErr = new Error(`Vertex HTTP ${res.status}`);
            if (res.status === 429) {
              await sleep(4000 * netAttempt);
              continue;
            }
          }
        }
      }

      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        if (lastErr) throw lastErr;
        throw new Error("No Vertex ADC / project and no GEMINI_API_KEY");
      }
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Gemini HTTP ${res.status}: ${errText.slice(0, 300)}`);
      }
      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      return (
        data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ??
        ""
      );
    } catch (err) {
      lastErr = err;
      console.warn(`  network attempt ${netAttempt}/5 failed: ${String(err)}`);
      await sleep(1500 * netAttempt);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

type ModelQuestion = {
  question: string;
  answer: number;
  unit?: string;
  category: string;
  difficulty: FermiDifficulty;
  exact: boolean;
  isSeasonal?: boolean;
  seasonalNote?: string;
  themeHook?: string;
  sourceNote?: string;
  showDidYouKnow?: boolean;
  didYouKnow?: string;
  factSourceUrl?: string;
  factSourceLabel?: string;
};

function buildPrompt(input: {
  dateKey: string;
  brief: string;
  editionTitle: string | null;
  avoid: string[];
}): string {
  const avoidBlock =
    input.avoid.length === 0
      ? "(none yet)"
      : input.avoid
          .slice(-120)
          .map((q) => `- ${q}`)
          .join("\n");

  return `You write FermiGuessr: a daily order-of-magnitude estimation game that trains gut-feel estimation.

TASK: Produce EXACTLY 5 estimation questions for ${input.dateKey}.

DAY BRIEF:
${input.brief}

${
  input.editionTitle
    ? `EDITION: "${input.editionTitle}" for all 5.`
    : "No full-day edition unless the brief says so."
}

VOICE (critical):
- Sound like a curious friend, not a museum plaque or Wikipedia intro.
- SHORT: ideally under 110 characters, hard max 140 characters per question.
- One breath. One clear ask. No stacked clauses.
- Do NOT open with long historical setup ("The era of…", "By the time…", "On this day in 1871…").
- You do NOT have to name the calendar day. If you nod to Coffee Day / Halloween, keep it to a few words max.
  Good: "How many coffee beans go into a typical espresso shot?"
  Also fine: "Today is Coffee Day. How many beans go into a typical espresso?"
  Bad: "To celebrate International Coffee Day, consider your morning espresso: roughly how many individual roasted coffee beans…"

WHAT TO ASK:
- Surprising everyday estimates friends/family (esp. 18-24) can argue about at a table.
- Prefer: animals, food, body, phones/internet use, sports, travel, money, weather, space (simple), music, games, cities.
- Mix scales: tiny → planetary. At least 2 of 5 should feel "wait, WHAT?" surprising.
- Classic Fermi energy is welcome (ants, heartbeats, piano tuners vibes) but do not copy avoided list.

HARD BANS:
- No politics, elections, wars, revolutions, disasters, fires, crashes, disease campaigns, identity/awareness days, religion fights.
- No niche industrial trivia (Model T production totals, rivet counts, submarine cable km, obscure patents).
- No jargon teens would need to Google (submarine internet cables, ossuary, chassis, etc.).
- No "national coming out day" or any politically sensitive topic.
- No repeats or near-paraphrases of avoided questions (keep distinct across ~2-3 weeks).

STRUCTURE RULES:
1. Single positive numeric answer (count, length, mass, money, time, rate…).
2. Exactly ONE question has showDidYouKnow=true with:
   - didYouKnow: 1-2 short sentences, max ~200 chars, fun/useful
   - factSourceUrl: real reputable URL, NO utm params
   - factSourceLabel: short name (NASA, FAO, ONS…)
3. Other four: showDidYouKnow=false; didYouKnow/fact fields null.
4. difficulty: standard | surprising | hard
5. category: short label (food, sports, space, everyday, nature, tech, body, money…)
6. exact=true only if definitional/officially fixed.
7. sourceNote: REQUIRED short Fermi solution (~how to estimate), max ~160 chars. Example: "~70 bpm × 60 × 24 × 365 × ~80 yr ≈ 2.5e9".

Avoided questions:
${avoidBlock}

Return ONLY JSON:
{
  "editionTitle": string | null,
  "questions": [
    {
      "question": string,
      "answer": number,
      "unit": string,
      "category": string,
      "difficulty": "standard" | "surprising" | "hard",
      "exact": boolean,
      "isSeasonal": boolean,
      "seasonalNote": string | null,
      "themeHook": string | null,
      "sourceNote": string,
      "showDidYouKnow": boolean,
      "didYouKnow": string | null,
      "factSourceUrl": string | null,
      "factSourceLabel": string | null
    }
  ]
}`;
}

const BANNED_PHRASE =
  /\b(constitution|election|revolution|war\b|missile|crash of|great fire|coming out|gunpowder plot|armistice|berlin wall|colonialis|genocide|massacre|execution|riot|protest march)\b/i;

const PREAMBLE_SMELL =
  /^(the era of|by the time|to celebrate|on this (day|night) in|consider your|if you were to meticulously|the devastating)\b/i;

function questionTooLong(q: string): boolean {
  return q.trim().length > 140;
}

function asArrayQuestions(parsed: unknown): ModelQuestion[] {
  if (Array.isArray(parsed)) return parsed as ModelQuestion[];
  if (parsed && typeof parsed === "object") {
    const obj = parsed as { questions?: ModelQuestion[]; editionTitle?: string | null };
    if (Array.isArray(obj.questions)) return obj.questions;
  }
  throw new Error("Model JSON missing questions array");
}

function validateDay(
  raw: ModelQuestion[],
  used: Set<string>,
  editionTitle: string | null,
): { ok: ModelQuestion[]; errors: string[] } {
  const errors: string[] = [];
  if (raw.length !== ROUND) {
    errors.push(`Expected ${ROUND} questions, got ${raw.length}`);
  }
  const didCount = raw.filter((q) => q.showDidYouKnow).length;
  if (didCount !== 1) {
    errors.push(`Expected exactly 1 showDidYouKnow, got ${didCount}`);
  }

  const ok: ModelQuestion[] = [];
  for (const q of raw) {
    if (!q.question || typeof q.question !== "string") {
      errors.push("Missing question text");
      continue;
    }
    const trimmedQ = q.question.trim();
    if (questionTooLong(trimmedQ)) {
      errors.push(`Too long (${trimmedQ.length} chars): ${trimmedQ.slice(0, 60)}`);
      continue;
    }
    if (PREAMBLE_SMELL.test(trimmedQ) || BANNED_PHRASE.test(trimmedQ)) {
      errors.push(`Bad voice/topic: ${trimmedQ.slice(0, 70)}`);
      continue;
    }
    q.question = trimmedQ;
    const norm = normalizeQuestionText(q.question);
    if (used.has(norm)) {
      errors.push(`Duplicate: ${q.question.slice(0, 80)}`);
      continue;
    }
    if (!(typeof q.answer === "number") || !(q.answer > 0) || !Number.isFinite(q.answer)) {
      errors.push(`Bad answer for: ${q.question.slice(0, 60)}`);
      continue;
    }
    if (q.showDidYouKnow) {
      if (!q.didYouKnow || q.didYouKnow.length < 20) {
        errors.push("Did-you-know too short");
        continue;
      }
      const cleaned = stripTrackingParams(q.factSourceUrl ?? null);
      if (!cleaned || /utm/i.test(cleaned)) {
        errors.push("Missing/invalid factSourceUrl (utm not allowed)");
        continue;
      }
      q.factSourceUrl = cleaned;
    }
    const note = (q.sourceNote ?? "").trim();
    if (note.length < 12) {
      errors.push(`sourceNote too short/missing: ${q.question.slice(0, 60)}`);
      continue;
    }
    if (note.length > 220) {
      q.sourceNote = `${note.slice(0, 217).trim()}...`;
    }
    if (editionTitle) {
      q.isSeasonal = true;
      q.seasonalNote = q.seasonalNote || editionTitle;
    }
    ok.push(q);
  }

  if (ok.length !== ROUND) {
    errors.push(`After validation: ${ok.length}/${ROUND}`);
  }
  return { ok, errors };
}

function loadExistingBatch(): FermiBatchFile {
  if (!existsSync(OUT_PATH)) {
    return {
      meta: {
        batchId: "batch-02",
        title: "FermiGuessr month batch",
        startDate: "",
        endDate: "",
      },
      questions: [],
    };
  }
  const raw = JSON.parse(readFileSync(OUT_PATH, "utf8"));
  return normalizeFermiBatch(raw, {
    batchId: "batch-02",
    title: "FermiGuessr month batch",
    startDate: "",
    endDate: "",
  });
}

function saveBatch(batch: FermiBatchFile) {
  mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  const dates = [...new Set(batch.questions.map((q) => q.scheduledDate))].sort();
  batch.meta.startDate = dates[0] ?? batch.meta.startDate;
  batch.meta.endDate = dates[dates.length - 1] ?? batch.meta.endDate;
  batch.meta.generatedAt = new Date().toISOString();
  writeFileSync(OUT_PATH, `${JSON.stringify(batch, null, 2)}\n`, "utf8");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function generateDay(input: {
  dateKey: string;
  nextId: number;
  used: Set<string>;
  model: string;
}): Promise<FermiBatchQuestion[]> {
  const ctx = getDayContext(input.dateKey);
  const avoid = [...input.used];
  let lastErrors: string[] = [];

  for (let attempt = 1; attempt <= 6; attempt++) {
    const prompt = buildPrompt({
      dateKey: input.dateKey,
      brief: ctx.brief,
      editionTitle: ctx.editionTitle,
      avoid,
    });
    const text = await generateCreativeJson(prompt, input.model);
    let parsed: unknown;
    try {
      parsed = extractJsonObject(text);
    } catch (err) {
      lastErrors = [`JSON parse failed: ${String(err)}`];
      continue;
    }

    const editionFromModel =
      parsed && typeof parsed === "object"
        ? ((parsed as { editionTitle?: string | null }).editionTitle ?? null)
        : null;
    const editionTitle = ctx.editionTitle || editionFromModel;

    const { ok, errors } = validateDay(asArrayQuestions(parsed), input.used, editionTitle);
    if (ok.length === ROUND && errors.length === 0) {
      const mapped: FermiBatchQuestion[] = ok.map((q, i) => {
        const norm = normalizeQuestionText(q.question);
        input.used.add(norm);
        return {
          id: input.nextId + i,
          scheduledDate: input.dateKey,
          isSeasonal: Boolean(q.isSeasonal || editionTitle || q.themeHook),
          seasonalNote: q.seasonalNote ?? editionTitle ?? undefined,
          editionTitle: editionTitle,
          themeHook: q.themeHook ?? ctx.observances[0] ?? ctx.onThisDay[0] ?? null,
          category: q.category,
          difficulty: q.difficulty,
          exact: Boolean(q.exact),
          question: q.question.trim(),
          answer: q.answer,
          unit: q.unit,
          sourceUrl: q.showDidYouKnow
            ? stripTrackingParams(q.factSourceUrl)
            : null,
          sourceNote: q.sourceNote ?? undefined,
          showDidYouKnow: Boolean(q.showDidYouKnow),
          didYouKnow: q.showDidYouKnow ? q.didYouKnow ?? null : null,
          factSourceUrl: q.showDidYouKnow
            ? stripTrackingParams(q.factSourceUrl)
            : null,
          factSourceLabel: q.showDidYouKnow ? q.factSourceLabel ?? null : null,
        };
      });
      return mapped;
    }
    lastErrors = errors;
    console.warn(`  retry ${attempt}/6 for ${input.dateKey}: ${errors.join("; ")}`);
    await sleep(800 * attempt);
  }

  throw new Error(
    `Failed to generate ${input.dateKey} after retries: ${lastErrors.join("; ")}`,
  );
}

async function main() {
  const start = argValue("--start") || "2026-10-01";
  const days = Number(argValue("--days") || "31");
  const fresh = process.argv.includes("--fresh");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !Number.isFinite(days) || days < 1) {
    throw new Error("Usage: --start YYYY-MM-DD --days N [--fresh]");
  }

  if (fresh && existsSync(OUT_PATH)) {
    const { unlinkSync } = await import("fs");
    unlinkSync(OUT_PATH);
    console.log(`Fresh run: deleted ${OUT_PATH}`);
  }

  const model =
    process.env.FERMI_GEN_MODEL ||
    process.env.MODEL_DESIGNER ||
    mockBuilderModelId();

  const dates = listDateKeys(start, days);
  const used = loadUsedQuestions();
  const batch = loadExistingBatch();
  batch.meta.batchId = "batch-02";
  batch.meta.title = "FermiGuessr October 2026 creative month";
  batch.meta.model = model;

  for (const q of batch.questions) {
    used.add(normalizeQuestionText(q.question));
  }

  const doneDates = new Set(batch.questions.map((q) => q.scheduledDate));
  let nextId =
    batch.questions.reduce((m, q) => Math.max(m, q.id), START_ID - 1) + 1;
  if (nextId < START_ID) nextId = START_ID;

  console.log(
    `Generating ${dates.length} days starting ${start} with model ${model}`,
  );
  console.log(`Output: ${OUT_PATH}`);
  console.log(`Already done: ${doneDates.size} days, next id ${nextId}`);

  for (const dateKey of dates) {
    if (doneDates.has(dateKey)) {
      console.log(`skip ${dateKey} (already in file)`);
      continue;
    }
    const ctx = getDayContext(dateKey);
    console.log(
      `→ ${dateKey}${ctx.editionTitle ? ` [${ctx.editionTitle}]` : ""}…`,
    );
    const qs = await generateDay({ dateKey, nextId, used, model });
    batch.questions.push(...qs);
    batch.questions.sort(
      (a, b) =>
        a.scheduledDate.localeCompare(b.scheduledDate) || a.id - b.id,
    );
    nextId += ROUND;
    doneDates.add(dateKey);
    saveBatch(batch);
    console.log(
      `  saved ${qs.length} questions (did-you-know: ${qs.find((q) => q.showDidYouKnow)?.question.slice(0, 60)}…)`,
    );
    await sleep(400);
  }

  saveBatch(batch);
  console.log(
    `Done. ${batch.questions.length} questions across ${doneDates.size} days.`,
  );
  console.log(`Preview: /admin/fermi-preview`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
