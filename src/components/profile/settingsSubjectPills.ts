import { cn } from "@/lib/utils";
import {
  SUBJECT_TILE_STYLES,
  type SubjectTileKey,
} from "@/lib/questionBank/subjectTileTheme";

export const ESAT_SUBJECTS: SubjectTileKey[] = [
  "Math 1",
  "Math 2",
  "Chemistry",
  "Biology",
  "Physics",
];

export function esatSubjectPillClass(
  subject: SubjectTileKey,
  isSelected: boolean,
): string {
  const styles = SUBJECT_TILE_STYLES[subject];

  if (!isSelected) {
    return cn(
      "bg-surface-mid text-text-muted",
      "hover:bg-surface-neutral hover:text-text",
    );
  }

  return cn("font-semibold", styles.startBtnClass);
}
