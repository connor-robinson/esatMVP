import rawQuestions from "../data/questions.json";
import { PracticePackSchema, type PracticeModule } from "./schema";

export const practicePack = PracticePackSchema.parse(rawQuestions);

export function getModule(moduleNumber: 1 | 2): PracticeModule {
  const module = practicePack.modules.find((entry) => entry.moduleNumber === moduleNumber);
  if (!module) throw new Error(`Unknown module: ${moduleNumber}`);
  return module;
}
