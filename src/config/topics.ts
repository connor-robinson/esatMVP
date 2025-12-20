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
        description: "1 digit + 1 digit",
        difficulty: 1,
        config: { digits: 1 },
      },
      {
        id: "double-no-carry",
        name: "Double Digit (No Carrying)",
        description: "2 digits + 2 digits, no carrying",
        difficulty: 2,
        config: { digits: 2, allowCarry: false },
      },
      {
        id: "double-with-carry",
        name: "Double Digit (With Carrying)",
        description: "2 digits + 2 digits, with carrying",
        difficulty: 3,
        config: { digits: 2, allowCarry: true },
      },
      {
        id: "mental-add-5",
        name: "Mental Math: Adding 5, 10, 15",
        description: "Quick addition of 5, 10, 15, etc.",
        difficulty: 4,
        config: { type: "mental", values: [5, 10, 15, 20] },
      },
      {
        id: "three-numbers",
        name: "Three Number Addition",
        description: "Add three numbers together",
        difficulty: 5,
        config: { count: 3 },
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
        description: "1 digit × 1 digit",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "tables-up-to-10",
        name: "Multiplication Tables (up to 10)",
        description: "Times tables 1-10",
        difficulty: 2,
        config: { level: 2 },
      },
      {
        id: "double-single",
        name: "2 digits × 1 digit",
        description: "Two digit by single digit",
        difficulty: 3,
        config: { level: 3 },
      },
      {
        id: "double-double",
        name: "2 digits × 2 digits",
        description: "Two digit by two digit",
        difficulty: 4,
        config: { level: 4 },
      },
      {
        id: "decimal",
        name: "Decimal Multiplication",
        description: "Multiply decimals by single digits",
        difficulty: 5,
        config: { level: 5 },
      },
    ],
    icon: "X",
  },
  fractions: {
    id: "fractions",
    name: "Fractions",
    subjectId: "maths",
    category: "arithmetic",
    description: "Practice fraction addition and multiplication",
    variants: [
      {
        id: "same-denominator",
        name: "Same Denominator",
        description: "Add fractions with the same denominator",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "different-denominators",
        name: "Different Denominators",
        description: "Add fractions with different denominators",
        difficulty: 2,
        config: { level: 2 },
      },
      {
        id: "multiplication",
        name: "Fraction Multiplication",
        description: "Multiply fractions",
        difficulty: 3,
        config: { level: 3 },
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
        description: "Single digit subtraction",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "two-digit-no-borrow",
        name: "Two Digit - Single (No Borrowing)",
        description: "Two digit minus single digit, no borrowing",
        difficulty: 2,
        config: { level: 2 },
      },
      {
        id: "two-digit-with-borrow",
        name: "Two Digit - Single (With Borrowing)",
        description: "Two digit minus single digit, with borrowing",
        difficulty: 3,
        config: { level: 3 },
      },
      {
        id: "two-digit-two-digit",
        name: "Two Digit - Two Digit",
        description: "Two digit minus two digit",
        difficulty: 4,
        config: { level: 4 },
      },
      {
        id: "three-digit",
        name: "Three Digit Subtraction",
        description: "Three digit subtraction",
        difficulty: 5,
        config: { level: 5 },
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
        name: "Small Divisors",
        description: "Single digit divisors (2-9), small dividends",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "larger-dividends",
        name: "Larger Dividends",
        description: "Single digit divisors (2-12), larger dividends",
        difficulty: 2,
        config: { level: 2 },
      },
      {
        id: "two-digit-by-single",
        name: "Two Digit ÷ Single Digit",
        description: "Two digit divided by single digit (exact)",
        difficulty: 3,
        config: { level: 3 },
      },
      {
        id: "with-remainders",
        name: "Division with Remainders",
        description: "Division problems with remainders",
        difficulty: 4,
        config: { level: 4 },
      },
      {
        id: "long-division",
        name: "Long Division Basics",
        description: "Three digit divided by single digit",
        difficulty: 5,
        config: { level: 5 },
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
        id: "one-two-step",
        name: "One & Two Step",
        description: "ax + b = c and kx = m with small integers",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "brackets-and-negatives",
        name: "Brackets & Negatives",
        description: "Equations with a single bracket and negatives",
        difficulty: 2,
        config: { level: 2 },
      },
      {
        id: "fractions-both-sides",
        name: "Fractions on Both Sides",
        description: "Linear equations with fractional coefficients",
        difficulty: 3,
        config: { level: 3 },
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
        id: "factorise-monic",
        name: "Factorise (Monic)",
        description: "x² + bx + c = 0 with integer roots",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "factorise-non-monic",
        name: "Factorise (Non-Monic)",
        description: "ax² + bx + c = 0 with a ≠ 1",
        difficulty: 2,
        config: { level: 2 },
      },
      {
        id: "formula-perfect-square",
        name: "Formula / Square",
        description: "Quadratics suitable for formula or completing the square",
        difficulty: 3,
        config: { level: 3 },
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
        id: "simplify-like-terms",
        name: "Simplify Like Terms",
        description: "Collect like terms in linear or quadratic expressions",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "expand-brackets",
        name: "Expand Brackets",
        description: "Expand single and double brackets",
        difficulty: 2,
        config: { level: 2 },
      },
      {
        id: "factor-common",
        name: "Factorise Common Factor",
        description: "Take out common factors from polynomials",
        difficulty: 3,
        config: { level: 3 },
      },
    ],
    icon: "Variable",
  },
  exponents: {
    id: "exponents",
    name: "Exponents & Radicals",
    subjectId: "maths",
    category: "algebra",
    description: "Work with powers and roots efficiently",
    variants: [
      {
        id: "index-laws-basic",
        name: "Index Laws (Basic)",
        description: "Same-base multiplication, division and powers",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "index-laws-fractions",
        name: "Index Laws (Fractions)",
        description: "Indices in numerator and denominator",
        difficulty: 2,
        config: { level: 2 },
      },
      {
        id: "indices-and-surds",
        name: "Indices & Surds",
        description: "Rewrite between surds and fractional indices",
        difficulty: 3,
        config: { level: 3 },
      },
    ],
    icon: "Power",
  },
  systemsOfEquations: {
    id: "systemsOfEquations",
    name: "Systems of Equations",
    subjectId: "maths",
    category: "algebra",
    description: "Solve simultaneous equations",
    variants: [
      {
        id: "integer-solutions",
        name: "Integer Solutions",
        description: "Two linear equations with neat integer solutions",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "mixed-coefficients",
        name: "Mixed Coefficients",
        description: "Simultaneous equations with slightly messier coefficients",
        difficulty: 2,
        config: { level: 2 },
      },
      {
        id: "fractional-coefficients",
        name: "Fractional Coefficients",
        description: "Simultaneous equations with fractional coefficients",
        difficulty: 3,
        config: { level: 3 },
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
    description: "Circumference, area, and arc calculations",
    levels: 4,
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
  area: {
    id: "area",
    name: "Area & Perimeter",
    subjectId: "maths",
    category: "geometry",
    description: "Calculate areas and perimeters of various shapes",
    levels: 3,
    icon: "Square",
  },
  volume: {
    id: "volume",
    name: "Volume & Surface Area",
    subjectId: "maths",
    category: "geometry",
    description: "3D shape measurements and calculations",
    levels: 5,
    icon: "Cube",
  },

  // Number Theory
  primes: {
    id: "primes",
    name: "Prime Numbers",
    subjectId: "maths",
    category: "number_theory",
    description: "Identify and work with prime numbers",
    variants: [
      {
        id: "identify",
        name: "Identify Primes",
        description: "Determine if a number is prime (2-100)",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "prime-pairs",
        name: "Prime Pairs",
        description: "Identify twin primes and prime patterns",
        difficulty: 2,
        config: { level: 2 },
      },
    ],
    icon: "Hash",
  },
  prime_factorise: {
    id: "prime_factorise",
    name: "Prime Factorisation",
    subjectId: "maths",
    category: "number_theory",
    description: "Prime factorise numbers efficiently",
    variants: [
      {
        id: "small",
        name: "Small Numbers",
        description: "Prime factorise numbers 2-100",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "medium",
        name: "Medium Numbers",
        description: "Prime factorise numbers 100-600",
        difficulty: 2,
        config: { level: 2 },
      },
    ],
    icon: "Hash",
  },
  factors: {
    id: "factors",
    name: "Factors & Multiples",
    subjectId: "maths",
    category: "number_theory",
    description: "Find factors, factor pairs, GCF and LCM",
    variants: [
      {
        id: "find-factors",
        name: "Find All Factors",
        description: "List all factors of a number (2-50)",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "factor-pairs",
        name: "Factor Pairs",
        description: "Find two numbers whose product equals a given number",
        difficulty: 2,
        config: { level: 2 },
      },
      {
        id: "gcf-lcm",
        name: "GCF & LCM",
        description: "Find greatest common factor and least common multiple",
        difficulty: 3,
        config: { level: 3 },
      },
    ],
    icon: "Hash",
  },
  divisibility: {
    id: "divisibility",
    name: "Divisibility Rules",
    subjectId: "maths",
    category: "number_theory",
    description: "Quick divisibility tests and tricks",
    variants: [
      {
        id: "easy",
        name: "Rules for 2, 3, 4, 5",
        description: "Test divisibility by 2, 3, 4, and 5",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "medium",
        name: "Rules for 6, 8, 9",
        description: "Test divisibility by 6, 8, and 9",
        difficulty: 2,
        config: { level: 2 },
      },
      {
        id: "rule-7",
        name: "Rule for 7",
        description: "Test divisibility by 7 using the doubling method",
        difficulty: 3,
        config: { level: 3 },
      },
      {
        id: "rule-11",
        name: "Rule for 11",
        description: "Test divisibility by 11 using alternating sum",
        difficulty: 4,
        config: { level: 4 },
      },
    ],
    icon: "Check",
  },
  modular: {
    id: "modular",
    name: "Modular Arithmetic",
    subjectId: "maths",
    category: "number_theory",
    description: "Work with remainders and modulo operations",
    variants: [
      {
        id: "basic",
        name: "Basic Remainders",
        description: "Calculate a mod b for small numbers",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "addition-subtraction",
        name: "Modular Addition/Subtraction",
        description: "Perform addition and subtraction modulo n",
        difficulty: 2,
        config: { level: 2 },
      },
      {
        id: "multiplication",
        name: "Modular Multiplication",
        description: "Perform multiplication modulo n",
        difficulty: 3,
        config: { level: 3 },
      },
    ],
    icon: "Percent",
  },
  sequences: {
    id: "sequences",
    name: "Number Sequences",
    subjectId: "maths",
    category: "number_theory",
    description: "Identify patterns in arithmetic and geometric sequences",
    variants: [
      {
        id: "arithmetic",
        name: "Arithmetic Sequences",
        description: "Find next term or common difference",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "geometric",
        name: "Geometric Sequences",
        description: "Find next term or common ratio",
        difficulty: 2,
        config: { level: 2 },
      },
      {
        id: "mixed",
        name: "Mixed Patterns",
        description: "Squares, cubes, Fibonacci-like patterns",
        difficulty: 3,
        config: { level: 3 },
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
    name: "Squaring Shortcuts",
    subjectId: "maths",
    category: "shortcuts",
    description: "Square numbers quickly using shortcuts",
    variants: [
      {
        id: "ending-in-5",
        name: "Numbers Ending in 5",
        description: "Square numbers ending in 5 (15², 25², 35², etc.)",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "near-round",
        name: "Near Round Numbers",
        description: "Square numbers near round numbers (19², 21², 29², 31²)",
        difficulty: 2,
        config: { level: 2 },
      },
      {
        id: "two-digit",
        name: "Two-Digit Numbers",
        description: "Square two-digit numbers using algebraic identities",
        difficulty: 3,
        config: { level: 3 },
      },
    ],
    icon: "X",
  },
  estimation: {
    id: "estimation",
    name: "Estimation Techniques",
    subjectId: "maths",
    category: "shortcuts",
    description: "Quick approximation methods for any calculation",
    variants: [
      {
        id: "rounding",
        name: "Rounding & Estimation",
        description: "Round to nearest 10/100 and estimate calculations",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "roots-percentages",
        name: "Estimate Roots & Percentages",
        description: "Estimate square roots and percentages",
        difficulty: 2,
        config: { level: 2 },
      },
    ],
    icon: "TrendUp",
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

  // Patterns
  powers: {
    id: "powers",
    name: "Powers & Roots",
    subjectId: "maths",
    category: "patterns",
    description: "Calculate perfect squares, cubes, and powers",
    variants: [
      {
        id: "squares",
        name: "Perfect Squares",
        description: "Calculate squares of numbers 2-35",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "cubes",
        name: "Perfect Cubes",
        description: "Calculate cubes of numbers 2-15",
        difficulty: 2,
        config: { level: 2 },
      },
      {
        id: "powers-2-4-8",
        name: "Powers of 2, 4, 8",
        description: "Compute powers of 2, 4, or 8 (0-10)",
        difficulty: 3,
        config: { level: 3 },
      },
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
  multiplication_shortcuts: {
    id: "multiplication_shortcuts",
    name: "Multiplication Shortcuts",
    subjectId: "maths",
    category: "patterns",
    description: "Quick multiplication tricks for common numbers",
    variants: [
      {
        id: "multiply-5-15-25",
        name: "Multiply by 5, 15, 25",
        description: "Use shortcuts to multiply by 5, 15, or 25",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "multiply-11-12",
        name: "Multiply by 11, 12",
        description: "Use tricks to multiply by 11 or 12",
        difficulty: 2,
        config: { level: 2 },
      },
      {
        id: "multiply-9-99",
        name: "Multiply by 9, 99",
        description: "Use tricks to multiply by 9 or 99",
        difficulty: 3,
        config: { level: 3 },
      },
    ],
    icon: "X",
  },

  // Transform
  friendly_frac_decimals: {
    id: "friendly_frac_decimals",
    name: "Friendly Fraction ↔ Decimal",
    subjectId: "maths",
    category: "transform",
    description: "Convert between friendly fractions and decimals",
    levels: 1,
    icon: "Divide",
  },
  common_frac_to_dec_2dp: {
    id: "common_frac_to_dec_2dp",
    name: "Fractions and Decimals",
    subjectId: "maths",
    category: "transform",
    description: "Convert fractions to decimals (2 d.p.) or vice versa",
    levels: 1,
    icon: "Divide",
  },
  simplify_fraction: {
    id: "simplify_fraction",
    name: "Simplifying Fractions",
    subjectId: "maths",
    category: "arithmetic",
    description: "Simplify complex fractions including nested fractions like (a/b)/c or (a)/(b/c)",
    variants: [
      {
        id: "nested-fractions",
        name: "Nested Fractions",
        description: "Simplify nested fractions like (a/b)/c or (a)/(b/c)",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "complex-expressions",
        name: "Complex Expressions",
        description: "Simplify fractions with addition in numerator or denominator",
        difficulty: 2,
        config: { level: 2 },
      },
      {
        id: "sum-of-fractions",
        name: "Sum of Fractions",
        description: "Simplify expressions involving sums of fractions",
        difficulty: 3,
        config: { level: 3 },
      },
    ],
    icon: "Divide",
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
    description: "Rewrite numbers in scientific notation form",
    levels: 1,
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

  // Estimation
  estimate_common_sqrts: {
    id: "estimate_common_sqrts",
    name: "Estimate Surds",
    subjectId: "maths",
    category: "estimation",
    description: "Estimate square roots of non-perfect squares to 2 d.p.",
    levels: 1,
    icon: "TrendUp",
  },

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
        id: "monic",
        name: "Monic",
        description: "x² + bx + c with integer roots",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "non-monic",
        name: "Non-monic",
        description: "ax² + bx + c with a ≠ 1",
        difficulty: 2,
        config: { level: 2 },
      },
      {
        id: "harder-c",
        name: "Harder c",
        description: "Factorise quadratics with larger constant terms",
        difficulty: 3,
        config: { level: 3 },
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
  indices_simplify: {
    id: "indices_simplify",
    name: "Simplify Indices",
    subjectId: "maths",
    category: "identities",
    description: "Simplify expressions with powers of a common base",
    variants: [
      {
        id: "same-base",
        name: "Same Base Laws",
        description: "Use index laws on a single base",
        difficulty: 1,
        config: { level: 1 },
      },
      {
        id: "products-quotients",
        name: "Products & Quotients",
        description: "Multiple factors and fractions with indices",
        difficulty: 2,
        config: { level: 2 },
      },
    ],
    icon: "Power",
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
  sphere_volume: {
    id: "sphere_volume",
    name: "Sphere Volume",
    subjectId: "maths",
    category: "geometry",
    description: "Calculate volume of sphere",
    levels: 1,
    icon: "Circle",
  },
  sphere_area: {
    id: "sphere_area",
    name: "Sphere Surface Area",
    subjectId: "maths",
    category: "geometry",
    description: "Calculate surface area of sphere",
    levels: 1,
    icon: "Circle",
  },
  cylinder_sa: {
    id: "cylinder_sa",
    name: "Cylinder Surface Area",
    subjectId: "maths",
    category: "geometry",
    description: "Calculate surface area of closed cylinder",
    levels: 1,
    icon: "Cube",
  },
  cone_sa: {
    id: "cone_sa",
    name: "Cone Surface Area",
    subjectId: "maths",
    category: "geometry",
    description: "Calculate surface area of cone",
    levels: 1,
    icon: "Triangle",
  },
  square_pyramid_sa: {
    id: "square_pyramid_sa",
    name: "Square Pyramid Surface Area",
    subjectId: "maths",
    category: "geometry",
    description: "Calculate surface area of square pyramid",
    levels: 1,
    icon: "Square",
  },
};

export const CATEGORIES: Record<TopicCategory, string[]> = {
  arithmetic: [
    "addition",
    "subtraction",
    "multiplication",
    "division",
    "fractions",
    "simplify_fraction",
    "common_multiples",
  ],
  algebra: [
    "linearEquations",
    "quadraticEquations",
    "polynomials",
    "exponents",
    "systemsOfEquations",
  ],
  geometry: [
    "triangles",
    "circles",
    "pythagorean",
    "area",
    "volume",
    "sphere_volume",
    "sphere_area",
    "cylinder_sa",
    "cone_sa",
    "square_pyramid_sa",
  ],
  number_theory: ["primes", "prime_factorise", "factors", "divisibility", "modular", "sequences"],
  shortcuts: ["percentages", "squaring", "estimation"],
  patterns: [
    "powers",
    "multiplication_shortcuts",
  ],
  transform: [
    "friendly_frac_decimals",
    "common_frac_to_dec_2dp",
    "sci_rewrite",
  ],
  test: [],
  estimation: ["estimate_common_sqrts"],
  identities: [
    "binomial_expand",
    "factorise_quadratic",
    "complete_square",
    "inequalities",
    "indices_simplify",
    "quadratics_eval",
  ],
  trigonometry: [
    "trig_recall",
    "trig_inverse",
    "trig_applications",
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


