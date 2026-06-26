import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { AiGeneratedQuestionRow } from '@/lib/supabase/types';
import { applyPublishedQuestionBankFilter } from '@/lib/questionBank/libraryFilterServer';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  buildCodeToTitleMapFromCurriculum,
  labelForQuestionBankTagWithMap,
} from '@/lib/questionBank/topicTagLabelsCore';

export const dynamic = 'force-dynamic';

type TopicOption = { value: string; label: string };

const PAGE_SIZE = 1000;

/** Tags that are only digits (e.g. "1", "07") — bad legacy/ingest data, not ESAT codes like M1/MM1. */
function isPlaceholderNumericTag(tag: string): boolean {
  const t = tag.trim();
  return t.length > 0 && /^\d+$/.test(t);
}

/**
 * GET /api/question-bank/topic-tags
 * Distinct primary_tag + secondary_tags from published question-bank questions only.
 */
export async function GET() {
  try {
    const supabase = createServerClient();

    let codeMap = new Map<string, string>();
    try {
      const curriculumPath = join(
        process.cwd(),
        'question-generation/esat_question_generator/curriculum/ESAT_CURRICULUM.json',
      );
      const curriculum = JSON.parse(readFileSync(curriculumPath, 'utf8'));
      codeMap = buildCodeToTitleMapFromCurriculum(curriculum);
    } catch {
      codeMap = new Map();
    }

    const set = new Set<string>();
    let offset = 0;

    for (;;) {
      const { data, error } = await applyPublishedQuestionBankFilter(
        supabase.from('ai_generated_questions').select('primary_tag, secondary_tags'),
      )
        .order('id', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        console.error('[topic-tags] Error:', error);
        return NextResponse.json(
          { tags: [] as string[], options: [] as TopicOption[] },
          { status: 200 },
        );
      }

      const rows = (data ?? []) as Pick<
        AiGeneratedQuestionRow,
        'primary_tag' | 'secondary_tags'
      >[];

      if (rows.length === 0) break;

      for (const row of rows) {
        const pt = row.primary_tag;
        if (pt && typeof pt === 'string' && pt.trim()) set.add(pt.trim());
        const st = row.secondary_tags;
        if (Array.isArray(st)) {
          for (const t of st) {
            if (t && typeof t === 'string' && t.trim()) set.add(t.trim());
          }
        }
      }

      if (rows.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    const tags = Array.from(set)
      .filter((t) => !isPlaceholderNumericTag(t))
      .sort((a, b) => a.localeCompare(b));
    const options: TopicOption[] = tags.map((value) => ({
      value,
      label: labelForQuestionBankTagWithMap(value, codeMap),
    }));

    return NextResponse.json({ tags, options });
  } catch (e) {
    console.error('[topic-tags]', e);
    return NextResponse.json(
      { tags: [] as string[], options: [] as TopicOption[] },
      { status: 200 },
    );
  }
}
