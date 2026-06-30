/**
 * Topic definitions for Phase 1
 * Currently includes: Addition and Multiplication
 */

import { Topic, TopicCategory, SubjectId, TopicVariant } from "@/types/core";

export const TOPICS: Record<string, Topic> = {
  // Arithmetic
  addition: {
    id: "addition",
    name: "Addition",
    subjectId: "maths",
    category: "arithmetic",
    description: "Master quick mental addition with proven shortcuts",
    variants: [
      {
        id: "single-digit",
        name: "Single Digit",
        description: "1-digit sums; no zeros; harder pairs more common",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "double-no-carry",
        name: "No Carry",
        description: "2-digit + 2-digit, no carrying",
        difficulty: 2,
        config: { level: 2, allowCarry: false },
      },
      {
        id: "double-with-carry",
        name: "Carry Only",
        description: "2-digit + 2-digit; always needs a ones carry",
        difficulty: 3,
        config: { level: 3, allowCarry: true, carryOnly: true },
      },
      {
        id: "mental-add-5",
        name: "Add 5 / 10 / 15 / 20",
        description: "Two-digit number plus 5, 10, 15, or 20",
        difficulty: 4,
        config: { level: 4, type: "mental", values: [5, 10, 15, 20] },
      },
      {
        id: "three-numbers",
        name: "Three Numbers (Easy)",
        description: "Three addends: single digits or under 20",
        difficulty: 4,
        config: { level: 5, count: 3, maxOperand: 19 },
      },
      {
        id: "three-numbers-hard",
        name: "Three Numbers (Hard)",
        description: "Three two-digit numbers",
        difficulty: 6,
        config: { level: 6, count: 3, digits: 2 },
      },
    ],
    icon: "Plus",
  },
  multiplication: {
    id: "multiplication",
    name: "Multiplication",
    subjectId: "maths",
    category: "arithmetic",
    description: "Lightning-fast multiplication using clever tricks",
    variants: [
      {
        id: "single-digit",
        name: "Single Digit",
        description: "1-digit × 1-digit; no zeros; favours harder facts",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "tables-up-to-12",
        name: "Times Tables",
        description: "Products up to 12 × 12",
        difficulty: 2,
        config: { level: 2 },
      },
      {
        id: "double-single",
        name: "2-Digit × 1-Digit",
        description: "Two-digit number by single digit",
        difficulty: 3,
        config: { level: 3 },
      },
      {
        id: "double-double",
        name: "2-Digit × 2-Digit",
        description: "Smaller two-digit products (under ~50)",
        difficulty: 4,
        config: { level: 4 },
      },
      {
        id: "double-double-hard",
        name: "2-Digit × 2-Digit (Hard)",
        description: "Full two-digit multiplication",
        difficulty: 6,
        config: { level: 5 },
      },
      {
        id: "decimal",
        name: "Decimal × Whole",
        description: "Multiply a decimal by a single digit",
        difficulty: 6,
        config: { level: 6 },
      },
      {
        id: "multiply-5-15-25",
        name: "×5, 15, 25",
        description: "Multiply by 5, 15, or 25",
        difficulty: 4,
        config: { level: 7 },
      },
      {
        id: "multiply-11-12",
        name: "×11 & ×12",
        description: "Multiply two-digit numbers by 11 or 12",
        difficulty: 5,
        config: { level: 8 },
      },
      {
        id: "perfect-cubes",
        name: "Perfect Cubes",
        description: "Calculate cubes of numbers 2–15",
        difficulty: 6,
        config: { level: 9 },
      },
      {
        id: "multiply-9-99",
        name: "×9 & ×99",
        description: "Multiply by 9 or 99",
        difficulty: 6,
        config: { level: 10 },
      },
    ],
    icon: "X",
  },
  fractions: {
    id: "fractions",
    name: "Fractions",
    subjectId: "maths",
    category: "arithmetic",
    description: "Add, multiply and simplify fractions",
    variants: [
      {
        id: "mixed",
        name: "Mixed Fractions",
        description: "Different denominators, multiplication, nested and complex fractions",
        difficulty: 2,
        config: { level: 1 },
      },
    ],
    icon: "Divide",
  },
  subtraction: {
    id: "subtraction",
    name: "Subtraction",
    subjectId: "maths",
    category: "arithmetic",
    description: "Quick subtraction techniques for mental math",
    variants: [
      {
        id: "single-digit",
        name: "Single Digit",
        description: "1-digit differences; no zeros; harder pairs more common",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "double-no-borrow",
        name: "No Borrow",
        description: "2-digit − 2-digit, no borrowing",
        difficulty: 2,
        config: { level: 2 },
      },
      {
        id: "double-with-borrow",
        name: "Borrow Only",
        description: "2-digit − 2-digit; always needs a ones borrow",
        difficulty: 3,
        config: { level: 3 },
      },
      {
        id: "mental-subtract-5",
        name: "Subtract 5 / 10 / 15 / 20",
        description: "Two-digit number minus 5, 10, 15, or 20",
        difficulty: 4,
        config: { level: 4 },
      },
      {
        id: "three-numbers",
        name: "Three Numbers (Easy)",
        description: "Chain subtract: single digits or under 20",
        difficulty: 4,
        config: { level: 5 },
      },
      {
        id: "three-numbers-hard",
        name: "Three Numbers (Hard)",
        description: "Chain subtract with two-digit numbers",
        difficulty: 6,
        config: { level: 6 },
      },
    ],
    icon: "Minus",
  },
  division: {
    id: "division",
    name: "Division",
    subjectId: "maths",
    category: "arithmetic",
    description: "Master division with efficient calculation methods",
    variants: [
      {
        id: "small-divisors",
        name: "Times-Table Division",
        description: "Exact division; divisor 2–9, smaller quotients",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "larger-dividends",
        name: "Larger Dividends",
        description: "Exact division; divisor 2–12, quotients up to ~50",
        difficulty: 2,
        config: { level: 2 },
      },
      {
        id: "two-digit-by-single",
        name: "2-Digit Quotient",
        description: "Exact division with a two-digit answer",
        difficulty: 3,
        config: { level: 3 },
      },
      {
        id: "with-remainders",
        name: "With Remainder",
        description: "Division with remainder (R format)",
        difficulty: 4,
        config: { level: 4 },
      },
      {
        id: "harder-remainders",
        name: "Harder Remainders",
        description: "Larger dividends with remainder",
        difficulty: 5,
        config: { level: 5 },
      },
      {
        id: "long-division",
        name: "3-Digit ÷ 1-Digit",
        description: "Three-digit dividend, single-digit divisor (exact)",
        difficulty: 6,
        config: { level: 6 },
      },
    ],
    icon: "Divide",
  },

  // Algebra
  linearEquations: {
    id: "linearEquations",
    name: "Linear Equations",
    subjectId: "maths",
    category: "algebra",
    description: "Solve linear equations quickly and efficiently",
    variants: [
      {
        id: "core",
        name: "Linear Equations",
        description: "Core equations (one/two-step, brackets, and both-sides)",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "fractions",
        name: "Linear Equations (Fractions)",
        description: "Fractional coefficients and fractions on both sides",
        difficulty: 3,
        config: { level: 2 },
      },
    ],
    icon: "Variable",
  },
  quadraticEquations: {
    id: "quadraticEquations",
    name: "Quadratic Equations",
    subjectId: "maths",
    category: "algebra",
    description: "Master quadratic solving methods",
    variants: [
      {
        id: "factorise",
        name: "Factorising Quadratics",
        description: "Solve by factorising (monic + non-monic mixed)",
        difficulty: 2,
        config: { level: 1 },
      },
      {
        id: "hard",
        name: "Quadratics (Hard)",
        description: "Harder quadratics (formula-friendly set)",
        difficulty: 5,
        config: { level: 2 },
      },
    ],
    icon: "Function",
  },
  polynomials: {
    id: "polynomials",
    name: "Polynomials",
    subjectId: "maths",
    category: "algebra",
    description: "Simplify and expand polynomial expressions",
    variants: [
      {
        id: "expand",
        name: "Expand Brackets",
        description: "Expand single and double brackets",
        difficulty: 2,
        config: { level: 1 },
      },
      {
        id: "factor",
        name: "Factorise (Common Factor)",
        description: "Take out common factors from expressions",
        difficulty: 3,
        config: { level: 2 },
      },
    ],
    icon: "Variable",
  },
  exponents: {
    id: "exponents",
    name: "Indices & Surds",
    subjectId: "maths",
    category: "algebra",
    description: "Index laws and surd notation",
    variants: [
      {
        id: "index-laws",
        name: "Index Laws",
        description: "Same-base rules, products, quotients and fractions (mixed)",
        difficulty: 1,
        config: { level: 1 },
      },
    ],
    icon: "Power",
  },
  surds: {
    id: "surds",
    name: "Surds",
    subjectId: "maths",
    category: "algebra",
    description: "Simplify, manipulate and estimate square roots",
    variants: [
      {
        id: "simplify",
        name: "Simplify Surds",
        description: "Write √n in simplest form (e.g. √12 → 2√3)",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "add-subtract",
        name: "Add & Subtract",
        description: "Simplify sums like √8 + √36",
        difficulty: 2,
        config: { level: 2 },
      },
      {
        id: "multiply",
        name: "Multiply Surds",
        description: "Products such as √2 × √3 or 2√3 × √5",
        difficulty: 2,
        config: { level: 3 },
      },
      {
        id: "estimate",
        name: "Estimate Surds",
        description: "Estimate √2, √3 and multiples (e.g. √6, √12) to 2 d.p.",
        difficulty: 3,
        config: { level: 4 },
      },
    ],
    icon: "Hash",
  },
  systemsOfEquations: {
    id: "systemsOfEquations",
    name: "Systems of Equations",
    subjectId: "maths",
    category: "algebra",
    description: "Solve simultaneous equations",
    variants: [
      {
        id: "simultaneous",
        name: "Simultaneous Equations",
        description: "Two equations in x,y (integers + simple fractions)",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "simultaneous-hard",
        name: "Simultaneous (Hard)",
        description: "Harder coefficients and fractions",
        difficulty: 3,
        config: { level: 2 },
      },
      {
        id: "three-simultaneous",
        name: "Three Simultaneous",
        description: "Three equations in x,y,z (guaranteed unique solution)",
        difficulty: 5,
        config: { level: 4 },
      },
    ],
    icon: "Grid",
  },

  // Geometry
  triangles: {
    id: "triangles",
    name: "Triangle Properties",
    subjectId: "maths",
    category: "geometry",
    description: "Angle relationships and special triangles",
    levels: 4,
    icon: "Triangle",
  },
  circles: {
    id: "circles",
    name: "Circles",
    subjectId: "maths",
    category: "geometry",
    description: "Legacy alias — use Circle Theorems",
    levels: 4,
    icon: "Circle",
  },
  circle_theorems: {
    id: "circle_theorems",
    name: "Circle Theorems",
    subjectId: "maths",
    category: "geometry",
    description: "ESAT circle theorem angle chasing with labelled diagrams",
    variants: [
      {
        id: "recall",
        name: "Recall",
        description: "One theorem, one step — centre, semicircle, segment, tangent, cyclic",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "basic",
        name: "Basic",
        description: "One theorem plus triangle or straight-line angle rules",
        difficulty: 2,
        config: { level: 2 },
      },
      {
        id: "intermediate",
        name: "Intermediate",
        description: "Two connected theorems and combined angle chasing",
        difficulty: 3,
        config: { level: 3 },
      },
      {
        id: "esat",
        name: "ESAT Style",
        description: "Multi-step problems with distracting lines and reflex angles",
        difficulty: 4,
        config: { level: 4 },
      },
    ],
    icon: "Circle",
  },
  pythagorean: {
    id: "pythagorean",
    name: "Pythagorean Theorem",
    subjectId: "maths",
    category: "geometry",
    description: "Quick calculations using the Pythagorean theorem",
    levels: 4,
    icon: "Triangle",
  },
  geometry_2d: {
    id: "geometry_2d",
    name: "2D Shapes",
    subjectId: "maths",
    category: "geometry",
    description: "Area and perimeter with labelled diagrams",
    variants: [
      {
        id: "mixed",
        name: "2D Shapes",
        description: "Circle area, circumference, sector area and trapezium",
        difficulty: 1,
        config: { level: 1 },
      },
    ],
    icon: "Square",
  },
  geometry_3d: {
    id: "geometry_3d",
    name: "3D Shapes",
    subjectId: "maths",
    category: "geometry",
    description: "Volume and surface area with isometric diagrams",
    variants: [
      {
        id: "volume",
        name: "Volume",
        description: "Cuboids, cylinders, pyramids, cones, spheres and hemispheres",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "surface-area",
        name: "Surface Area",
        description: "Cuboids, prisms, cylinders, cones and spheres",
        difficulty: 2,
        config: { level: 2 },
      },
    ],
    icon: "Cube",
  },

  // Number Theory
  prime_factorise: {
    id: "prime_factorise",
    name: "Prime Factorisation",
    subjectId: "maths",
    category: "number_theory",
    description: "Write numbers as a product of prime factors",
    variants: [
      {
        id: "mixed",
        name: "Prime Factorisation",
        description: "Factorise numbers from 12 to 600 as products of primes",
        difficulty: 2,
        config: { level: 1 },
      },
    ],
    icon: "Hash",
  },
  factors: {
    id: "factors",
    name: "GCF & LCM",
    subjectId: "maths",
    category: "number_theory",
    description: "Find greatest common factor and least common multiple",
    variants: [
      {
        id: "gcf-lcm",
        name: "GCF & LCM",
        description: "Find greatest common factor and least common multiple",
        difficulty: 2,
        config: { level: 1 },
      },
    ],
    icon: "Hash",
  },
  divisibility: {
    id: "divisibility",
    name: "Divisibility",
    subjectId: "maths",
    category: "number_theory",
    description: "Remainders, parity, and divisibility rules",
    variants: [
      {
        id: "remainders",
        name: "Remainders",
        description: "Find remainders; occasional add, subtract or multiply",
        difficulty: 2,
        config: { level: 1 },
      },
      {
        id: "parity",
        name: "Parity (Mixed)",
        description: "Is the result even or odd?",
        difficulty: 2,
        config: { level: 2 },
      },
      {
        id: "rules",
        name: "Divisibility Rules",
        description: "Test divisibility by 6, 7, 8, 9, and 11",
        difficulty: 3,
        config: { level: 3 },
      },
    ],
    icon: "Check",
  },
  sequences: {
    id: "sequences",
    name: "Number Sequences",
    subjectId: "maths",
    category: "number_theory",
    description: "Identify patterns in geometric sequences and mixed number patterns",
    variants: [
      {
        id: "geometric",
        name: "Geometric Sequences",
        description: "Find next term or common ratio",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "mixed",
        name: "Mixed Patterns",
        description: "Squares, cubes, Fibonacci-like patterns",
        difficulty: 2,
        config: { level: 2 },
      },
    ],
    icon: "List",
  },

  // Shortcuts
  percentages: {
    id: "percentages",
    name: "Percentage Calculations",
    subjectId: "maths",
    category: "shortcuts",
    description: "Calculate percentages mentally in seconds",
    variants: [
      {
        id: "basic",
        name: "Basic Percentages",
        description: "Calculate 10%, 20%, 25%, 50%, 75% of numbers",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "common",
        name: "Common Percentages",
        description: "Calculate 5%, 12.5%, 15%, 33.33%, 66.67% of numbers",
        difficulty: 2,
        config: { level: 2 },
      },
      {
        id: "increase-decrease",
        name: "Percentage Change",
        description: "Percentage increase/decrease and reverse calculations",
        difficulty: 3,
        config: { level: 3 },
      },
    ],
    icon: "Percent",
  },
  squaring: {
    id: "squaring",
    name: "Squaring",
    subjectId: "maths",
    category: "arithmetic",
    description: "Square numbers quickly using mental shortcuts",
    variants: [
      {
        id: "ending-in-5",
        name: "Numbers Ending in 5",
        description: "Square numbers ending in 5 (15², 25², 35², etc.)",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "perfect-squares",
        name: "Perfect Squares",
        description: "Calculate squares of numbers 2–35",
        difficulty: 2,
        config: { level: 3 },
      },
      {
        id: "two-digit",
        name: "Two-Digit Numbers",
        description: "Square two-digit numbers using algebraic identities",
        difficulty: 3,
        config: { level: 2 },
      },
    ],
    icon: "X",
  },
  // Physics - Mechanics
  kinematics: {
    id: "kinematics",
    name: "Kinematics",
    subjectId: "physics",
    category: "mechanics",
    description: "Motion, velocity, acceleration, and displacement",
    variants: [
      {
        id: "speed-distance-time",
        name: "Speed, Distance, Time",
        description: "Basic speed/distance/time calculations",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "acceleration-velocity",
        name: "Acceleration & Velocity",
        description: "Acceleration and velocity calculations",
        difficulty: 2,
        config: { level: 2 },
      },
      {
        id: "suvat",
        name: "SUVAT Equations",
        description: "Solve problems using SUVAT equations",
        difficulty: 3,
        config: { level: 3 },
      },
    ],
    icon: "Zap",
  },
  forces_motion: {
    id: "forces_motion",
    name: "Forces & Motion",
    subjectId: "physics",
    category: "mechanics",
    description: "Forces, Newton's laws, momentum, and energy",
    variants: [
      {
        id: "newtons-laws",
        name: "Newton's Laws",
        description: "Newton's laws and force calculations",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "momentum-impulse",
        name: "Momentum & Impulse",
        description: "Momentum and impulse calculations",
        difficulty: 2,
        config: { level: 2 },
      },
      {
        id: "energy",
        name: "Kinetic & Potential Energy",
        description: "Kinetic and potential energy calculations",
        difficulty: 3,
        config: { level: 3 },
      },
    ],
    icon: "ArrowRight",
  },
  waves: {
    id: "waves",
    name: "Waves",
    subjectId: "physics",
    category: "mechanics",
    description: "Wave equations and frequency relationships",
    variants: [
      {
        id: "wave-equation",
        name: "Wave Equation",
        description: "Wave equation v = fλ",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "frequency-period",
        name: "Frequency & Period",
        description: "Frequency and period relationships",
        difficulty: 2,
        config: { level: 2 },
      },
    ],
    icon: "Zap",
  },
  unit_conversions: {
    id: "unit_conversions",
    name: "Unit Conversions",
    subjectId: "physics",
    category: "mechanics",
    description: "Convert between metric and physics units",
    variants: [
      {
        id: "metric",
        name: "Metric Conversions",
        description: "Metric conversions (length, mass, time)",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "physics-units",
        name: "Physics Unit Conversions",
        description: "Physics unit conversions (m/s to km/h, etc.)",
        difficulty: 2,
        config: { level: 2 },
      },
    ],
    icon: "ArrowRight",
  },

  // Physics - Electricity
  electricity: {
    id: "electricity",
    name: "Electricity Fundamentals",
    subjectId: "physics",
    category: "electricity",
    description: "Ohm's law, circuits, and electric fields",
    variants: [
      {
        id: "ohms-law",
        name: "Ohm's Law",
        description: "Ohm's law (V = IR) calculations",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "circuits",
        name: "Series & Parallel Circuits",
        description: "Series and parallel circuit calculations",
        difficulty: 2,
        config: { level: 2 },
      },
      {
        id: "electric-fields",
        name: "Electric Fields",
        description: "Electric fields and Coulomb's law",
        difficulty: 3,
        config: { level: 3 },
      },
    ],
    icon: "Zap",
  },

  // (fast arithmetic topics removed; covered by addition/multiplication variants)

  // Powers (fractional exponents in arithmetic Powers & Surds folder)
  powers: {
    id: "powers",
    name: "Fractional Exponents",
    subjectId: "maths",
    category: "transform",
    description: "Simplify powers with fractional exponents in surd form",
    variants: [
      {
        id: "fractional-exponents",
        name: "Fractional Exponents",
        description: "Calculate 2^(n/2) in simplified surd form",
        difficulty: 4,
        config: { level: 4 },
      },
    ],
    icon: "Power",
  },
  power_bases: {
    id: "power_bases",
    name: "Powers of 2, 4, 8",
    subjectId: "maths",
    category: "transform",
    description: "Compute powers of 2, 4, or 8",
    variants: [
      {
        id: "powers-2-4-8",
        name: "Powers of 2, 4, 8",
        description: "Compute powers of 2, 4, or 8 (0–10)",
        difficulty: 3,
        config: { level: 1 },
      },
    ],
    icon: "Power",
  },

  // Transform
  friendly_frac_decimals: {
    id: "friendly_frac_decimals",
    name: "Friendly Fraction ↔ Decimal",
    subjectId: "maths",
    category: "transform",
    description: "Convert between friendly fractions and decimals",
    icon: "Divide",
    variants: [
      {
        id: "level-1",
        name: "Friendly conversions",
        description: "Common fraction ↔ decimal pairs",
        difficulty: 1,
        config: { level: 1 },
      },
    ],
  },
  common_frac_to_dec_2dp: {
    id: "common_frac_to_dec_2dp",
    name: "Fractions and Decimals",
    subjectId: "maths",
    category: "transform",
    description: "Harder fraction ↔ decimal conversions including recurring decimals",
    icon: "Divide",
    variants: [
      {
        id: "level-1",
        name: "2 d.p. Harder Conversions",
        description: "Convert both ways; recurring decimals use overline notation",
        difficulty: 3,
        config: { level: 1 },
      },
    ],
  },
  common_multiples: {
    id: "common_multiples",
    name: "Common Multiples",
    subjectId: "maths",
    category: "arithmetic",
    description: "Multiply common multiples (4, 5, 6, 7, 8, 9, 11) with larger numbers (13, 14, 15, 16, 17, 18)",
    variants: [
      {
        id: "basic",
        name: "Basic Common Multiples",
        description: "Multiply common multiples with larger numbers",
        difficulty: 1,
        config: { level: 1 },
      },
    ],
    icon: "X",
  },
  sci_rewrite: {
    id: "sci_rewrite",
    name: "Scientific Notation",
    subjectId: "maths",
    category: "transform",
    description: "Convert between ordinary numbers and scientific notation",
    variants: [
      {
        id: "mixed",
        name: "Mixed (Both Ways)",
        description: "Ordinary → scientific OR scientific → ordinary (random)",
        difficulty: 1,
        config: { level: 1 },
      },
    ],
    icon: "Power",
  },

  sci_calc: {
    id: "sci_calc",
    name: "Standard Form Arithmetic",
    subjectId: "maths",
    category: "transform",
    description: "Multiply/divide numbers in standard form",
    variants: [
      {
        id: "multiply",
        name: "Multiply",
        description: "Multiply two numbers in scientific notation",
        difficulty: 2,
        config: { level: 1 },
      },
      {
        id: "mix",
        name: "Multiply & Divide",
        description: "Mix of multiplication and division in standard form",
        difficulty: 4,
        config: { level: 2 },
      },
    ],
    icon: "Power",
  },
  units_convert: {
    id: "units_convert",
    name: "Units (SI)",
    subjectId: "physics",
    category: "mechanics",
    description: "Convert between km/h and m/s",
    levels: 1,
    icon: "ArrowRight",
  },
  metric_convert: {
    id: "metric_convert",
    name: "Metric Conversion",
    subjectId: "physics",
    category: "mechanics",
    description: "Convert between metric units (length, mass, time)",
    levels: 1,
    icon: "ArrowRight",
  },

  // Test (empty - moved to number_theory)

  // Identities
  binomial_expand: {
    id: "binomial_expand",
    name: "Binomial Expansion",
    subjectId: "maths",
    category: "identities",
    description: "Expand (x ± a)^n or find coefficients",
    variants: [
      {
        id: "expand",
        name: "Expand",
        description: "Expand (x ± a)² or (x ± a)³",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "coefficients",
        name: "Coefficients",
        description: "Find coefficients in (x ± a)^n for n ≥ 4",
        difficulty: 2,
        config: { level: 2 },
      },
    ],
    icon: "Function",
  },
  factorise_quadratic: {
    id: "factorise_quadratic",
    name: "Factorise Quadratics",
    subjectId: "maths",
    category: "identities",
    description: "Factorise quadratic expressions",
    variants: [
      {
        id: "mixed",
        name: "Factorise (Mixed)",
        description: "Monic and non-monic quadratics (mixed)",
        difficulty: 2,
        config: { level: 1 },
      },
      {
        id: "hard",
        name: "Factorise (Hard)",
        description: "Harder constants and less obvious factor pairs",
        difficulty: 4,
        config: { level: 2 },
      },
    ],
    icon: "Function",
  },
  complete_square: {
    id: "complete_square",
    name: "Complete the Square",
    subjectId: "maths",
    category: "identities",
    description: "Complete the square for quadratic expressions",
    variants: [
      {
        id: "nice-square",
        name: "Nice Squares",
        description: "x² + bx + c where (b/2)² is a neat square",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "general-monic",
        name: "General Monic",
        description: "x² + bx + c with general b and c",
        difficulty: 2,
        config: { level: 2 },
      },
      {
        id: "non-monic",
        name: "Non-monic",
        description: "ax² + bx + c with a ≠ 1",
        difficulty: 3,
        config: { level: 3 },
      },
      {
        id: "vertex-form",
        name: "Vertex Form",
        description: "Convert between expanded and vertex form",
        difficulty: 4,
        config: { level: 4 },
      },
    ],
    icon: "Function",
  },
  inequalities: {
    id: "inequalities",
    name: "Inequalities",
    subjectId: "maths",
    category: "identities",
    description: "Solve linear inequalities",
    variants: [
      {
        id: "single",
        name: "Single Inequalities",
        description: "Single linear inequalities ax + b < c",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "compound",
        name: "Compound",
        description: "Double inequalities and combined conditions",
        difficulty: 2,
        config: { level: 2 },
      },
    ],
    icon: "Minus",
  },
  quadratics_eval: {
    id: "quadratics_eval",
    name: "Quadratic Functions",
    subjectId: "maths",
    category: "identities",
    description: "Evaluate quadratic expressions at given x",
    variants: [
      {
        id: "standard-form",
        name: "Standard Form",
        description: "Evaluate ax² + bx + c at integer x",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "vertex-form",
        name: "Vertex Form",
        description: "Evaluate quadratics given in completed square form",
        difficulty: 2,
        config: { level: 2 },
      },
    ],
    icon: "Function",
  },

  // Trigonometry
  trig_recall: {
    id: "trig_recall",
    name: "Trig Ratios Recall",
    subjectId: "maths",
    category: "trigonometry",
    description: "Recall trigonometric ratios for special angles",
    variants: [
      {
        id: "basic-angles",
        name: "Basic Angles",
        description: "Recall sin, cos, tan for 0°, 30°, 45°, 60°, 90°",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "extended-angles",
        name: "Extended Angles",
        description: "Extended trigonometric ratios for angles 120°, 135°, 150°, 180°, etc.",
        difficulty: 2,
        config: { level: 2 },
      },
      {
        id: "radians",
        name: "Radian Equivalents",
        description: "Trigonometric ratios in radians",
        difficulty: 3,
        config: { level: 3 },
      },
    ],
    icon: "Triangle",
  },
  angle_recall: {
    id: "angle_recall",
    name: "Angle Recall",
    subjectId: "maths",
    category: "trigonometry",
    description: "Legacy alias — use Unit Circle drills instead",
    variants: [
      {
        id: "degrees",
        name: "Degrees",
        difficulty: 1,
        config: { level: 1 },
      },
    ],
    icon: "Triangle",
  },
  unit_circle_degrees: {
    id: "unit_circle_degrees",
    name: "Unit Circle",
    subjectId: "maths",
    category: "trigonometry",
    description: "Angles, coordinates, and positions on the unit circle in degrees",
    variants: [
      {
        id: "degrees",
        name: "Degrees",
        description: "Angles, x/y coordinates, cos/sin values — all in degrees",
        difficulty: 1,
        config: { level: 1 },
      },
    ],
    icon: "Circle",
  },
  unit_circle_radians: {
    id: "unit_circle_radians",
    name: "Unit Circle",
    subjectId: "maths",
    category: "trigonometry",
    description: "Angles, coordinates, and positions on the unit circle in radians",
    variants: [
      {
        id: "radians",
        name: "Radians",
        description: "Angles, x/y coordinates, cos/sin values — radians and exact π form",
        difficulty: 2,
        config: { level: 2 },
      },
    ],
    icon: "Circle",
  },
  trig_inverse: {
    id: "trig_inverse",
    name: "Inverse Trig Functions",
    subjectId: "maths",
    category: "trigonometry",
    description: "Inverse trigonometric functions and special values",
    variants: [
      {
        id: "basic-inverse",
        name: "Basic Inverse Trig",
        description: "Recall inverse trig values for special angles",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "special-angles",
        name: "Inverse Trig with Special Angles",
        description: "Inverse trig functions with special angle values",
        difficulty: 2,
        config: { level: 2 },
      },
    ],
    icon: "Triangle",
  },
  trig_applications: {
    id: "trig_applications",
    name: "Trig Applications",
    subjectId: "maths",
    category: "trigonometry",
    description: "Apply trigonometry to triangles and identities",
    variants: [
      {
        id: "triangle-sides",
        name: "Evaluate from Triangle Sides",
        description: "Compute sin, cos, tan from triangle sides",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "special-triangles",
        name: "Special Triangles",
        description: "30-60-90 and 45-45-90 right triangles",
        difficulty: 2,
        config: { level: 2 },
      },
      {
        id: "identities",
        name: "Trig Identities",
        description: "Trigonometric identities and simplifications",
        difficulty: 3,
        config: { level: 3 },
      },
    ],
    icon: "Triangle",
  },

  // Physics
  speed_basic: {
    id: "speed_basic",
    name: "Speed Equation",
    subjectId: "physics",
    category: "mechanics",
    description: "Speed, distance, and time calculations",
    levels: 1,
    icon: "ArrowRight",
  },
  wave_basic: {
    id: "wave_basic",
    name: "Waves Equation",
    subjectId: "physics",
    category: "mechanics",
    description: "Wave equation: v = fλ",
    levels: 1,
    icon: "Zap",
  },
  ohms_law_basic: {
    id: "ohms_law_basic",
    name: "Ohm's Law",
    subjectId: "physics",
    category: "electricity",
    description: "Ohm's law: V = IR",
    levels: 1,
    icon: "Cpu",
  },
  suvat_solve: {
    id: "suvat_solve",
    name: "SUVAT",
    subjectId: "physics",
    category: "mechanics",
    description: "Solve problems using SUVAT equations",
    levels: 1,
    icon: "ArrowRight",
  },
};

