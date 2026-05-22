import type { SubjectFilter } from '@/types/questionBank';

/** Canonical test type per question-bank subject (home tiles + progress). */
export const SUBJECT_TEST_TYPE: Record<
  Exclude<SubjectFilter, 'All'>,
  'ESAT' | 'TMUA'
> = {
  'Math 1': 'ESAT',
  'Math 2': 'ESAT',
  Physics: 'ESAT',
  Chemistry: 'ESAT',
  Biology: 'ESAT',
  'Paper 1': 'TMUA',
  'Paper 2': 'TMUA',
};

export function subjectMatchesTestType(
  subject: string,
  testType: string | null | undefined,
): boolean {
  const expected =
    SUBJECT_TEST_TYPE[subject as Exclude<SubjectFilter, 'All'>];
  return expected ? testType === expected : true;
}
