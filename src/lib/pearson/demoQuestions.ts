/**
 * Sample questions for Pearson shell dev / visual regression.
 * Not tied to Supabase; use /past-papers/pearson-demo in dev.
 */
import type { Question } from "@/types/papers";

export const PEARSON_DEMO_QUESTIONS: Question[] = [
  {
    id: 900001,
    paperId: 32,
    examName: "ESAT",
    examYear: 2023,
    paperName: "Mathematics 1",
    partLetter: "A",
    partName: "Mathematics 1",
    examType: "Official",
    questionNumber: 1,
    questionImage: "",
    questionStem:
      "In a right-angled triangle PQR, the hypotenuse is the side PR.\n\n" +
      "The length of side PQ is 20 cm and the ratio RQ : PQ is 1 : 2\n\n" +
      "What is the length of the perpendicular from the hypotenuse to the point Q ?",
    options: {
      A: "\\(8\\sqrt{5}\\) cm",
      B: "\\(10\\sqrt{2}\\) cm",
      C: "\\(2\\sqrt{5}\\) cm",
      D: "\\(5\\sqrt{2}\\) cm",
      E: "\\(4\\sqrt{5}\\) cm",
    },
    contentFormat: "text",
    answerLetter: "A",
    solutionType: "none",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: 900002,
    paperId: 32,
    examName: "ESAT",
    examYear: 2023,
    paperName: "Mathematics 1",
    partLetter: "A",
    partName: "Mathematics 1",
    examType: "Official",
    questionNumber: 2,
    questionImage: "",
    questionStem:
      "A long stem for scroll testing.\n\n" +
      "Line 1 of filler text about rates and proportions.\n".repeat(8) +
      "\nFinal line at the bottom of the question.",
    options: {
      A: "Option A",
      B: "Option B",
      C: "Option C",
      D: "Option D",
    },
    contentFormat: "text",
    answerLetter: "A",
    solutionType: "none",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: 900003,
    paperId: 32,
    examName: "ESAT",
    examYear: 2023,
    paperName: "Mathematics 1",
    partLetter: "A",
    partName: "Mathematics 1",
    examType: "Official",
    questionNumber: 3,
    questionImage: "",
    questionStem: "Which expression equals \\(\\frac{3}{4} + \\frac{1}{8}\\)?",
    options: {
      A: "\\(\\frac{4}{12}\\)",
      B: "\\(\\frac{7}{8}\\)",
      C: "\\(\\frac{5}{8}\\)",
      D: "\\(\\frac{1}{2}\\)",
    },
    contentFormat: "text",
    answerLetter: "B",
    solutionType: "none",
    createdAt: "",
    updatedAt: "",
  },
];
