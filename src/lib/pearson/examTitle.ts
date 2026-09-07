import type { Question } from "@/types/papers";

export function formatPastPaperExamTitle(input: {
  paperName: string;
  paperVariant: string;
  questions: Question[];
}): string {
  const first = input.questions[0];
  if (first?.examName && first.examYear && first.paperName) {
    return `${first.examName} ${first.examYear} ${first.paperName}`;
  }

  const variant = input.paperVariant || "";
  const parts = variant.split("-");
  if (parts.length >= 3) {
    const year = parts[0];
    const sitting = parts.slice(1, -1).join(" ");
    return `${input.paperName} ${year} ${sitting}`.replace(/\s+/g, " ").trim();
  }

  return [input.paperName, input.paperVariant].filter(Boolean).join(" ");
}
