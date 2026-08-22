/**
 * Verify example raw marks map to ~4.1 via the convert API.
 * Run: node scripts/verify_converter_examples.js
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function loadEnvFile() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          process.env[key.trim()] = valueParts
            .join("=")
            .replace(/^["']|["']$/g, "");
        }
      }
    });
}

loadEnvFile();

async function verifyExam(exam) {
  const output = execSync(
    `npx tsx -e "import { buildConverterExample } from './src/lib/scoreConverter/converterExample.server.ts'; buildConverterExample('${exam}').then(r => console.log(JSON.stringify(r))).catch(e => { console.error(e); process.exit(1); })"`,
    {
      cwd: path.join(__dirname, ".."),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
    },
  );
  const example = JSON.parse(output.trim());
  const res = await fetch("http://localhost:3000/api/score-converter/convert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      exam: example.exam,
      year: example.year,
      mode: "raw",
      selections: example.selections.map((selection) => ({
        paperName: selection.paperName,
        partName: selection.partName,
        raw: selection.raw,
      })),
    }),
  }).catch(() => null);

  if (!res) {
    console.log(`${exam}: example built (${example.selections.length} sections), convert API skipped (dev server not running)`);
    return;
  }

  const data = await res.json();
  for (const section of data.sections) {
    const diff = Math.abs(section.scaledScore - 4.1);
    const ok = diff <= 0.5;
    console.log(
      `${exam} ${section.legacyLabel}: raw ${section.raw} -> ${section.scaledScore?.toFixed(1)} ${ok ? "OK" : "CHECK"}`,
    );
  }
}

(async () => {
  for (const exam of ["NSAA", "ENGAA", "TMUA"]) {
    await verifyExam(exam);
  }
})();
