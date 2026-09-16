import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

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
  const { data, error } = await s
    .from("esat_mocks")
    .select(
      "id, subject, mock_number, title, status, predicted_difficulty, predicted_workload_seconds, question_count, created_at",
    )
    .order("subject")
    .order("mock_number");
  if (error) throw new Error(error.message);
  for (const m of data ?? []) {
    console.log(
      `${m.subject} #${m.mock_number} | ${m.status} | D=${m.predicted_difficulty ?? "-"} | ${m.question_count}Q | ${m.title} | ${m.id}`,
    );
  }
}

main();
