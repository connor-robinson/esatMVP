/**
 * Run the ENGAA 2019–2020 conversion fix migration SQL against Postgres.
 * Requires DATABASE_URL (direct Postgres) in .env.local.
 *
 * Run: node scripts/run_engaa_conversion_fix_migration.js
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function loadEnvFile() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const values = {};
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          values[key.trim()] = valueParts
            .join("=")
            .replace(/^["']|["']$/g, "");
        }
      }
    });
  return values;
}

const env = loadEnvFile();
const databaseUrl =
  process.env.DATABASE_URL ||
  env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  env.SUPABASE_DB_URL;

if (!databaseUrl) {
  console.error(
    "Missing DATABASE_URL in .env.local. Apply the migration with:\n" +
      "  supabase db push\n" +
      "or psql $DATABASE_URL -f supabase/migrations/20260822100000_fix_engaa_2019_2020_general_mislabel.sql",
  );
  process.exit(1);
}

const migrationPath = path.join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20260822100000_fix_engaa_2019_2020_general_mislabel.sql",
);

try {
  execSync(`psql "${databaseUrl}" -v ON_ERROR_STOP=1 -f "${migrationPath}"`, {
    stdio: "inherit",
    shell: true,
  });
  console.log("Migration applied successfully.");
} catch (err) {
  console.error("Migration failed. conversion_rows is protected via triggers;");
  console.error("use the SQL migration file (not the REST apply script).");
  process.exit(1);
}
