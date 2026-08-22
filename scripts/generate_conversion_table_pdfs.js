/**
 * Generate ESAT CAMP branded PDF conversion tables from Supabase data.
 * Run: node scripts/generate_conversion_table_pdfs.js
 */
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const ROOT = path.join(__dirname, "..");
const OUT_DIR =
  process.env.CONVERSION_PDF_OUT_DIR ||
  path.join(ROOT, "public", "downloads", "conversion-tables");
const LOGO_PATH = path.join(ROOT, "public", "brand", "logo-full.png");
const FONT_REGULAR = path.join(ROOT, "scripts", "fonts", "SpaceGrotesk-Regular.ttf");
const FONT_BOLD = path.join(ROOT, "scripts", "fonts", "SpaceGrotesk-Bold.ttf");
const SITE_URL = "https://esatcamp.com";
const BRAND_NAME = "ESAT CAMP";

const PAGE = {
  margin: 40,
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
  surface: "#f3f4f6",
  border: "#d1d5db",
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

function registerFonts(doc) {
  if (fs.existsSync(FONT_REGULAR) && fs.existsSync(FONT_BOLD)) {
    doc.registerFont("Body", FONT_REGULAR);
    doc.registerFont("Bold", FONT_BOLD);
    return;
  }
  doc.registerFont("Body", "Helvetica");
  doc.registerFont("Bold", "Helvetica-Bold");
}

function computeLayout(rowCount) {
  // logo-full.png is 1024×576. Keep a compact branded header so the table
  // always fits on a single A4 page (largest tables have ~41 rows).
  const logoHeight = 32;
  const logoWidth = Math.round(logoHeight * (1024 / 576));
  const headerBlock = PAGE.margin + logoHeight + 8 + 18 + 14 + 12;
  const footerBlock = 28;
  const tableHeaderHeight = 20;
  const availableForRows =
    PAGE.height - headerBlock - footerBlock - tableHeaderHeight - PAGE.margin;
  const rowHeight = Math.max(
    9,
    Math.min(16, Math.floor(availableForRows / Math.max(rowCount, 1))),
  );
  const bodySize = rowHeight >= 14 ? 9.5 : rowHeight >= 11 ? 8.5 : 7.5;

  return {
    logoWidth,
    logoHeight,
    rowHeight,
    tableHeaderHeight,
    bodySize,
    headerSize: 13,
    subtitleSize: 9,
    footerBlock,
  };
}

function drawHeader(doc, meta, layout) {
  let y = PAGE.margin;

  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, PAGE.margin, y, {
      width: layout.logoWidth,
      height: layout.logoHeight,
    });
    y += layout.logoHeight + 8;
  } else {
    doc
      .fillColor(COLORS.ink)
      .font("Bold")
      .fontSize(14)
      .text(BRAND_NAME, PAGE.margin, y, { lineBreak: false });
    y += 22;
  }

  doc
    .fillColor(COLORS.ink)
    .font("Bold")
    .fontSize(layout.headerSize)
    .text(
      `${meta.exam} ${meta.year}  Score conversion table`,
      PAGE.margin,
      y,
      { width: PAGE.contentWidth, lineBreak: false },
    );
  y += 18;

  const subtitle = [meta.sectionPaper, meta.partName, meta.subjects]
    .filter(Boolean)
    .join("  ·  ");

  doc
    .font("Body")
    .fontSize(layout.subtitleSize)
    .fillColor(COLORS.muted)
    .text(subtitle, PAGE.margin, y, {
      width: PAGE.contentWidth,
      lineBreak: false,
    });
  y += 14;

  // Keep PDFKit's internal cursor above the footer so later draws do not
  // trigger an automatic page break.
  doc.x = PAGE.margin;
  doc.y = y;
  return y + 12;
}

function drawFooter(doc, layout) {
  const footerY = PAGE.height - layout.footerBlock + 8;
  doc
    .fillColor(COLORS.faint)
    .font("Body")
    .fontSize(7.5)
    .text(
      `${BRAND_NAME}  ·  ${SITE_URL}  ·  Not affiliated with any university.`,
      PAGE.margin,
      footerY,
      { width: PAGE.contentWidth, align: "center", lineBreak: false },
    );
}

