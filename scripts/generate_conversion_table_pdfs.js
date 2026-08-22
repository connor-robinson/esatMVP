/**
 * Generate ESAT CAMP branded PDF conversion tables from Supabase data.
 * Run: node scripts/generate_conversion_table_pdfs.js
 */
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "downloads", "conversion-tables");
const LOGO_PATH = path.join(ROOT, "public", "brand", "logo-full.png");
const SITE_URL = "https://esatcamp.com";
const BRAND_NAME = "ESAT CAMP";

const PAGE = {
  margin: 48,
  width: 595.28,
  height: 841.89,
  get contentWidth() {
    return this.width - this.margin * 2;
  },
};

const COLORS = {
  ink: "#111111",
  muted: "#6b7280",
  faint: "#9ca3af",
  surface: "#f8fafc",
  headerBg: "#111111",
  headerText: "#ffffff",
  border: "#e5e7eb",
  rowAlt: "#f9fafb",
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
  let y = PAGE.margin;

  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, PAGE.margin, y, { width: 148 });
    y += 34;
  } else {
    doc
      .fillColor(COLORS.ink)
      .font("Helvetica-Bold")
      .fontSize(18)
      .text(BRAND_NAME, PAGE.margin, y);
    y += 28;
  }

  y += 18;
  doc
    .strokeColor(COLORS.border)
    .lineWidth(1)
    .moveTo(PAGE.margin, y)
    .lineTo(PAGE.width - PAGE.margin, y)
    .stroke();
  y += 22;

  doc
    .fillColor(COLORS.ink)
    .font("Helvetica-Bold")
    .fontSize(22)
    .text(`${meta.exam} ${meta.year}`, PAGE.margin, y);

  y += 28;
  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor(COLORS.ink)
    .text("Score conversion table", PAGE.margin, y);

  const subtitle = [meta.sectionPaper, meta.partName, meta.subjects]
    .filter(Boolean)
    .join("  ·  ");

  y += 20;
  doc
    .font("Helvetica")
    .fontSize(10.5)
    .fillColor(COLORS.muted)
    .text(subtitle, PAGE.margin, y, { width: PAGE.contentWidth, lineGap: 2 });

  y += doc.heightOfString(subtitle, { width: PAGE.contentWidth }) + 6;
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(COLORS.faint)
    .text(
      `${rowsLabel(meta)} · Scaled scores reported to one decimal place`,
      PAGE.margin,
      y,
    );

  return y + 22;
}

function rowsLabel(meta) {
  return `${meta.rowCount} raw mark${meta.rowCount === 1 ? "" : "s"}`;
}

function drawRoundedRect(doc, x, y, width, height, radius) {
  doc.moveTo(x + radius, y);
  doc.lineTo(x + width - radius, y);
  doc.quadraticCurveTo(x + width, y, x + width, y + radius);
  doc.lineTo(x + width, y + height - radius);
  doc.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  doc.lineTo(x + radius, y + height);
  doc.quadraticCurveTo(x, y + height, x, y + height - radius);
  doc.lineTo(x, y + radius);
  doc.quadraticCurveTo(x, y, x + radius, y);
  doc.closePath();
}

