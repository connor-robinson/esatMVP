import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const curriculumPath = join(process.cwd(), 'scripts/esat_question_generator/by_subject_prompts/ESAT curriculum.md');
    const content = readFileSync(curriculumPath, 'utf8');
    const curriculum = JSON.parse(content);
    
    return NextResponse.json(curriculum);
  } catch (error) {
    console.error('[Curriculum API] Error reading curriculum:', error);
    return NextResponse.json({ error: 'Failed to load curriculum' }, { status: 500 });
  }
}





