import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { cancelAndDeleteMock } from "../src/lib/mockBuilder/server";

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
  const ids = process.argv.slice(2);
  if (ids.length === 0) throw new Error("Pass mock ids to delete");
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  for (const id of ids) {
    await cancelAndDeleteMock(s, id);
    console.log(`Deleted ${id}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
