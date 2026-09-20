/**
 * Send a product email test campaign to PRODUCT_EMAIL_TEST_ADDRESS only.
 *
 * Run: npx tsx scripts/send-product-email-test.ts --template=esat-free-mocks-v4
 */
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { createClient } from "@supabase/supabase-js";

// Scripts run outside Next.js; stub server-only so email helpers can load.
const require = createRequire(__filename);
const serverOnlyPath = require.resolve("server-only");
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as NodeModule;

const {
  PRODUCT_EMAIL_TEST_ADDRESS,
  sendProductEmailCampaign,
} = require("../src/lib/email/productEmails") as typeof import("../src/lib/email/productEmails");
const {
  getProductEmailTemplate,
} = require("../src/lib/email/templates") as typeof import("../src/lib/email/templates");

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
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

function argValue(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  if (i < 0) return null;
  const next = process.argv[i + 1];
  if (!next || next.startsWith("--")) return "";
  return next;
}

async function main() {
  const templateFlag =
    argValue("--template") ||
    process.argv
      .find((a) => a.startsWith("--template="))
      ?.slice("--template=".length) ||
    "esat-free-mocks-v4";

  const template = getProductEmailTemplate(templateFlag);
  if (!template) {
    throw new Error(`Unknown template: ${templateFlag}`);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  if (!process.env.RESEND_API_KEY?.trim()) {
    throw new Error("Missing RESEND_API_KEY");
  }

  const service = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: admin } = await service
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();

  if (!admin?.id) {
    throw new Error("No admin profile found for created_by");
  }

  console.log(
    `Sending template "${template.id}" to test address ${PRODUCT_EMAIL_TEST_ADDRESS}…`,
  );

  const testVariant =
    process.argv.includes("--variant=b") || process.argv.includes("--b")
      ? "b"
      : "a";

  const result = await sendProductEmailCampaign({
    service,
    createdBy: String(admin.id),
    subject: template.subject,
    subjectB: template.subjectB ?? null,
    body: template.text,
    templateId: template.id,
    testSend: true,
    testVariant,
  });

  console.log(JSON.stringify(result, null, 2));
  if (result.status === "failed" || result.sentCount < 1) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
