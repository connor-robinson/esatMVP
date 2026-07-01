import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const curriculumPath = join(
      process.cwd(),
      'question-generation',
      'esat_question_generator',
      'curriculum',
      'ESAT_CURRICULUM.json'
    );
    const content = readFileSync(curriculumPath, 'utf8');
    const curriculum = JSON.parse(content);
    
    return NextResponse.json(curriculum);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load curriculum' }, { status: 500 });
  }
}


