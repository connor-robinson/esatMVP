import { createLesson, concept, tip, example, staticDiagram, interactiveDiagram } from "./dsl";
import type { Lesson } from "@/types/core";

export const KINEMATICS_LESSONS: Lesson[] = [
  createLesson({
    topic: "kinematics",
    id: "kinematics-1-1",
    level: 1,
    lessonNumber: 1,
    title: "Distance & Speed Basics",
    tutorial: [
      concept("Speed = Distance ÷ Time. Memorize the triangle: D = S × T."),
      staticDiagram("speed-triangle"),
      example({
        items: [
          { q: "120 km in 2 h → speed?", a: "60 km/h", exp: "120 ÷ 2 = 60 km/h" },
          { q: "240 km in 3 h → speed?", a: "80 km/h", exp: "240 ÷ 3 = 80 km/h" },
        ],
        content: "Practice these:",
      }),
      tip("Convert between m/s and km/h: 1 m/s = 3.6 km/h"),
    ],
    drill: {
      questionCount: 15,
      timeLimit: 4,
      answerFormat: "numeric",
      unitPolicy: { required: true, allowed: ["km/h", "m/s"], display: "km/h or m/s" },
      questionTypes: ["basic-speed", "distance-from-speed-time", "time-from-distance-speed"],
      generatorWeights: { "basic-speed": 0.6, "distance-from-speed-time": 0.25, "time-from-distance-speed": 0.15 },
    },
  }),

  createLesson({
    topic: "kinematics",
    id: "kinematics-2-1",
    level: 2,
    lessonNumber: 1,
    title: "Understanding Velocity",
    tutorial: [
      concept("Velocity includes direction; average velocity = displacement ÷ time."),
      interactiveDiagram("velocity-slider"),
      example({
        items: [
          { q: "40 m east in 20 s → 2 m/s east?", a: "2 m/s", exp: "40 ÷ 20 = 2 m/s" },
        ],
      }),
      tip("Use displacement, not total path length, for average velocity."),
    ],
    drill: {
      questionCount: 15,
      timeLimit: 5,
      answerFormat: "numeric",
      unitPolicy: { required: true, allowed: ["m/s"], display: "m/s" },
      questionTypes: ["average-velocity", "basic-speed"],
      generatorWeights: { "average-velocity": 0.7, "basic-speed": 0.3 },
    },
  }),

  createLesson({
    topic: "kinematics",
    id: "kinematics-3-1",
    level: 3,
    lessonNumber: 1,
    title: "Acceleration Fundamentals",
    tutorial: [
      concept("a = (v - u)/t, negative acceleration indicates slowing down."),
      staticDiagram("acceleration-numberline"),
      example({
        items: [
          { q: "0→30 m/s in 6 s", a: "5 m/s^2", exp: "(30-0)/6 = 5" },
          { q: "50→20 m/s in 10 s", a: "-3 m/s^2", exp: "(20-50)/10 = -3" },
        ],
      }),
    ],
    drill: {
      questionCount: 15,
      timeLimit: 6,
      answerFormat: "numeric",
      unitPolicy: { required: true, allowed: ["m/s^2"], display: "m/s^2" },
      questionTypes: ["acceleration-basic"],
      generatorWeights: { "acceleration-basic": 1 },
    },
  }),

  createLesson({
    topic: "kinematics",
    id: "kinematics-4-1",
    level: 4,
    lessonNumber: 1,
    title: "SUVAT Equations",
    tutorial: [
      concept("SUVAT describes motion under constant acceleration. Pick the equation with four knowns."),
      example({
        items: [
          { q: "v = u + at: u=10, a=2, t=5", a: "20 m/s", exp: "10 + 2×5 = 20" },
          { q: "s = ut + 1/2 at^2: u=0, a=4, t=3", a: "18 m", exp: "0 + 1/2×4×9 = 18" },
        ],
        content: "Key equations:",
      }),
    ],
    drill: {
      questionCount: 12,
      timeLimit: 8,
      answerFormat: "numeric",
      unitPolicy: { required: true, allowed: ["m", "m/s", "s"], display: "SI" },
      questionTypes: ["suvat-find-one"],
      generatorWeights: { "suvat-find-one": 1 },
    },
  }),
];


