/**
 * Multiplication lesson configurations
 */

import { Lesson } from "@/types/core";

export const multiplicationLessons: Lesson[] = [
  {
    id: "multiplication-1-1",
    level: 1,
    lessonNumber: 1,
    title: "Multiply by 9 - Finger Trick",
    hasTutorial: true,
    tutorial: [
      {
        type: "text",
        content: "The 9 times table has an amazing pattern! Here's the finger trick and the pattern to recognize.",
      },
      {
        type: "example",
        content: "Notice the pattern:",
        examples: [
          {
            question: "9 × 3",
            answer: "27",
            explanation: "Digits sum to 9: 2 + 7 = 9. First digit is always one less: 3 - 1 = 2",
          },
          {
            question: "9 × 7",
            answer: "63",
            explanation: "7 - 1 = 6 (first digit), and 6 + 3 = 9",
          },
          {
            question: "9 × 4",
            answer: "36",
            explanation: "4 - 1 = 3 (first digit), 3 + 6 = 9",
          },
        ],
      },
      {
        type: "tip",
        content: "💡 Quick formula: For 9 × n, first digit is (n-1), second digit is (9 - first digit)",
      },
    ],
    drillConfig: {
      questionCount: 12,
      timeLimit: 6,
      generatorWeights: {
        multiplyBy9: 1.0,
      },
    },
  },
  {
    id: "multiplication-2-1",
    level: 2,
    lessonNumber: 1,
    title: "Multiply by 8",
    hasTutorial: false,
    drillConfig: {
      questionCount: 12,
      timeLimit: 7,
      generatorWeights: {
        multiplyBy8: 1.0,
      },
    },
  },
  {
    id: "multiplication-3-1",
    level: 3,
    lessonNumber: 1,
    title: "Multiply by 11 - Lightning Fast",
    hasTutorial: true,
    tutorial: [
      {
        type: "text",
        content: "Multiplying by 11 is incredibly easy once you know the trick!",
      },
      {
        type: "example",
        content: "Watch this magic:",
        examples: [
          {
            question: "11 × 23",
            answer: "253",
            explanation: "Take the number: 2_3. Fill the middle with 2+3=5 → 253",
          },
          {
            question: "11 × 45",
            answer: "495",
            explanation: "4_5 → middle is 4+5=9 → 495",
          },
          {
            question: "11 × 67",
            answer: "737",
            explanation: "6_7 → middle is 6+7=13 → carry the 1: 7_37 → 737",
          },
        ],
      },
      {
        type: "tip",
        content: "💡 For 11 × AB: Write A, then (A+B), then B. If A+B > 9, carry the 1 to the left.",
      },
    ],
    drillConfig: {
      questionCount: 15,
      timeLimit: 8,
      generatorWeights: {
        multiplyBy11: 1.0,
      },
    },
  },
  {
    id: "multiplication-4-1",
    level: 4,
    lessonNumber: 1,
    title: "Multiply by 5",
    hasTutorial: true,
    tutorial: [
      {
        type: "text",
        content: "Multiplying by 5 is the same as dividing by 2 and multiplying by 10!",
      },
      {
        type: "example",
        content: "Quick method:",
        examples: [
          {
            question: "5 × 16",
            answer: "80",
            explanation: "16 ÷ 2 = 8, then 8 × 10 = 80",
          },
          {
            question: "5 × 24",
            answer: "120",
            explanation: "24 ÷ 2 = 12, then 12 × 10 = 120",
          },
        ],
      },
      {
        type: "tip",
        content: "💡 For even numbers: divide by 2, add a zero. For odd numbers: subtract 1, divide by 2, add a 5 at the end.",
      },
    ],
    drillConfig: {
      questionCount: 12,
      timeLimit: 6,
      generatorWeights: {
        multiplyBy5: 1.0,
      },
    },
  },
  {
    id: "multiplication-5-1",
    level: 5,
    lessonNumber: 1,
    title: "Two Digit × Single Digit",
    hasTutorial: false,
    drillConfig: {
      questionCount: 15,
      timeLimit: 10,
    },
  },
  {
    id: "multiplication-6-1",
    level: 6,
    lessonNumber: 1,
    title: "Mixed Practice",
    hasTutorial: false,
    drillConfig: {
      questionCount: 20,
      timeLimit: 12,
    },
  },
];




