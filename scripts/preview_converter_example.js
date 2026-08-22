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
  `npx tsx -e "import { buildConverterExample } from './src/lib/scoreConverter/converterExample.server.ts'; Promise.all(['NSAA','ENGAA','TMUA'].map(e => buildConverterExample(e).then(r => console.log(e, JSON.stringify(r,null,2))))).catch(e => { console.error(e); process.exit(1); })"`,
  {
    cwd: path.join(__dirname, ".."),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  },
);

console.log(output);
