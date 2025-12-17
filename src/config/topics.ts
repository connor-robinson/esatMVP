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
        difficulty: 2,
        config: { type: "mental", values: [5, 10, 15, 20] },
      },
      {
        id: "three-numbers",
        name: "Three Number Addition",
        description: "Add three numbers together",
        difficulty: 4,
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
        config: { digits: 1 },
      },
      {
        id: "tables-up-to-10",
        name: "Multiplication Tables (up to 10)",
        description: "Times tables 1-10",
        difficulty: 2,
        config: { max: 10 },
      },
      {
        id: "double-single",
        name: "2 digits × 1 digit",
        description: "Two digit by single digit",
        difficulty: 3,
        config: { digits: [2, 1] },
      },
      {
        id: "double-double",
        name: "2 digits × 2 digits",
        description: "Two digit by two digit",
        difficulty: 4,
        config: { digits: [2, 2] },
      },
      {
        id: "squares",
        name: "Perfect Squares",
        description: "Squaring numbers",
        difficulty: 3,
        config: { type: "squares" },
      },
      {
        id: "mental-tricks",
        name: "Mental Math Tricks",
        description: "Special multiplication shortcuts",
        difficulty: 5,
        config: { type: "mental" },
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
    levels: 3,
    icon: "Divide",
  },
  subtraction: {
    id: "subtraction",
    name: "Subtraction",
    subjectId: "maths",
    category: "arithmetic",
    description: "Quick subtraction techniques for mental math",
    levels: 4,
    icon: "Minus",
  },
  division: {
    id: "division",
    name: "Division",
    subjectId: "maths",
    category: "arithmetic",
    description: "Master division with efficient calculation methods",
    levels: 5,
    icon: "Divide",
  },

  // Algebra
  linearEquations: {
    id: "linearEquations",
    name: "Linear Equations",
    subjectId: "maths",
    category: "algebra",
    description: "Solve linear equations quickly and efficiently",
    levels: 4,
    icon: "Variable",
  },
  quadraticEquations: {
    id: "quadraticEquations",
    name: "Quadratic Equations",
    subjectId: "maths",
    category: "algebra",
    description: "Master quadratic formula and factoring techniques",
    levels: 5,
    icon: "Function",
  },
  polynomials: {
    id: "polynomials",
    name: "Polynomials",
    subjectId: "maths",
    category: "algebra",
    description: "Simplify and solve polynomial expressions",
    levels: 5,
    icon: "Variable",
  },
  exponents: {
    id: "exponents",
    name: "Exponents & Radicals",
    subjectId: "maths",
    category: "algebra",
    description: "Work with powers and roots efficiently",
    levels: 4,
    icon: "Power",
  },
  systemsOfEquations: {
    id: "systemsOfEquations",
    name: "Systems of Equations",
    subjectId: "maths",
    category: "algebra",
    description: "Solve multiple equations simultaneously",
    levels: 5,
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
    levels: 4,
    icon: "Hash",
  },
  factors: {
    id: "factors",
    name: "Factors & Multiples",
    subjectId: "maths",
    category: "number_theory",
    description: "Find GCF and LCM efficiently",
    levels: 3,
    icon: "Hash",
  },
  divisibility: {
    id: "divisibility",
    name: "Divisibility Rules",
    subjectId: "maths",
    category: "number_theory",
    description: "Quick divisibility tests and tricks",
    levels: 3,
    icon: "Check",
  },
  modular: {
    id: "modular",
    name: "Modular Arithmetic",
    subjectId: "maths",
    category: "number_theory",
    description: "Work with remainders and modulo operations",
    levels: 5,
    icon: "Percent",
  },
  sequences: {
    id: "sequences",
    name: "Number Sequences",
    subjectId: "maths",
    category: "number_theory",
    description: "Identify patterns in arithmetic and geometric sequences",
    levels: 4,
    icon: "List",
  },

  // Shortcuts
  percentages: {
    id: "percentages",
    name: "Percentage Tricks",
    subjectId: "maths",
    category: "shortcuts",
    description: "Calculate percentages mentally in seconds",
    levels: 4,
    icon: "Percent",
  },
  squaring: {
    id: "squaring",
    name: "Squaring Numbers",
    subjectId: "maths",
    category: "shortcuts",
    description: "Square numbers quickly using shortcuts",
    levels: 4,
    icon: "X",
  },
  estimation: {
    id: "estimation",
    name: "Estimation Techniques",
    subjectId: "maths",
    category: "shortcuts",
    description: "Quick approximation methods for any calculation",
    levels: 3,
    icon: "TrendUp",
  },
  mentalMath: {
    id: "mentalMath",
    name: "Mental Math Tricks",
    subjectId: "maths",
    category: "shortcuts",
    description: "Advanced shortcuts for lightning-fast calculations",
    levels: 5,
    icon: "Zap",
  },
  vedic: {
    id: "vedic",
    name: "Vedic Mathematics",
    subjectId: "maths",
    category: "shortcuts",
    description: "Ancient techniques for modern math problems",
    levels: 5,
    icon: "Sparkles",
  },

  // Physics - Mechanics
  kinematics: {
    id: "kinematics",
    name: "Kinematics",
    subjectId: "physics",
    category: "mechanics",
    description: "Motion, velocity, acceleration, and displacement",
    levels: 4,
    icon: "Zap",
  },
  dynamics: {
    id: "dynamics",
    name: "Dynamics",
    subjectId: "physics",
    category: "mechanics",
    description: "Forces, Newton's laws, and momentum",
    levels: 5,
    icon: "ArrowRight",
  },
  energy: {
    id: "energy",
    name: "Energy & Work",
    subjectId: "physics",
    category: "mechanics",
    description: "Kinetic and potential energy, work-energy theorem",
    levels: 4,
    icon: "Battery",
  },

  // Physics - Optics
  reflection: {
    id: "reflection",
    name: "Reflection",
    subjectId: "physics",
    category: "optics",
    description: "Light reflection, mirrors, and ray diagrams",
    levels: 3,
    icon: "Sun",
  },
  refraction: {
    id: "refraction",
    name: "Refraction",
    subjectId: "physics",
    category: "optics",
    description: "Light bending, lenses, and Snell's law",
    levels: 4,
    icon: "Eye",
  },
  lenses: {
    id: "lenses",
    name: "Lenses",
    subjectId: "physics",
    category: "optics",
    description: "Convex and concave lenses, focal points",
    levels: 4,
    icon: "Circle",
  },

  // Physics - Electricity
  electrostatics: {
    id: "electrostatics",
    name: "Electrostatics",
    subjectId: "physics",
    category: "electricity",
    description: "Electric charges, fields, and Coulomb's law",
    levels: 4,
    icon: "Zap",
  },
  circuits: {
    id: "circuits",
    name: "Electric Circuits",
    subjectId: "physics",
    category: "electricity",
    description: "Current, voltage, resistance, and Ohm's law",
    levels: 5,
    icon: "Cpu",
  },
};

export const CATEGORIES: Record<TopicCategory, string[]> = {
  arithmetic: ["addition", "subtraction", "multiplication", "division", "fractions"],
  algebra: ["linearEquations", "quadraticEquations", "polynomials", "exponents", "systemsOfEquations"],
  geometry: ["triangles", "circles", "pythagorean", "area", "volume"],
  number_theory: ["primes", "factors", "divisibility", "modular", "sequences"],
  shortcuts: ["percentages", "squaring", "estimation", "mentalMath", "vedic"],
  mechanics: ["kinematics", "dynamics", "energy"],
  optics: ["reflection", "refraction", "lenses"],
  electricity: ["electrostatics", "circuits"],
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


