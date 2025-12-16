/**
 * Subject definitions
 */

import { Subject, SubjectId } from "@/types/core";

export const SUBJECTS: Subject[] = [
  {
    id: "maths",
    name: "Mathematics",
    description: "Sharpen your mental math skills across arithmetic, algebra, and geometry.",
    icon: "FunctionSquare",
    color: "var(--subj-maths)",
    categories: ["arithmetic", "algebra", "geometry", "number_theory", "shortcuts"],
  },
  {
    id: "physics",
    name: "Physics",
    description: "Explore the fundamental laws of the universe with interactive visualizations.",
    icon: "Atom",
    color: "var(--subj-physics)",
    categories: ["mechanics", "optics", "electricity", "thermodynamics"],
  },
  {
    id: "chemistry",
    name: "Chemistry",
    description: "Discover atomic structure, chemical reactions, and molecular interactions.",
    icon: "FlaskConical",
    color: "var(--subj-chem)",
    categories: ["atomic_structure", "reactions", "organic", "analytical"],
  },
  {
    id: "biology",
    name: "Biology",
    description: "Study living systems, cellular processes, and evolutionary mechanisms.",
    icon: "Leaf",
    color: "var(--subj-bio)",
    categories: ["cell_biology", "genetics", "evolution", "ecology"],
  },
];

export function getAllSubjects(): Subject[] {
  return SUBJECTS;
}

export function getSubject(id: SubjectId): Subject | undefined {
  return SUBJECTS.find(subject => subject.id === id);
}
