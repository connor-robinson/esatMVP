/**
 * Generate ESAT CAMP branded PDF conversion tables from Supabase data.
 * Run: node scripts/generate_conversion_table_pdfs.js
 */
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "downloads", "conversion-tables");
const LOGO_PATH = path.join(ROOT, "public", "brand", "logo-mark.png");
const SITE_URL = "https://esatcamp.com";
const BRAND_NAME = "ESAT CAMP";

const PAGE = {
  margin: 50,
  width: 595.28,
  height: 841.89,
  contentWidth: 495.28,
};

const COLORS = {
  headerBg: "#18181b",
  headerText: "#ffffff",
  bodyText: "#18181b",
  mutedText: "#52525b",
  tableHeaderBg: "#f4f4f5",
  tableRowAlt: "#fafafa",
  tableBorder: "#e4e4e7",
};

function loadEnvFile() {
  const envPath = path.join(ROOT, ".env.local");
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

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !key) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, key);

function drawHeader(doc, meta) {
  const headerHeight = 72;
  doc
    .rect(0, 0, PAGE.width, headerHeight)
    .fill(COLORS.headerBg);

  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, PAGE.margin, 18, { width: 36, height: 36 });
  }

  doc
    .fillColor(COLORS.headerText)
    .font("Helvetica-Bold")
    .fontSize(16)
    .text(BRAND_NAME, PAGE.margin + 46, 22);

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#a1a1aa")
    .text("Official score conversion tables", PAGE.margin + 46, 42);

  doc
    .fillColor(COLORS.headerText)
    .font("Helvetica-Bold")
    .fontSize(18)
    .text(`${meta.exam} ${meta.year} score conversion`, PAGE.margin, 92);

  const subtitle = [meta.sectionPaper, meta.partName, meta.subjects]
    .filter(Boolean)
    .join(" · ");

  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor(COLORS.mutedText)
    .text(subtitle, PAGE.margin, 118, { width: PAGE.contentWidth });

  return 148;
}

function drawTable(doc, rows, startY) {
  const tableX = PAGE.margin;
  const tableWidth = PAGE.contentWidth;
  const colRawWidth = 180;
  const colScaledWidth = tableWidth - colRawWidth;
  const rowHeight = 22;
  const headerHeight = 26;
  const bottomMargin = 64;

  let y = startY;

  const drawTableHeader = () => {
    doc.rect(tableX, y, tableWidth, headerHeight).fill(COLORS.tableHeaderBg);
    doc
      .strokeColor(COLORS.tableBorder)
      .lineWidth(0.5)
      .rect(tableX, y, tableWidth, headerHeight)
      .stroke();

    doc
      .fillColor(COLORS.bodyText)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("Raw mark", tableX + 12, y + 8, { width: colRawWidth - 24 })
      .text("Scaled score", tableX + colRawWidth + 12, y + 8, {
        width: colScaledWidth - 24,
      });

    y += headerHeight;
  };

  drawTableHeader();

  rows.forEach((entry, index) => {
    if (y + rowHeight > PAGE.height - bottomMargin) {
      doc.addPage();
      y = PAGE.margin;
      drawTableHeader();
    }

    if (index % 2 === 0) {
      doc.rect(tableX, y, tableWidth, rowHeight).fill(COLORS.tableRowAlt);
    }

    doc
      .strokeColor(COLORS.tableBorder)
      .lineWidth(0.5)
      .moveTo(tableX, y + rowHeight)
      .lineTo(tableX + tableWidth, y + rowHeight)
      .stroke();

    doc
      .fillColor(COLORS.bodyText)
      .font("Helvetica")
      .fontSize(10)
      .text(String(entry.rawMark), tableX + 12, y + 6, {
        width: colRawWidth - 24,
      })
      .text(entry.scaledScore.toFixed(1), tableX + colRawWidth + 12, y + 6, {
        width: colScaledWidth - 24,
      });

    y += rowHeight;
  });

  doc
    .strokeColor(COLORS.tableBorder)
    .lineWidth(0.75)
    .rect(tableX, startY, tableWidth, y - startY)
    .stroke();

  return y;
}

function drawFooter(doc) {
  const footerY = PAGE.height - 42;
  doc
    .strokeColor(COLORS.tableBorder)
    .lineWidth(0.5)
    .moveTo(PAGE.margin, footerY - 8)
    .lineTo(PAGE.width - PAGE.margin, footerY - 8)
    .stroke();

  doc
    .fillColor(COLORS.mutedText)
    .font("Helvetica")
    .fontSize(8)
    .text(
      `${BRAND_NAME} · ${SITE_URL} · Not affiliated with any university.`,
      PAGE.margin,
      footerY,
      { width: PAGE.contentWidth, align: "center" },
    );
}

function writePdf(meta, rows, filePath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: PAGE.margin,
        bottom: PAGE.margin,
        left: PAGE.margin,
        right: PAGE.margin,
      },
      info: {
        Title: `${meta.exam} ${meta.year} ${meta.partName} conversion table`,
        Author: BRAND_NAME,
        Subject: "Score conversion table",
        Creator: BRAND_NAME,
      },
    });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const tableStartY = drawHeader(doc, meta);
    drawTable(doc, rows, tableStartY + 16);
    drawFooter(doc);

    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

async function main() {
  const { execSync } = require("child_process");
  let catalog;
  try {
    const output = execSync(
      'npx tsx -e "import { fetchPublishedTableCatalog } from \'./src/lib/scoreConverter/publishedTables.server.ts\'; fetchPublishedTableCatalog().then(r => console.log(JSON.stringify(r))).catch(e => { console.error(e); process.exit(1); })"',
      {
        cwd: ROOT,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "inherit"],
      },
    );
    catalog = JSON.parse(output.trim());
  } catch (err) {
    console.error("Failed to load catalog via tsx:", err.message);
    process.exit(1);
  }

  if (!fs.existsSync(LOGO_PATH)) {
    console.warn(`Warning: logo not found at ${LOGO_PATH}`);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  let written = 0;

  for (const row of catalog) {
    const { data, error } = await supabase
      .from("conversion_rows")
      .select("raw_score, scaled_score")
      .eq("table_id", row.tableId)
      .eq("part_name", row.partName)
      .order("raw_score");

    if (error) {
      console.warn(`Skip ${row.id}: ${error.message}`);
      continue;
    }

    const rows = (data ?? []).map((r) => ({
      rawMark: r.raw_score,
      scaledScore: Number(r.scaled_score),
    }));

    if (rows.length === 0) continue;

    const filePath = path.join(OUT_DIR, row.pdfFilename);
    await writePdf(row, rows, filePath);
    written += 1;
  }

  console.log(`Wrote ${written} PDF files to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