export const CATEGORIES: Record<TopicCategory, string[]> = {
  arithmetic: [
    "addition",
    "subtraction",
    "multiplication",
    "division",
    "fractions",
    "common_multiples",
    "squaring",
  ],
  algebra: [
    "linearEquations",
    "quadraticEquations",
    "polynomials",
    "exponents",
    "surds",
    "systemsOfEquations",
  ],
  geometry: [
    "triangles",
    "circle_theorems",
    "pythagorean",
    "geometry_2d",
    "geometry_3d",
  ],
  number_theory: ["prime_factorise", "factors", "divisibility", "sequences"],
  shortcuts: ["percentages"],
  patterns: [],
  transform: [
    "friendly_frac_decimals",
    "common_frac_to_dec_2dp",
    "sci_rewrite",
    "sci_calc",
    "powers",
    "power_bases",
  ],
  test: [],
  estimation: [],
  identities: [
    "binomial_expand",
    "factorise_quadratic",
    "complete_square",
    "inequalities",
    "quadratics_eval",
  ],
  trigonometry: [
    "trig_recall",
    "trig_inverse",
    "trig_applications",
    "unit_circle_degrees",
    "unit_circle_radians",
  ],
  mechanics: [
    "kinematics",
    "forces_motion",
    "waves",
    "unit_conversions",
  ],
  optics: [],
  electricity: ["electricity"],
  thermodynamics: [],
  atomic_structure: [],
  reactions: [],
  organic: [],
  analytical: [],
  cell_biology: [],
  genetics: [],
  evolution: [],
  ecology: [],
};

