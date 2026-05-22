import type { SubjectFilter } from "@/types/questionBank";

export const SUBJECT_PILL_CLASS: Record<SubjectFilter, string> = {
  All: "border border-border-subtle bg-surface-mid text-text-muted",
  "Math 1": "border border-maths/30 bg-maths/20 text-maths",
  "Math 2": "border border-maths/30 bg-maths/20 text-maths",
  Physics: "border border-physics/30 bg-physics/20 text-physics",
  Chemistry: "border border-chemistry/30 bg-chemistry/20 text-chemistry",
  Biology: "border border-biology/30 bg-biology/20 text-biology",
  "Paper 1": "border border-maths/30 bg-maths/20 text-maths",
  "Paper 2": "border border-physics/30 bg-physics/20 text-physics",
};

/** Borderless session pills — lifted surface + subject text color. */
export const SUBJECT_PILL_ACTIVE: Record<SubjectFilter, string> = {
  All: "bg-surface-mid text-text dark:bg-surface-neutral",
  "Math 1": "bg-surface-mid text-accent dark:bg-surface-neutral",
  "Math 2": "bg-surface-mid text-warning dark:bg-surface-neutral",
  Physics: "bg-surface-mid text-physics dark:bg-surface-neutral",
  Chemistry: "bg-surface-mid text-chemistry dark:bg-surface-neutral",
  Biology: "bg-surface-mid text-primary dark:bg-surface-neutral",
  "Paper 1": "bg-surface-mid text-text dark:bg-surface-neutral",
  "Paper 2": "bg-surface-mid text-text dark:bg-surface-neutral",
};

export const SUBJECT_PILL_INACTIVE =
  "bg-surface-elevated text-text-muted hover:bg-surface-mid hover:text-text dark:hover:bg-surface-neutral";

export function getSubjectPillActiveClass(subject: SubjectFilter): string {
  return SUBJECT_PILL_ACTIVE[subject] ?? SUBJECT_PILL_ACTIVE.All;
}

export function getSubjectPillClass(subject?: string | null): string {
  if (!subject) return SUBJECT_PILL_CLASS.All;

  const normalized = subject.toLowerCase().trim();
  if (
    normalized === "math 1" ||
    normalized === "math1" ||
    normalized === "m1" ||
    normalized.startsWith("m1")
  ) {
    return SUBJECT_PILL_CLASS["Math 1"];
  }
  if (
    normalized === "math 2" ||
    normalized === "math2" ||
    normalized === "m2" ||
    normalized.startsWith("m2")
  ) {
    return SUBJECT_PILL_CLASS["Math 2"];
  }
  if (
    normalized === "physics" ||
    normalized === "p1" ||
    normalized === "p2" ||
    normalized.startsWith("p1") ||
    normalized.startsWith("p2")
  ) {
    return SUBJECT_PILL_CLASS.Physics;
  }
  if (
    normalized === "chemistry" ||
    normalized === "c1" ||
    normalized === "c2" ||
    normalized.startsWith("c1") ||
    normalized.startsWith("c2")
  ) {
    return SUBJECT_PILL_CLASS.Chemistry;
  }
  if (
    normalized === "biology" ||
    normalized === "b1" ||
    normalized === "b2" ||
    normalized.startsWith("b1") ||
    normalized.startsWith("b2")
  ) {
    return SUBJECT_PILL_CLASS.Biology;
  }
  if (normalized === "paper 1" || normalized === "paper1") {
    return SUBJECT_PILL_CLASS["Paper 1"];
  }
  if (normalized === "paper 2" || normalized === "paper2") {
    return SUBJECT_PILL_CLASS["Paper 2"];
  }

  return SUBJECT_PILL_CLASS.All;
}
