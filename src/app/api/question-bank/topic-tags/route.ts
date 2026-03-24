import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import type { AiGeneratedQuestionRow } from "@/lib/supabase/types";
import { readFileSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

type TopicOption = { value: string; label: string };

function buildTopicLabel(raw: string, curriculum: any | null): string {
  if (!raw) return raw;

  const subjectPrefixes = [
    "Math 1",
    "Math 2",
    "Physics",
    "Chemistry",
    "Biology",
    "Paper 1",
    "Paper 2",
    "Mathematics 1",
    "Mathematics 2",
  ];
  for (const prefix of subjectPrefixes) {
    const pattern = new RegExp(`^${prefix}\\s*-\\s*`, "i");
    if (pattern.test(raw)) return raw.replace(pattern, "").trim();
  }

  if (!curriculum?.papers) return raw;

  let paperId = "";
  let cleanCode = raw;
  if (raw.startsWith("M1-")) {
    paperId = "math1";
    cleanCode = raw.replace("M1-", "");
  } else if (raw.startsWith("M2-")) {
    paperId = "math2";
    cleanCode = raw.replace("M2-", "");
  } else if (raw.startsWith("P-")) {
    paperId = "physics";
    cleanCode = raw.replace("P-", "");
  } else if (raw.startsWith("biology-")) {
    paperId = "biology";
    cleanCode = raw.replace("biology-", "");
  } else if (raw.startsWith("chemistry-")) {
    paperId = "chemistry";
    cleanCode = raw.replace("chemistry-", "");
  }

  const allPapers = curriculum.papers || [];
  const candidatePapers = paperId
    ? allPapers.filter((p: any) => p.paper_id === paperId)
    : allPapers;
  for (const paper of candidatePapers) {
    const topics = paper.topics || [];
    const t =
      topics.find((x: any) => x.code === cleanCode) ||
      topics.find((x: any) => x.code === cleanCode.replace(/^[A-Z]+/, "")) ||
      topics.find((x: any) => x.code === raw);
    if (t?.title) return String(t.title);
  }

  return raw;
}

/**
 * GET /api/question-bank/topic-tags
 * Distinct primary_tag + secondary_tags from approved questions (for filter UI).
 */
export async function GET() {
  try {
    const supabase = createServerClient();
    let curriculum: any | null = null;
    try {
      const curriculumPath = join(
        process.cwd(),
        "scripts/esat_question_generator/curriculum/ESAT_CURRICULUM.json",
      );
      curriculum = JSON.parse(readFileSync(curriculumPath, "utf8"));
    } catch {
      curriculum = null;
    }

    const { data, error } = await supabase
      .from("ai_generated_questions")
      .select("primary_tag, secondary_tags")
      .eq("status", "approved")
      .limit(10000);

    if (error) {
      console.error("[topic-tags] Error:", error);
      return NextResponse.json(
        { tags: [] as string[], options: [] as TopicOption[] },
        { status: 200 },
      );
    }

    const rows = (data ?? []) as Pick<
      AiGeneratedQuestionRow,
      "primary_tag" | "secondary_tags"
    >[];
    const set = new Set<string>();
    for (const row of rows) {
      const pt = row.primary_tag;
      if (pt && typeof pt === "string" && pt.trim()) set.add(pt.trim());
      const st = row.secondary_tags;
      if (Array.isArray(st)) {
        for (const t of st) {
          if (t && typeof t === "string" && t.trim()) set.add(t.trim());
        }
      }
    }

    const tags = Array.from(set).sort((a, b) => a.localeCompare(b));
    const options: TopicOption[] = tags.map((value) => ({
      value,
      label: buildTopicLabel(value, curriculum),
    }));
    return NextResponse.json({ tags, options });
  } catch (e) {
    console.error("[topic-tags]", e);
    return NextResponse.json(
      { tags: [] as string[], options: [] as TopicOption[] },
      { status: 200 },
    );
  }
}
