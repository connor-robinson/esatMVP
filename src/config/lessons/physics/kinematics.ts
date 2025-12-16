/**
 * Kinematics lesson configurations
 */

import { Lesson } from "@/types/core";

export const kinematicsLessons: Lesson[] = [
  // Level 1, Lesson 1: Tutorial - Enhanced with visualizations
  {
    id: "kinematics-1-1",
    level: 1,
    lessonNumber: 1,
    title: "Distance & Speed Basics",
    hasTutorial: true,
    tutorial: [
      {
        type: "text",
        content: "Welcome to kinematics! We'll explore how objects move through space and time. Let's start with the fundamental relationship between distance, speed, and time.",
      },
      {
        type: "visualization",
        visualizationId: "speed-triangle",
      },
      {
        type: "text",
        content: "The speed triangle shows us the relationship: **Distance = Speed × Time**. This is the foundation of all motion calculations!",
      },
      {
        type: "tip",
        content: "💡 **Triangle Trick**: Cover the variable you want to find! If you cover Distance, you see Speed × Time. If you cover Speed, you see Distance ÷ Time.",
      },
      {
        type: "example",
        content: "Let's practice with real-world examples:",
        examples: [
          {
            question: "A car travels 120 km in 2 hours. What is its speed?",
            answer: "60 km/h",
            explanation: "Using the triangle: Cover Speed → Speed = Distance ÷ Time = 120 ÷ 2 = 60 km/h",
          },
          {
            question: "How far does a train travel in 3 hours at 80 km/h?",
            answer: "240 km",
            explanation: "Cover Distance → Distance = Speed × Time = 80 × 3 = 240 km",
          },
          {
            question: "A cyclist covers 45 km at 15 km/h. How long did it take?",
            answer: "3 hours",
            explanation: "Cover Time → Time = Distance ÷ Speed = 45 ÷ 15 = 3 hours",
          },
        ],
      },
      {
        type: "text",
        content: "**Key Intuition**: Speed tells us how fast something moves. Higher speed = more distance in the same time, or the same distance in less time.",
      },
      {
        type: "tip",
        content: "🎯 **Common Units**: km/h for cars, m/s for physics problems, mph in the US. Always check your units!",
      },
      {
        type: "example",
        content: "Try these unit conversions:",
        examples: [
          {
            question: "Convert 72 km/h to m/s",
            answer: "20 m/s",
            explanation: "72 km/h = 72,000 m/h = 72,000 ÷ 3600 s = 20 m/s",
          },
          {
            question: "Convert 15 m/s to km/h",
            answer: "54 km/h",
            explanation: "15 m/s = 15 × 3600 m/h = 54,000 m/h = 54 km/h",
          },
        ],
      },
      {
        type: "tip",
        content: "⚡ **Quick Conversion**: To convert m/s to km/h, multiply by 3.6. To convert km/h to m/s, divide by 3.6!",
      },
    ],
    drillConfig: {
      questionCount: 15,
      timeLimit: 4,
      generatorWeights: {
        "basic-speed": 0.6,
        "distance-from-speed-time": 0.3,
        "time-from-distance-speed": 0.1,
      },
      unitPolicy: {
        required: true,
        allowed: ["km/h", "m/s", "h", "km", "m"],
        display: "Include units in your answer",
      },
    },
  },
  // Level 1, Lesson 2: Drill
  {
    id: "kinematics-1-2",
    level: 1,
    lessonNumber: 2,
    title: "Distance & Speed Practice",
    hasTutorial: false,
    drillConfig: {
      questionCount: 20,
      timeLimit: 4,
    },
  },
  // Level 1, Lesson 3: Review
  {
    id: "kinematics-1-3",
    level: 1,
    lessonNumber: 3,
    title: "Distance & Speed Review",
    hasTutorial: false,
    drillConfig: {
      questionCount: 15,
      timeLimit: 3,
    },
  },
  // Level 2, Lesson 1: Tutorial
  {
    id: "kinematics-2-1",
    level: 2,
    lessonNumber: 1,
    title: "Understanding Velocity",
    hasTutorial: true,
    tutorial: [
      {
        type: "text",
        content: "Velocity includes direction! It's a vector quantity. Positive velocity = forward, negative = backward.",
      },
      {
        type: "example",
        content: "Velocity with direction:",
        examples: [
          {
            question: "A car moves 100m east in 20s, then 60m west in 15s. What's the average velocity?",
            answer: "1.14 m/s east",
            explanation: "Net displacement: 100 - 60 = 40m east. Total time: 35s. Velocity = 40/35 ≈ 1.14 m/s east",
          },
          {
            question: "Initial velocity = 10 m/s, final velocity = 25 m/s. What's the change?",
            answer: "15 m/s",
            explanation: "Change in velocity: 25 - 10 = 15 m/s (acceleration!)",
          },
        ],
      },
      {
        type: "tip",
        content: "💡 Average velocity = Total displacement ÷ Total time (NOT total distance!)",
      },
    ],
    drillConfig: {
      questionCount: 15,
      timeLimit: 5,
    },
  },
  // Level 2, Lesson 2: Drill
  {
    id: "kinematics-2-2",
    level: 2,
    lessonNumber: 2,
    title: "Velocity Practice",
    hasTutorial: false,
    drillConfig: {
      questionCount: 20,
      timeLimit: 5,
    },
  },
  // Level 3, Lesson 1: Tutorial
  {
    id: "kinematics-3-1",
    level: 3,
    lessonNumber: 1,
    title: "Acceleration Fundamentals",
    hasTutorial: true,
    tutorial: [
      {
        type: "text",
        content: "Acceleration is the rate of change of velocity: a = (v - u) ÷ t, where u = initial velocity, v = final velocity.",
      },
      {
        type: "example",
        content: "Understanding acceleration:",
        examples: [
          {
            question: "A car accelerates from 0 to 30 m/s in 6 seconds. Find acceleration.",
            answer: "5 m/s²",
            explanation: "a = (v - u) ÷ t = (30 - 0) ÷ 6 = 5 m/s²",
          },
          {
            question: "A train slows from 50 m/s to 20 m/s in 10 seconds. Find acceleration.",
            answer: "-3 m/s²",
            explanation: "a = (20 - 50) ÷ 10 = -3 m/s² (negative = deceleration)",
          },
        ],
      },
      {
        type: "tip",
        content: "💡 Negative acceleration = deceleration (slowing down)",
      },
    ],
    drillConfig: {
      questionCount: 15,
      timeLimit: 6,
    },
  },
  // Level 3, Lesson 2: Drill
  {
    id: "kinematics-3-2",
    level: 3,
    lessonNumber: 2,
    title: "Acceleration Practice",
    hasTutorial: false,
    drillConfig: {
      questionCount: 20,
      timeLimit: 6,
    },
  },
  // Level 4, Lesson 1: Tutorial
  {
    id: "kinematics-4-1",
    level: 4,
    lessonNumber: 1,
    title: "SUVAT Equations",
    hasTutorial: true,
    tutorial: [
      {
        type: "text",
        content: "The five SUVAT equations describe motion with constant acceleration. Master these for exam success!",
      },
      {
        type: "example",
        content: "Key equations:",
        examples: [
          {
            question: "v = u + at: A car starts at 10 m/s, accelerates at 2 m/s² for 5s. Final velocity?",
            answer: "20 m/s",
            explanation: "v = 10 + (2 × 5) = 10 + 10 = 20 m/s",
          },
          {
            question: "s = ut + ½at²: Starting from rest, acceleration 4 m/s² for 3s. Distance?",
            answer: "18 m",
            explanation: "s = 0 + ½(4)(3²) = 2 × 9 = 18 m",
          },
        ],
      },
      {
        type: "tip",
        content: "💡 List your knowns (s, u, v, a, t) and pick the equation with 4 of those 5!",
      },
    ],
    drillConfig: {
      questionCount: 12,
      timeLimit: 8,
    },
  },
  // Level 4, Lesson 2: Drill
  {
    id: "kinematics-4-2",
    level: 4,
    lessonNumber: 2,
    title: "SUVAT Practice",
    hasTutorial: false,
    drillConfig: {
      questionCount: 15,
      timeLimit: 8,
    },
  },
  // Level 4, Lesson 3: Review
  {
    id: "kinematics-4-3",
    level: 4,
    lessonNumber: 3,
    title: "SUVAT Review",
    hasTutorial: false,
    drillConfig: {
      questionCount: 12,
      timeLimit: 7,
    },
  },
];


