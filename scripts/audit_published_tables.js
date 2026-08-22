/**
 * Audit published conversion table catalog.
 * Run: node scripts/audit_published_tables.js
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

const output = execSync(
  'npx tsx -e "import { fetchPublishedTableCatalog } from \'./src/lib/scoreConverter/publishedTables.server.ts\'; fetchPublishedTableCatalog().then(r => console.log(JSON.stringify(r))).catch(e => { console.error(e); process.exit(1); })"',
  {
    cwd: path.join(__dirname, ".."),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  },
);

const catalog = JSON.parse(output.trim());
const byExam = {};
for (const row of catalog) {
  byExam[row.exam] = (byExam[row.exam] ?? 0) + 1;
}

console.log("Catalog total:", catalog.length);
console.log("By exam:", byExam);

const missingPdf = catalog.filter((r) => !r.pdfFilename);
console.log("\nRows missing pdfFilename:", missingPdf.length);
missingPdf.forEach((r) =>
  console.log(`  ${r.id} csv=${r.csvFilename}`),
);

const tmua = catalog.filter((r) => r.exam === "TMUA");
console.log("\nTMUA rows:", tmua.length);
tmua.forEach((r) => console.log(JSON.stringify(r)));
