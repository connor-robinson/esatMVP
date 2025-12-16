/**
 * Addition lesson configurations
 */

import { Lesson } from "@/types/core";

export const additionLessons: Lesson[] = [
  // Level 1, Lesson 1: Tutorial
  {
    id: "addition-1-1",
    level: 1,
    lessonNumber: 1,
    title: "Single Digit Basics",
    hasTutorial: true,
    tutorial: [
      {
        type: "text",
        content: "Let's start with the fundamentals: adding single-digit numbers (0-9). Speed comes from instant recognition, not counting!",
      },
      {
        type: "example",
        content: "Practice these until they're instant:",
        examples: [
          {
            question: "7 + 8",
            answer: "15",
            explanation: "Think: 7 + 7 = 14, plus one more = 15",
          },
          {
            question: "6 + 9",
            answer: "15",
            explanation: "Round to 10: 6 + 10 = 16, minus 1 = 15",
          },
        ],
      },
      {
        type: "tip",
        content: "💡 When adding 8 or 9, round to 10 and adjust. It's faster than counting!",
      },
    ],
    drillConfig: {
      questionCount: 15,
      timeLimit: 3,
    },
  },
  // Level 1, Lesson 2: Drill
  {
    id: "addition-1-2",
    level: 1,
    lessonNumber: 2,
    title: "Single Digit Practice",
    hasTutorial: false,
    drillConfig: {
      questionCount: 20,
      timeLimit: 3,
    },
  },
  // Level 1, Lesson 3: Review
  {
    id: "addition-1-3",
    level: 1,
    lessonNumber: 3,
    title: "Single Digit Review",
    hasTutorial: false,
    drillConfig: {
      questionCount: 15,
      timeLimit: 2,
    },
  },
  // Level 2, Lesson 4: Tutorial
  {
    id: "addition-2-1",
    level: 2,
    lessonNumber: 1,
    title: "Two Digit Introduction",
    hasTutorial: true,
    tutorial: [
      {
        type: "text",
        content: "Two-digit addition is about breaking numbers into tens and ones, then combining smartly.",
      },
      {
        type: "example",
        content: "The mental method:",
        examples: [
          {
            question: "47 + 28",
            answer: "75",
            explanation: "Add tens: 40 + 20 = 60. Add ones: 7 + 8 = 15. Combine: 60 + 15 = 75",
          },
          {
            question: "56 + 37",
            answer: "93",
            explanation: "Round 37 to 40: 56 + 40 = 96, then subtract 3 = 93",
          },
        ],
      },
      {
        type: "tip",
        content: "💡 If one number is close to a round number (like 28 → 30), round it first!",
      },
    ],
    drillConfig: {
      questionCount: 15,
      timeLimit: 5,
    },
  },
  // Level 2, Lesson 5: Drill
  {
    id: "addition-2-2",
    level: 2,
    lessonNumber: 2,
    title: "Two Digit Practice",
    hasTutorial: false,
    drillConfig: {
      questionCount: 20,
      timeLimit: 5,
    },
  },
  // Level 3, Lesson 7: Tutorial
  {
    id: "addition-3-1",
    level: 3,
    lessonNumber: 1,
    title: "Three Digit Mastery",
    hasTutorial: true,
    tutorial: [
      {
        type: "text",
        content: "Three-digit addition builds on what you know. Break it into hundreds, tens, and ones!",
      },
      {
        type: "example",
        content: "Step by step:",
        examples: [
          {
            question: "247 + 186",
            answer: "433",
            explanation: "Hundreds: 200 + 100 = 300. Tens: 40 + 80 = 120. Ones: 7 + 6 = 13. Total: 300 + 120 + 13 = 433",
          },
        ],
      },
      {
        type: "tip",
        content: "💡 Work left to right for bigger numbers - it's more natural!",
      },
    ],
    drillConfig: {
      questionCount: 12,
      timeLimit: 8,
    },
  },
  // Level 3, Lesson 8: Drill
  {
    id: "addition-3-2",
    level: 3,
    lessonNumber: 2,
    title: "Three Digit Practice",
    hasTutorial: false,
    drillConfig: {
      questionCount: 15,
      timeLimit: 8,
    },
  },
  // Level 3, Lesson 9: Review
  {
    id: "addition-3-3",
    level: 3,
    lessonNumber: 3,
    title: "Three Digit Review",
    hasTutorial: false,
    drillConfig: {
      questionCount: 12,
      timeLimit: 6,
    },
  },
  // Level 4, Lesson 10: Tutorial
  {
    id: "addition-4-1",
    level: 4,
    lessonNumber: 1,
    title: "Numbers Ending in 5",
    hasTutorial: true,
    tutorial: [
      {
        type: "text",
        content: "Numbers ending in 5 have a beautiful pattern that makes mental math easier!",
      },
      {
        type: "example",
        content: "The trick:",
        examples: [
          {
            question: "35 + 45",
            answer: "80",
            explanation: "Add the tens: 30 + 40 = 70. Both end in 5: 5 + 5 = 10. Total: 70 + 10 = 80",
          },
          {
            question: "65 + 75",
            answer: "140",
            explanation: "Tens: 60 + 70 = 130. Ones: 5 + 5 = 10. Total: 130 + 10 = 140",
          },
        ],
      },
      {
        type: "tip",
        content: "💡 When both numbers end in 5, the result always ends in 0. Add the tens, then add 10!",
      },
    ],
    drillConfig: {
      questionCount: 12,
      timeLimit: 6,
      generatorWeights: {
        ending5: 1.0,
      },
    },
  },
  // Level 4, Lesson 11: Drill
  {
    id: "addition-4-2",
    level: 4,
    lessonNumber: 2,
    title: "Ending in 5 Practice",
    hasTutorial: false,
    drillConfig: {
      questionCount: 15,
      timeLimit: 6,
      generatorWeights: {
        ending5: 1.0,
      },
    },
  },
  // Level 4, Lesson 12: Review
  {
    id: "addition-4-3",
    level: 4,
    lessonNumber: 3,
    title: "Ending in 5 Review",
    hasTutorial: false,
    drillConfig: {
      questionCount: 10,
      timeLimit: 5,
      generatorWeights: {
        ending5: 1.0,
      },
    },
  },
  // Level 4, Lesson 4: Advanced Practice
  {
    id: "addition-4-4",
    level: 4,
    lessonNumber: 4,
    title: "Advanced Practice",
    hasTutorial: false,
    drillConfig: {
      questionCount: 20,
      timeLimit: 7,
      generatorWeights: {
        ending5: 0.7,
        twoDigit: 0.3,
      },
    },
  },
  // Level 5, Lesson 13: Tutorial
  {
    id: "addition-5-1",
    level: 5,
    lessonNumber: 1,
    title: "Mental Math Shortcuts",
    hasTutorial: true,
    tutorial: [
      {
        type: "text",
        content: "Master these shortcuts to add like a calculator!",
      },
      {
        type: "example",
        content: "Advanced techniques:",
        examples: [
          {
            question: "47 + 98",
            answer: "145",
            explanation: "Round 98 to 100: 47 + 100 = 147, then subtract 2 = 145",
          },
          {
            question: "156 + 44",
            answer: "200",
            explanation: "Notice 156 + 44 = 200 (44 is the complement to make 200)",
          },
        ],
      },
      {
        type: "tip",
        content: "💡 Look for numbers that combine to round numbers (like 56 + 44 = 100). Add them first!",
      },
    ],
    drillConfig: {
      questionCount: 15,
      timeLimit: 10,
    },
  },
  // Level 5, Lesson 14: Drill
  {
    id: "addition-5-2",
    level: 5,
    lessonNumber: 2,
    title: "Advanced Practice",
    hasTutorial: false,
    drillConfig: {
      questionCount: 20,
      timeLimit: 10,
    },
  },
  // Level 5, Lesson 15: Final Test
  {
    id: "addition-5-3",
    level: 5,
    lessonNumber: 3,
    title: "Master Test",
    hasTutorial: false,
    drillConfig: {
      questionCount: 25,
      timeLimit: 12,
    },
  },
];




