/**
 * Structural eras for NSAA / ENGAA / TMUA as used on the past-papers guide.
 * Facts come from the instructions printed in the original papers / specs.
 */

export type StructureEra = {
  years: string;
  title: string;
  highlight?: string;
  bullets: readonly string[];
};

export type ExamStructureBlock = {
  id: "nsaa" | "engaa" | "tmua";
  exam: string;
  fullName: string;
  accent: "nsaa" | "engaa" | "tmua";
  summary: string;
  eras: readonly StructureEra[];
  sections: readonly {
    name: string;
    eras: readonly StructureEra[];
  }[];
  footnote?: string;
};

export const NSAA_STRUCTURE: ExamStructureBlock = {
  id: "nsaa",
  exam: "NSAA",
  fullName: "Natural Sciences Admissions Assessment",
  accent: "nsaa",
  summary:
    "Two sections. Section 1 is the main ESAT-shaped bank. Section 2 changed from long written questions to harder multiple choice in 2020.",
  eras: [
    {
      years: "2016–2019",
      title: "Older shape",
      highlight: "5 parts in Section 1 · written Section 2",
      bullets: [
        "Section 1: Maths + two other parts, 80 minutes",
        "Section 2: choose 2 of 6 long written science questions, 40 minutes, calculator allowed",
      ],
    },
    {
      years: "2020–2023",
      title: "Closer to ESAT",
      highlight: "4 parts in Section 1 · MCQ Section 2",
      bullets: [
        "Section 1: Maths + one science, 60 minutes",
        "Section 2: choose 1 of 3 science parts, 20 MCQs, 60 minutes, no calculator",
      ],
    },
  ],
  sections: [
    {
      name: "Section 1",
      eras: [
        {
          years: "2016–2019",
          title: "Five parts · 18 questions each",
          bullets: [
            "Part A - Mathematics",
            "Part B - Physics",
            "Part C - Chemistry",
            "Part D - Biology",
            "Part E - Advanced Mathematics and Advanced Physics",
            "Sit Part A plus any two others · 80 minutes · no calculator",
          ],
        },
        {
          years: "2020–2023",
          title: "Four parts · 20 questions each",
          highlight: "Part E removed",
          bullets: [
            "Part A - Mathematics",
            "Part B - Physics",
            "Part C - Chemistry",
            "Part D - Biology",
            "Sit Part A plus one science · 60 minutes · no calculator",
          ],
        },
      ],
    },
    {
      name: "Section 2",
      eras: [
        {
          years: "2016–2019",
          title: "Long written questions",
          bullets: [
            "Six questions: two Physics, two Chemistry, two Biology",
            "Answer any two · 40 minutes",
            "Working marked · calculator allowed",
            "Not ESAT-shaped",
          ],
        },
        {
          years: "2020–2023",
          title: "Harder multiple choice",
          bullets: [
            "Part X - Physics",
            "Part Y - Chemistry",
            "Part Z - Biology",
            "Answer one part · 20 MCQs · 60 minutes · no calculator",
          ],
        },
      ],
    },
  ],
  footnote:
    "The current UAT-UK ESAT archive publishes NSAA Section 1 (2016–2023). Section 2 is not in that archive.",
};

export const ENGAA_STRUCTURE: ExamStructureBlock = {
  id: "engaa",
  exam: "ENGAA",
  fullName: "Engineering Admissions Assessment",
  accent: "engaa",
  summary:
    "Always two sections. Section 1 mixes maths and physics in every part. Section 2 is advanced Physics only. Timing and length changed in 2019.",
  eras: [
    {
      years: "2016–2018",
      title: "Longer Section 1",
      highlight: "54 MCQs · 80 minutes",
      bullets: [
        "Section 1 Part A: 28 Maths + Physics · Part B: 26 Advanced Maths + Advanced Physics",
        "Section 2: linked Physics MCQs · ~40 minutes · basic calculator allowed",
      ],
    },
    {
      years: "2019–2023",
      title: "Shorter modern shape",
      highlight: "40 MCQs · 60 minutes",
      bullets: [
        "Section 1 Part A: 20 Maths + Physics · Part B: 20 Advanced Maths + Advanced Physics",
        "Section 2: 20 Advanced Physics MCQs · 60 minutes · no calculator",
      ],
    },
  ],
  sections: [
    {
      name: "Section 1",
      eras: [
        {
          years: "2016–2018",
          title: "54 questions · 80 minutes",
          bullets: [
            "Part A - Mathematics and Physics mixed · 28 questions",
            "Part B - Advanced Mathematics and Advanced Physics mixed · 26 questions",
            "Answer all questions · no calculator · no Chemistry or Biology",
          ],
        },
        {
          years: "2019–2023",
          title: "40 questions · 60 minutes",
          bullets: [
            "Part A - Mathematics and Physics mixed · 20 questions",
            "Part B - Advanced Mathematics and Advanced Physics mixed · 20 questions",
            "Answer all questions · no calculator · same two-part layout",
          ],
        },
      ],
    },
    {
      name: "Section 2",
      eras: [
        {
          years: "2016–2018",
          title: "Linked Physics MCQs",
          bullets: [
            "About 20 advanced Physics questions, sometimes dependent on each other",
            "40 minutes · basic non-graphical calculator allowed",
          ],
        },
        {
          years: "2019–2023",
          title: "Standalone Physics MCQs",
          bullets: [
            "20 advanced Physics multiple-choice questions",
            "60 minutes · no calculator",
            "From 2020–2023 this overlaps NSAA Section 2 Part X Physics",
          ],
        },
      ],
    },
  ],
  footnote:
    "The current UAT-UK ESAT archive publishes ENGAA Section 1 only. Section 2 is not included.",
};

export const TMUA_STRUCTURE: ExamStructureBlock = {
  id: "tmua",
  exam: "TMUA",
  fullName: "Test of Mathematics for University Admission",
  accent: "tmua",
  summary:
    "Simpler than NSAA or ENGAA: two maths papers, same shape every year from 2016–2023. No science content.",
  eras: [
    {
      years: "2016–2023",
      title: "Stable format",
      highlight: "2 × 20 MCQs · 75 minutes each",
      bullets: [
        "Paper 1 - Applications of Mathematical Knowledge",
        "Paper 2 - Mathematical Reasoning",
        "No calculator · maths only",
      ],
    },
  ],
  sections: [
    {
      name: "Paper 1",
      eras: [
        {
          years: "2016–2023",
          title: "Applications of Mathematical Knowledge",
          bullets: [
            "20 multiple-choice questions · 75 minutes",
            "Apply familiar maths in unfamiliar settings",
            "Useful extra Mathematics 2 practice · questions usually longer than ESAT",
          ],
        },
      ],
    },
    {
      name: "Paper 2",
      eras: [
        {
          years: "2016–2023",
          title: "Mathematical Reasoning",
          bullets: [
            "20 multiple-choice questions · 75 minutes",
            "More logic / proof-style than ESAT Maths 2",
            "Lower priority once Paper 1 is exhausted",
          ],
        },
      ],
    },
  ],
};
