/**
 * Client: map raw question-bank tags to ESAT curriculum titles (fallback for filters).
 */

import curriculum from '../../../question-generation/esat_question_generator/curriculum/ESAT_CURRICULUM.json';
import {
  buildCodeToTitleMapFromCurriculum,
  labelForQuestionBankTagWithMap,
} from './topicTagLabelsCore';

const CODE_TO_TITLE = buildCodeToTitleMapFromCurriculum(curriculum);

export function labelForQuestionBankTag(raw: string): string {
  return labelForQuestionBankTagWithMap(raw, CODE_TO_TITLE);
}
