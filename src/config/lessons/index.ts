/**
 * Central lesson registry
 */

import { Lesson } from "@/types/core";
import { additionLessons } from "./addition";
import { multiplicationLessons } from "./multiplication";
import { kinematicsLessons, kinematicsDslLessons } from "./physics";
import { applyOverrides } from "@/lib/lessonOverrides";

export const LESSONS: Record<string, Lesson[]> = {
  addition: additionLessons,
  multiplication: multiplicationLessons,
  // Prefer DSL lessons if present, else fallback to older config
  kinematics: (kinematicsDslLessons && kinematicsDslLessons.length ? kinematicsDslLessons : kinematicsLessons),
};

export function getLessons(topicId: string): Lesson[] {
  const base = LESSONS[topicId] || [];
  // Apply local (dev) overrides if present
  return applyOverrides(base);
}

export function getLesson(topicId: string, level: number): Lesson | undefined {
  const lessons = getLessons(topicId);
  return lessons.find((l) => l.level === level);
}

export function getLessonById(lessonId: string): { lesson: Lesson; topicId: string } | undefined {
  for (const [topicId, lessons] of Object.entries(LESSONS)) {
    const lesson = lessons.find((l) => l.id === lessonId);
    if (lesson) {
      return { lesson, topicId };
    }
  }
  return undefined;
}

export function hasLesson(topicId: string, level: number): boolean {
  return !!getLesson(topicId, level);
}




