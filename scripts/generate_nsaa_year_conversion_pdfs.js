/**
 * Build one combined NSAA year conversion PDF (all subjects) from local CSVs.
 * Run: node scripts/generate_nsaa_year_conversion_pdfs.js
 */
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "downloads", "conversion-tables");
const LOGO_PATH = path.join(ROOT, "public", "brand", "logo-full.png");
const FONT_REGULAR = path.join(ROOT, "scripts", "fonts", "SpaceGrotesk-Regular.ttf");
const FONT_BOLD = path.join(ROOT, "scripts", "fonts", "SpaceGrotesk-Bold.ttf");
const STEMS_PATH = path.join(ROOT, "src", "lib", "scoreConverter", "exactConversionStems.ts");
const SITE_URL = "https://esatcamp.com";
const BRAND_NAME = "ESAT CAMP";

const PAGE = {
  margin: 36,
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
  rowAlt: "#fafafa",
};

const SUBJECT_BY_LETTER = {
  A: "Mathematics",
  B: "Physics",
  C: "Chemistry",
  D: "Biology",
  E: "Advanced Maths & Physics",
  X: "Physics",
  Y: "Chemistry",
  Z: "Biology",
};

function registerFonts(doc) {
  if (fs.existsSync(FONT_REGULAR) && fs.existsSync(FONT_BOLD)) {
    doc.registerFont("Body", FONT_REGULAR);
    doc.registerFont("Bold", FONT_BOLD);
    return;
  }
  doc.registerFont("Body", "Helvetica");
  doc.registerFont("Bold", "Helvetica-Bold");
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rawIdx = header.indexOf("raw_mark");
  const scaledIdx = header.indexOf("scaled_score");
  const rows = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cells = line.split(",");
    const rawMark = Number(cells[rawIdx]);
    const scaledScore = Number(cells[scaledIdx]);
    if (!Number.isFinite(rawMark) || !Number.isFinite(scaledScore)) continue;
    rows.push({ rawMark, scaledScore });
  }
  return rows.sort((a, b) => a.rawMark - b.rawMark);
}

function listNsaaYearParts() {
  const source = fs.readFileSync(STEMS_PATH, "utf8");
  const matches = [...source.matchAll(/"nsaa-(\d{4})-section-(\d+)-part-([a-ex-z])"/gi)];
  const byYear = new Map();
  for (const match of matches) {
    const year = Number(match[1]);
    const section = Number(match[2]);
    const letter = match[3].toUpperCase();
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push({
      year,
      paperName: `Section ${section}`,
      partName: `Part ${letter}`,
      subject: SUBJECT_BY_LETTER[letter] || `Part ${letter}`,
      stem: `nsaa-${year}-section-${section}-part-${letter.toLowerCase()}`,
    });
  }
  for (const parts of byYear.values()) {
    parts.sort((a, b) => {
      if (a.paperName !== b.paperName) return a.paperName.localeCompare(b.paperName);
      return a.partName.localeCompare(b.partName);
    });
  }
  return byYear;
}

function loadYearColumns(parts) {
  return parts.map((part) => {
    const csvPath = path.join(OUT_DIR, `${part.stem}-conversion.csv`);
    if (!fs.existsSync(csvPath)) {
      throw new Error(`Missing CSV: ${csvPath}`);
    }
    const scores = parseCsv(fs.readFileSync(csvPath, "utf8"));
    const scoresByRaw = new Map(scores.map((row) => [row.rawMark, row.scaledScore]));
    const maxRaw = scores.reduce((max, row) => Math.max(max, row.rawMark), 0);
    return { ...part, scoresByRaw, maxRaw };
  });
}

function groupBySection(columns) {
  const map = new Map();
  for (const col of columns) {
    if (!map.has(col.paperName)) map.set(col.paperName, []);
    map.get(col.paperName).push(col);
  }
  return [...map.entries()].map(([paperName, subjects]) => ({
    paperName,
    subjects,
    maxRaw: Math.max(...subjects.map((s) => s.maxRaw), 0),
  }));
}

