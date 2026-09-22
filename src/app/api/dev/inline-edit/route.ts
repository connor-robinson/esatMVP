import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SaveBody = {
  pagePath?: string;
  html?: string;
  replacements?: readonly { find: string; replace: string }[];
};

const ROOT = process.cwd();

const ALLOWED_SOURCE_GLOBS = [
  "src/app/esat-preparation",
  "src/components/esatPreparation",
  "src/content/esatPreparation.ts",
  "src/content/pastPaperOverlaps.ts",
  "src/components/seo",
] as const;

function isDevLocalhost(request: Request): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const host = request.headers.get("host") ?? "";
  return (
    host.startsWith("localhost:") ||
    host.startsWith("127.0.0.1:") ||
    host.startsWith("[::1]:")
  );
}

function isAllowedSourceFile(relPath: string): boolean {
  const normalised = relPath.replace(/\\/g, "/");
  if (normalised.includes("..")) return false;
  if (!normalised.startsWith("src/")) return false;
  return ALLOWED_SOURCE_GLOBS.some(
    (allowed) =>
      normalised === allowed ||
      normalised.startsWith(`${allowed}/`) ||
      normalised.startsWith(allowed),
  );
}

async function listEditableFiles(): Promise<string[]> {
  const files: string[] = [];

  async function walk(relDir: string) {
    const abs = path.join(ROOT, relDir);
    let entries;
    try {
      entries = await fs.readdir(abs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const rel = path.join(relDir, entry.name).replace(/\\/g, "/");
      if (entry.isDirectory()) {
        await walk(rel);
        continue;
      }
      if (!/\.(tsx|ts|jsx|js|mdx)$/.test(entry.name)) continue;
      if (isAllowedSourceFile(rel)) files.push(rel);
    }
  }

  for (const allowed of ALLOWED_SOURCE_GLOBS) {
    const abs = path.join(ROOT, allowed);
    try {
      const stat = await fs.stat(abs);
      if (stat.isFile()) {
        if (isAllowedSourceFile(allowed)) files.push(allowed);
      } else if (stat.isDirectory()) {
        await walk(allowed);
      }
    } catch {
      // skip missing
    }
  }

  return [...new Set(files)];
}

function applyUniqueReplace(
  source: string,
  find: string,
  replace: string,
): { next: string; count: number } {
  if (!find || find === replace) return { next: source, count: 0 };
  let count = 0;
  let idx = 0;
  while (true) {
    const found = source.indexOf(find, idx);
    if (found === -1) break;
    count += 1;
    idx = found + find.length;
  }
  if (count !== 1) return { next: source, count };
  return { next: source.replace(find, replace), count: 1 };
}

/** DOM text → possible JSX/source spellings. */
function sourceFindVariants(find: string): string[] {
  const variants = new Set<string>([find]);
  variants.add(find.replace(/'/g, "&apos;"));
  variants.add(find.replace(/'/g, "\\'"));
  variants.add(find.replace(/"/g, "&quot;"));
  variants.add(find.replace(/"/g, '\\"'));
  variants.add(find.replace(/\s+/g, " ").trim());
  return [...variants].filter(Boolean);
}

function sourceReplaceVariants(replace: string, matchedFind: string): string {
  // Prefer matching the escape style of the string we actually replaced
  if (matchedFind.includes("&apos;")) return replace.replace(/'/g, "&apos;");
  if (matchedFind.includes("&quot;")) return replace.replace(/"/g, "&quot;");
  return replace;
}

export async function POST(request: Request) {
  if (!isDevLocalhost(request)) {
    return NextResponse.json(
      { error: "Inline edit is only available on localhost in development." },
      { status: 403 },
    );
  }

  let body: SaveBody;
  try {
    body = (await request.json()) as SaveBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const pagePath = (body.pagePath || "/esat-preparation").replace(/[^\w\-./]/g, "");
  const replacements = Array.isArray(body.replacements) ? body.replacements : [];
  const html = typeof body.html === "string" ? body.html : "";

  const snapshotDir = path.join(ROOT, "tmp", "inline-edits");
  await fs.mkdir(snapshotDir, { recursive: true });
  const snapshotName =
    pagePath.replace(/^\//, "").replace(/\//g, "__") || "page";
  const snapshotPath = path.join(snapshotDir, `${snapshotName}.html`);

  if (html) {
    const document = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Inline edit snapshot · ${pagePath}</title>
</head>
<body>
${html}
</body>
</html>
`;
    await fs.writeFile(snapshotPath, document, "utf8");
  }

  const files = await listEditableFiles();
  const applied: {
    file: string;
    find: string;
    replace: string;
  }[] = [];
  const skipped: {
    find: string;
    reason: string;
  }[] = [];

  for (const { find, replace } of replacements) {
    if (typeof find !== "string" || typeof replace !== "string") continue;
    if (!find.trim() || find === replace) continue;
    if (find.length > 4000 || replace.length > 4000) {
      skipped.push({ find, reason: "Text too long." });
      continue;
    }

    let matchedFile: string | null = null;
    let matchedFind: string | null = null;
    let ambiguous = false;

    for (const file of files) {
      const abs = path.join(ROOT, file);
      const source = await fs.readFile(abs, "utf8");
      for (const variant of sourceFindVariants(find)) {
        const { count } = applyUniqueReplace(source, variant, replace);
        if (count === 1) {
          matchedFile = file;
          matchedFind = variant;
          break;
        }
        if (count > 1) ambiguous = true;
      }
      if (matchedFile) break;
    }

    if (matchedFile && matchedFind) {
      const abs = path.join(ROOT, matchedFile);
      const source = await fs.readFile(abs, "utf8");
      const nextReplace = sourceReplaceVariants(replace, matchedFind);
      const { next } = applyUniqueReplace(source, matchedFind, nextReplace);
      await fs.writeFile(abs, next, "utf8");
      applied.push({ file: matchedFile, find, replace });
    } else if (ambiguous) {
      skipped.push({
        find,
        reason: "Matched more than once across editable sources.",
      });
    } else {
      skipped.push({
        find,
        reason: "No unique match in editable source files.",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    snapshotPath: html ? path.relative(ROOT, snapshotPath).replace(/\\/g, "/") : null,
    applied,
    skipped,
  });
}