function writePdf(meta, rows, filePath) {
  return new Promise((resolve, reject) => {
    const layout = computeLayout(rows.length);
    const doc = new PDFDocument({
      size: "A4",
      autoFirstPage: true,
      // Zero bottom margin so absolute-positioned footer/table never trips
      // PDFKit's automatic page-break logic. We lay out the page ourselves.
      margins: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      },
      info: {
        Title: `${meta.exam} ${meta.year} ${meta.partName} conversion table`,
        Author: BRAND_NAME,
        Subject: "Score conversion table",
        Creator: BRAND_NAME,
      },
    });

    let extraPages = 0;
    const nativeAddPage = doc.addPage.bind(doc);
    doc.addPage = (...args) => {
      extraPages += 1;
      console.warn(
        `Blocked extra page for ${path.basename(filePath)} (${rows.length} rows).`,
      );
      return doc;
    };

    registerFonts(doc);

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const tableStartY = drawHeader(doc, meta, layout);
    drawTable(doc, rows, tableStartY, layout);
    drawFooter(doc, layout);

    if (extraPages > 0) {
      // Restore for cleanliness; content already stayed on page 1.
      doc.addPage = nativeAddPage;
    }

    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
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

function drawTable(doc, rows, startY, layout) {
  const tableX = PAGE.margin;
  const tableWidth = PAGE.contentWidth;
  const colRawX = tableX + 20;
  const colScaledX = tableX + tableWidth - 20;
  const colRawWidth = tableWidth * 0.45;
  const colScaledWidth = tableWidth * 0.35;
  const { rowHeight, tableHeaderHeight, bodySize } = layout;
  const radius = 8;
  const tableHeight = tableHeaderHeight + rows.length * rowHeight;

  doc.save();
  drawRoundedRect(doc, tableX, startY, tableWidth, tableHeight, radius);
  doc.lineWidth(1).strokeColor(COLORS.border).stroke();
  doc.restore();

  doc.save();
  drawRoundedRect(doc, tableX, startY, tableWidth, tableHeaderHeight, radius);
  doc.fill(COLORS.surface);
  doc.restore();
  doc.rect(tableX, startY + tableHeaderHeight - radius, tableWidth, radius).fill(COLORS.surface);

  doc
    .strokeColor(COLORS.border)
    .lineWidth(0.75)
    .moveTo(tableX + tableWidth * 0.58, startY + 6)
    .lineTo(tableX + tableWidth * 0.58, startY + tableHeight - 6)
    .stroke();

  doc
    .fillColor(COLORS.ink)
    .font("Bold")
    .fontSize(9)
    .text("Raw mark", colRawX, startY + 8, { width: colRawWidth })
    .text("Scaled score", colScaledX - colScaledWidth, startY + 8, {
      width: colScaledWidth,
      align: "right",
    });

  doc
    .strokeColor(COLORS.border)
    .lineWidth(0.75)
    .moveTo(tableX + 12, startY + tableHeaderHeight)
    .lineTo(tableX + tableWidth - 12, startY + tableHeaderHeight)
    .stroke();

  let y = startY + tableHeaderHeight;

  rows.forEach((entry, index) => {
    if (index > 0) {
      doc
        .strokeColor(COLORS.border)
        .lineWidth(0.5)
        .moveTo(tableX + 12, y)
        .lineTo(tableX + tableWidth - 12, y)
        .stroke();
    }

    const textY = y + Math.max(2, (rowHeight - bodySize) / 2 - 1);

    doc
      .fillColor(COLORS.ink)
      .font("Body")
      .fontSize(bodySize)
      .text(String(entry.rawMark), colRawX, textY, {
        width: colRawWidth,
        lineBreak: false,
      })
      .font("Body")
      .text(entry.scaledScore.toFixed(1), colScaledX - colScaledWidth, textY, {
        width: colScaledWidth,
        align: "right",
        lineBreak: false,
      });

    y += rowHeight;
  });

  doc.x = PAGE.margin;
  doc.y = Math.min(y + 4, PAGE.height - layout.footerBlock - 4);
  return y;
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
  if (!fs.existsSync(FONT_REGULAR)) {
    console.warn(`Warning: font not found at ${FONT_REGULAR}`);
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
