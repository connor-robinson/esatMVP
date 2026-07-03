/**
 * Reorder hook-set JSON files by generation id (display order only).
 * Run: npx tsx scripts/reorder-esat-hook-sets.ts
 */
import fs from "fs";
import path from "path";

const REORDER: Record<string, readonly string[]> = {
  "esat_math1_hook_set_10_questions.json": [
    "esat-m1-hook-03",
    "esat-m1-hook-06",
    "esat-m1-hook-05",
    "esat-m1-hook-10",
    "esat-m1-hook-08",
    "esat-m1-hook-02",
    "esat-m1-hook-01",
    "esat-m1-hook-07",
    "esat-m1-hook-04",
    "esat-m1-hook-09",
  ],
  "esat_math2_hook_set_10_questions.json": [
    "esat-m2-hook-01",
    "esat-m2-hook-03",
    "esat-m2-hook-08",
    "esat-m2-hook-10",
    "esat-m2-hook-02",
    "esat-m2-hook-05",
    "esat-m2-hook-06",
    "esat-m2-hook-04",
    "esat-m2-hook-07",
    "esat-m2-hook-09",
  ],
  "esat_physics_hook_set_10_questions.json": [
    "esat-physics-hook-04",
    "esat-physics-hook-02",
    "esat-physics-hook-01",
    "esat-physics-hook-09r",
    "esat-physics-hook-06",
    "esat-physics-hook-08",
    "esat-physics-hook-05r",
    "esat-physics-hook-03",
    "esat-physics-hook-07",
    "esat-physics-hook-10",
  ],
};

type HookQuestion = { id: string; order: number; [key: string]: unknown };
type HookSetFile = { set: Record<string, unknown>; questions: HookQuestion[] };

function validate(file: string, payload: HookSetFile, desiredOrder: readonly string[]) {
  const errors: string[] = [];
  const ids = new Set(payload.questions.map((q) => q.id));

  if (payload.questions.length !== 10) {
    errors.push(`${file}: expected 10 questions, found ${payload.questions.length}`);
  }
  if (ids.size !== 10) {
    errors.push(`${file}: duplicate question ids`);
  }
  for (const id of desiredOrder) {
    if (!ids.has(id)) errors.push(`${file}: missing id ${id}`);
  }
  if (desiredOrder.length !== 10) {
    errors.push(`${file}: desired order must have 10 ids`);
  }
  if (new Set(desiredOrder).size !== 10) {
    errors.push(`${file}: desired order has duplicate ids`);
  }

  const reordered = desiredOrder.map((id, index) => {
    const q = payload.questions.find((item) => item.id === id);
    if (!q) throw new Error(`${file}: missing question ${id}`);
    return { ...q, order: index + 1 };
  });

  const orders = reordered.map((q) => q.order).sort((a, b) => a - b);
  const expectedOrders = Array.from({ length: 10 }, (_, i) => i + 1);
  if (JSON.stringify(orders) !== JSON.stringify(expectedOrders)) {
    errors.push(`${file}: orders must be 1–10 exactly once`);
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  return reordered;
}

function main() {
  const dataDir = path.join(process.cwd(), "data");

  for (const [fileName, desiredOrder] of Object.entries(REORDER)) {
    const filePath = path.join(dataDir, fileName);
    const payload = JSON.parse(fs.readFileSync(filePath, "utf8")) as HookSetFile;
    const beforeIds = payload.questions.map((q) => q.id).join(", ");
    const reordered = validate(fileName, payload, desiredOrder);
    payload.questions = reordered;
    fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    const afterIds = reordered.map((q) => q.id).join(", ");
    console.log(`${fileName}`);
    console.log(`  before: ${beforeIds}`);
    console.log(`  after:  ${afterIds}`);
  }

  console.log("\nHook set JSON reorder complete.");
}

main();
