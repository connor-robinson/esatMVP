import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { MOCK_BUILDER_SUBJECTS } from "../src/lib/mockBuilder/types";

const p = path.resolve(".env.local");
for (const line of fs.readFileSync(p, "utf8").split(/\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i <= 0) continue;
  const k = t.slice(0, i).trim();
  const v = t.slice(i + 1).trim();
  if (!(k in process.env)) process.env[k] = v;
}

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  type Row = { subjects: string; mock_difficulty: number | null };
  const pageSize = 1000;
  const all: Row[] = [];

  for (const subject of MOCK_BUILDER_SUBJECTS) {
    for (let from = 0; ; from += pageSize) {
      const to = from + pageSize - 1;
      const { data, error } = await s
        .from("ai_generated_questions")
        .select("subjects, mock_difficulty")
        .eq("subjects", subject)
        .in("status", ["approved", "pending"])
        .eq("mock_eligible", true)
        .range(from, to);
      if (error) throw new Error(error.message);
      if (!data?.length) break;
      all.push(...(data as Row[]));
      if (data.length < pageSize) break;
    }
  }

  const difficulties = [1, 2, 3, 4, 5] as const;
  const bySubject = new Map<string, Record<string, number>>();
  for (const subject of MOCK_BUILDER_SUBJECTS) {
    bySubject.set(subject, {
      D1: 0,
      D2: 0,
      D3: 0,
      D4: 0,
      D5: 0,
      unlabeled: 0,
      total: 0,
    });
  }
  const totals = {
    D1: 0,
    D2: 0,
    D3: 0,
    D4: 0,
    D5: 0,
    unlabeled: 0,
    total: 0,
  };

  for (const row of all) {
    const bucket = bySubject.get(row.subjects);
    if (!bucket) continue;
    bucket.total += 1;
    totals.total += 1;
    const d = row.mock_difficulty;
    if (d == null || !difficulties.includes(d as (typeof difficulties)[number])) {
      bucket.unlabeled += 1;
      totals.unlabeled += 1;
      continue;
    }
    const key = `D${d}` as "D1" | "D2" | "D3" | "D4" | "D5";
    bucket[key] += 1;
    totals[key] += 1;
  }

  console.log(
    [
      "Subject",
      "D1",
      "D2",
      "D3",
      "D4",
      "D5",
      "Unlabeled",
      "Labeled",
      "Total",
    ].join("\t"),
  );
  for (const subject of MOCK_BUILDER_SUBJECTS) {
    const b = bySubject.get(subject)!;
    const labeled = b.total - b.unlabeled;
    console.log(
      [
        subject,
        b.D1,
        b.D2,
        b.D3,
        b.D4,
        b.D5,
        b.unlabeled,
        labeled,
        b.total,
      ].join("\t"),
    );
  }
  const labeledTotal = totals.total - totals.unlabeled;
  console.log(
    [
      "TOTAL",
      totals.D1,
      totals.D2,
      totals.D3,
      totals.D4,
      totals.D5,
      totals.unlabeled,
      labeledTotal,
      totals.total,
    ].join("\t"),
  );

  // Also print markdown for the chat
  console.log("\n---MARKDOWN---");
  console.log(
    "| Subject | D1 | D2 | D3 | D4 | D5 | Unlabeled | Labeled | Total |",
  );
  console.log("|---|---:|---:|---:|---:|---:|---:|---:|---:|");
  for (const subject of MOCK_BUILDER_SUBJECTS) {
    const b = bySubject.get(subject)!;
    const labeled = b.total - b.unlabeled;
    console.log(
      `| ${subject} | ${b.D1} | ${b.D2} | ${b.D3} | ${b.D4} | ${b.D5} | ${b.unlabeled} | ${labeled} | ${b.total} |`,
    );
  }
  console.log(
    `| **TOTAL** | **${totals.D1}** | **${totals.D2}** | **${totals.D3}** | **${totals.D4}** | **${totals.D5}** | **${totals.unlabeled}** | **${labeledTotal}** | **${totals.total}** |`,
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