/**
 * Create default variants from legacy levels property
 */
function createDefaultVariants(levels: number): TopicVariant[] {
  return Array.from({ length: levels }, (_, i) => ({
    id: `level-${i + 1}`,
    name: `Level ${i + 1}`,
    difficulty: i + 1,
    config: { level: i + 1 },
  }));
}

/**
 * Get a topic with guaranteed variants (converts legacy levels if needed)
 */
export function getTopic(id: string): Topic | undefined {
  const topic = TOPICS[id];
  if (!topic) return undefined;
  
  // If topic has variants, return as-is
  if (topic.variants && topic.variants.length > 0) {
    return topic;
  }
  
  // Convert legacy levels to variants
  if (topic.levels) {
    return {
      ...topic,
      variants: createDefaultVariants(topic.levels),
    };
  }
  
  // If no variants or levels, create a default one
  return {
    ...topic,
    variants: [{
      id: "default",
      name: "Default",
      difficulty: 1,
      config: {},
    }],
  };
}

export function getAllTopics(): Topic[] {
  return Object.values(TOPICS).map(topic => {
    if (topic.variants && topic.variants.length > 0) {
      return topic;
    }
    if (topic.levels) {
      return {
        ...topic,
        variants: createDefaultVariants(topic.levels),
      };
    }
    return {
      ...topic,
      variants: [{
        id: "default",
        name: "Default",
        difficulty: 1,
        config: {},
      }],
    };
  });
}

export function getTopicsByCategory(category: TopicCategory): Topic[] {
  const topicIds = CATEGORIES[category] || [];
  return topicIds.map(id => getTopic(id)!).filter(Boolean);
}