function writeYearPdf(year, sections, filePath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: PAGE.margin, bottom: PAGE.margin, left: PAGE.margin, right: PAGE.margin },
      info: {
        Title: `NSAA ${year} score conversion table`,
        Author: BRAND_NAME,
        Subject: "NSAA raw mark to scaled score",
        Creator: BRAND_NAME,
      },
    });

    registerFonts(doc);
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    let y = PAGE.margin;
    if (fs.existsSync(LOGO_PATH)) {
      const logoHeight = 28;
      const logoWidth = Math.round(logoHeight * (1024 / 576));
      doc.image(LOGO_PATH, PAGE.margin, y, { width: logoWidth, height: logoHeight });
      y += logoHeight + 10;
    }

    doc
      .fillColor(COLORS.ink)
      .font("Bold")
      .fontSize(14)
      .text(`NSAA ${year}  Score conversion`, PAGE.margin, y, {
        width: PAGE.contentWidth,
      });
    y = doc.y + 4;
    doc
      .font("Body")
      .fontSize(9)
      .fillColor(COLORS.muted)
      .text("Published raw mark to 1.0–9.0 scaled score", PAGE.margin, y, {
        width: PAGE.contentWidth,
      });
    y = doc.y + 14;

    for (const section of sections) {
      if (y > PAGE.height - 160) {
        doc.addPage();
        y = PAGE.margin;
      }

      doc
        .fillColor(COLORS.ink)
        .font("Bold")
        .fontSize(11)
        .text(section.paperName, PAGE.margin, y, { width: PAGE.contentWidth });
      y = doc.y + 8;

      const cols = ["Raw", ...section.subjects.map((s) => s.subject)];
      const colCount = cols.length;
      const tableWidth = PAGE.contentWidth;
      const rawColWidth = Math.max(36, tableWidth * 0.12);
      const subjectWidth = (tableWidth - rawColWidth) / Math.max(colCount - 1, 1);
      const rowHeight = 14;
      const headerHeight = 22;

      // Header
      doc.save();
      doc.rect(PAGE.margin, y, tableWidth, headerHeight).fill(COLORS.surface);
      doc.restore();
      doc.strokeColor(COLORS.border).lineWidth(0.75);
      doc.rect(PAGE.margin, y, tableWidth, headerHeight).stroke();

      let x = PAGE.margin;
      cols.forEach((label, index) => {
        const width = index === 0 ? rawColWidth : subjectWidth;
        doc
          .fillColor(COLORS.ink)
          .font("Bold")
          .fontSize(7.5)
          .text(label, x + 4, y + 7, {
            width: width - 8,
            align: index === 0 ? "left" : "center",
            lineBreak: false,
          });
        x += width;
      });
      y += headerHeight;

      for (let raw = 0; raw <= section.maxRaw; raw += 1) {
        if (y + rowHeight > PAGE.height - PAGE.margin - 24) {
          doc.addPage();
          y = PAGE.margin;
        }

        if (raw % 2 === 1) {
          doc.save();
          doc.rect(PAGE.margin, y, tableWidth, rowHeight).fill(COLORS.rowAlt);
          doc.restore();
        }

        doc
          .strokeColor(COLORS.border)
          .lineWidth(0.5)
          .moveTo(PAGE.margin, y + rowHeight)
          .lineTo(PAGE.margin + tableWidth, y + rowHeight)
          .stroke();

        x = PAGE.margin;
        doc
          .fillColor(COLORS.ink)
          .font("Bold")
          .fontSize(8)
          .text(String(raw), x + 4, y + 3.5, {
            width: rawColWidth - 8,
            align: "left",
            lineBreak: false,
          });
        x += rawColWidth;

        for (const subject of section.subjects) {
          const value = subject.scoresByRaw.get(raw);
          const text = value == null ? "-" : String(value);
          doc
            .fillColor(COLORS.ink)
            .font("Body")
            .fontSize(8)
            .text(text, x + 2, y + 3.5, {
              width: subjectWidth - 4,
              align: "center",
              lineBreak: false,
            });
          x += subjectWidth;
        }

        y += rowHeight;
      }

      y += 18;
    }

    doc
      .fillColor(COLORS.faint)
      .font("Body")
      .fontSize(7.5)
      .text(
        `${BRAND_NAME}  ·  ${SITE_URL}  ·  Not affiliated with any university.`,
        PAGE.margin,
        PAGE.height - PAGE.margin,
        { width: PAGE.contentWidth, align: "center", lineBreak: false },
      );

    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const byYear = listNsaaYearParts();
  const years = [...byYear.keys()].sort((a, b) => a - b);
  for (const year of years) {
    const columns = loadYearColumns(byYear.get(year));
    const sections = groupBySection(columns);
    const filePath = path.join(OUT_DIR, `nsaa-${year}-conversion.pdf`);
    await writeYearPdf(year, sections, filePath);
    console.log(`Wrote ${path.basename(filePath)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