function drawTable(doc, rows, startY) {
  const tableX = PAGE.margin;
  const tableWidth = PAGE.contentWidth;
  const colRawX = tableX + 24;
  const colScaledX = tableX + tableWidth - 24;
  const colRawWidth = tableWidth * 0.45;
  const colScaledWidth = tableWidth * 0.35;
  const rowHeight = 24;
  const headerHeight = 30;
  const bottomMargin = 56;
  const radius = 8;

  let y = startY;
  let segmentStart = y;
  let isFirstSegment = true;

  const drawColumnGuide = (top, bottom) => {
    doc
      .strokeColor(isFirstSegment ? "#2a2a2a" : COLORS.border)
      .lineWidth(0.5)
      .moveTo(tableX + tableWidth * 0.58, top + 8)
      .lineTo(tableX + tableWidth * 0.58, bottom - 8)
      .stroke();
  };

  const drawTableHeader = () => {
    segmentStart = y;

    if (isFirstSegment) {
      doc.save();
      drawRoundedRect(doc, tableX, y, tableWidth, headerHeight, radius);
      doc.fill(COLORS.headerBg);
      doc.restore();
    } else {
      doc.rect(tableX, y, tableWidth, headerHeight).fill(COLORS.headerBg);
    }

    doc
      .fillColor(COLORS.headerText)
      .font("Helvetica-Bold")
      .fontSize(9.5)
      .text("RAW MARK", colRawX, y + 10, {
        width: colRawWidth,
        characterSpacing: 0.6,
      })
      .text("SCALED SCORE", colScaledX - colScaledWidth, y + 10, {
        width: colScaledWidth,
        align: "right",
        characterSpacing: 0.6,
      });

    drawColumnGuide(y, y + headerHeight);
    y += headerHeight;
  };

  const finishSegment = (isLast) => {
    const segmentHeight = y - segmentStart;
    doc.save();
    if (isFirstSegment && isLast) {
      drawRoundedRect(doc, tableX, segmentStart, tableWidth, segmentHeight, radius);
    } else if (isFirstSegment) {
      doc.moveTo(tableX, segmentStart + radius);
      doc.lineTo(tableX, segmentStart + segmentHeight);
      doc.lineTo(tableX + tableWidth, segmentStart + segmentHeight);
      doc.lineTo(tableX + tableWidth, segmentStart + radius);
      doc.quadraticCurveTo(
        tableX + tableWidth,
        segmentStart,
        tableX + tableWidth - radius,
        segmentStart,
      );
      doc.lineTo(tableX + radius, segmentStart);
      doc.quadraticCurveTo(tableX, segmentStart, tableX, segmentStart + radius);
      doc.closePath();
    } else if (isLast) {
      doc.moveTo(tableX, segmentStart);
      doc.lineTo(tableX + tableWidth, segmentStart);
      doc.lineTo(tableX + tableWidth, segmentStart + segmentHeight - radius);
      doc.quadraticCurveTo(
        tableX + tableWidth,
        segmentStart + segmentHeight,
        tableX + tableWidth - radius,
        segmentStart + segmentHeight,
      );
      doc.lineTo(tableX + radius, segmentStart + segmentHeight);
      doc.quadraticCurveTo(
        tableX,
        segmentStart + segmentHeight,
        tableX,
        segmentStart + segmentHeight - radius,
      );
      doc.lineTo(tableX, segmentStart);
      doc.closePath();
    } else {
      doc.rect(tableX, segmentStart, tableWidth, segmentHeight);
    }
    doc.lineWidth(1).strokeColor(COLORS.border).stroke();
    doc.restore();
    isFirstSegment = false;
  };

  drawTableHeader();

  rows.forEach((entry, index) => {
    if (y + rowHeight > PAGE.height - bottomMargin) {
      finishSegment(false);
      doc.addPage();
      y = PAGE.margin;
      drawTableHeader();
    }

    if (index % 2 === 0) {
      doc.save();
      doc.rect(tableX + 1, y, tableWidth - 2, rowHeight).fill(COLORS.rowAlt);
      doc.restore();
    }

    doc
      .strokeColor(COLORS.border)
      .lineWidth(0.5)
      .moveTo(tableX + 12, y + rowHeight)
      .lineTo(tableX + tableWidth - 12, y + rowHeight)
      .stroke();

    doc
      .fillColor(COLORS.ink)
      .font("Helvetica")
      .fontSize(11)
      .text(String(entry.rawMark), colRawX, y + 7, { width: colRawWidth })
      .font("Helvetica-Bold")
      .text(entry.scaledScore.toFixed(1), colScaledX - colScaledWidth, y + 7, {
        width: colScaledWidth,
        align: "right",
      });

    y += rowHeight;
  });

  finishSegment(true);
  return y;
}

function drawFooter(doc) {
  const footerY = PAGE.height - 40;
  doc
    .strokeColor(COLORS.border)
    .lineWidth(0.75)
    .moveTo(PAGE.margin, footerY - 10)
    .lineTo(PAGE.width - PAGE.margin, footerY - 10)
    .stroke();

  doc
    .fillColor(COLORS.faint)
    .font("Helvetica")
    .fontSize(8)
    .text(
      `${BRAND_NAME}  ·  ${SITE_URL}  ·  Not affiliated with any university.`,
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
    drawTable(doc, rows, tableStartY);
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
    await writePdf({ ...row, rowCount: rows.length }, rows, filePath);
    written += 1;
  }

  console.log(`Wrote ${written} PDF files to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
