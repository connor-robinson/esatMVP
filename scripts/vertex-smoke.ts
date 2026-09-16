import fs from "fs";
import path from "path";
import { generateJsonWithLlm } from "../src/lib/mockBuilder/vertexClient";

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
  const r = await generateJsonWithLlm({
    task: "Return exactly {\"ok\":true}",
  });
  console.log(r);
}

main();
