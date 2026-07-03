/**
 * Export all ESAT curriculum tags (prefixed + raw) to data/esat_curriculum_tags.json
 * Run: node scripts/export-esat-curriculum-tags.mjs
 */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const SOURCE = path.join(
  ROOT,
  "question-generation/esat_question_generator/curriculum/ESAT_CURRICULUM.json",
);
const OUT = path.join(ROOT, "data/esat_curriculum_tags.json");

/** Preferred display order for ESAT subjects in the export. */
const SUBJECT_ORDER = ["math1", "math2", "physics", "chemistry", "biology"];

const DISPLAY_SUBJECT = {
  math1: "Math 1",
  math2: "Math 2",
  physics: "Physics",
  chemistry: "Chemistry",
  biology: "Biology",
};

function prefixedTag(paperId, rawCode) {
  if (paperId === "math1") return `M1-${rawCode}`;
  if (paperId === "math2") return `M2-${rawCode}`;
  if (paperId === "physics") return `P-${rawCode}`;
  return `${paperId}-${rawCode}`;
}

const source = JSON.parse(fs.readFileSync(SOURCE, "utf8"));
const papersById = new Map(source.papers.map((p) => [p.paper_id, p]));

const subjects = SUBJECT_ORDER.filter((id) => papersById.has(id)).map((paperId) => {
  const paper = papersById.get(paperId);
  const tags = (paper.topics ?? []).map((topic, index) => ({
    order: index + 1,
    curriculumTag: prefixedTag(paperId, topic.code),
    rawCode: topic.code,
    title: topic.title,
  }));

  return {
    paperId,
    subject: paper.paper_name,
    displaySubject: DISPLAY_SUBJECT[paperId] ?? paper.paper_name,
    tagCount: tags.length,
    tags,
    curriculumTags: tags.map((t) => t.curriculumTag),
  };
});

const allTags = subjects.flatMap((s) => s.tags);

const output = {
  exam: source.exam,
  source: source.source,
  exportedAt: new Date().toISOString().slice(0, 10),
  tagFormatNotes: {
    math1: "M1-{code} e.g. M1-M4",
    math2: "M2-{code} e.g. M2-MM7",
    physics: "P-{code} e.g. P-P3",
    chemistry: "chemistry-{code} e.g. chemistry-C1",
    biology: "biology-{code} e.g. biology-B1",
  },
  summary: {
    subjectCount: subjects.length,
    totalTags: allTags.length,
    tagsBySubject: Object.fromEntries(
      subjects.map((s) => [s.displaySubject, s.tagCount]),
    ),
  },
  subjects,
  allCurriculumTags: allTags.map((t) => ({
    curriculumTag: t.curriculumTag,
    subject: subjects.find((s) =>
      s.tags.some((x) => x.curriculumTag === t.curriculumTag),
    )?.displaySubject,
    title: t.title,
  })),
};

fs.writeFileSync(OUT, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Wrote ${allTags.length} tags across ${subjects.length} subjects to ${OUT}`);
