import type { EsatCampMockQuestion } from "./types";

/** ESAT Mathematics 2 practice pack, module 1 */
export const MATHS2_MOCK_01_QUESTIONS: EsatCampMockQuestion[] = [
  {
    number: 1,
    stem: "For x > 0, simplify\n\\((16x^{6})^{3/4}\\) / (\\(2x^{1/2}\\)).",
    options: {
      A: "\\(2x^{3}\\)",
      B: "\\(2x^{4}\\)",
      C: "\\(4x^{3}\\)",
      D: "\\(4x^{4}\\)",
      E: "\\(8x^{4}\\)"
    },
    answer: "D",
    answerText: "\\(4x^{4}\\)",
    topicCode: "MM1.1",
    topicName: "Algebra and functions: rational indices",
    difficulty: "1/4 Easy",
    targetSeconds: 45,
    targetDisplay: "45 s",
    tip: "Apply the outside power to both the number and x before dividing.",
    solution: "\\(16^{3/4}\\) = 8 and \\((x^{6})^{3/4}\\) = \\(x^{9/2}\\). Dividing by \\(2x^{1/2}\\) gives \\(4x^{4}\\).",
    distractors: {
      A: "Uses \\(16^{3/4}\\) = 4 and also loses one power of x.",
      B: "Gets the power of x right but evaluates \\(16^{3/4}\\) as 4.",
      C: "Evaluates the numerical factor correctly but subtracts the powers incorrectly.",
      E: "Forgets to divide the coefficient by 2."
    },
    benchmarkNote: "ENGAA 2022 Section 1, Q1, rational-index simplification style. [ENGAA 2022 paper]",
    editorPick: false
  },
  {
    number: 2,
    stem: "The line y = 2x + 3 is tangent to the curve y = \\(x^{2}\\) - 4x + k.\nWhat is the value of k?",
    options: {
      A: "12",
      B: "9",
      C: "6",
      D: "3",
      E: "0"
    },
    answer: "A",
    answerText: "12",
    topicCode: "MM1.3",
    topicName: "Algebra and functions: quadratics and discriminant",
    difficulty: "2/4 Medium",
    targetSeconds: 65,
    targetDisplay: "65 s",
    tip: "For a line tangent to a quadratic, set the discriminant of the intersection equation to zero.",
    solution: "At an intersection, \\(x^{2}\\) - 4x + k = 2x + 3, so \\(x^{2}\\) - 6x + k - 3 = 0. Tangency means one repeated root, so\n36 - 4(k - 3) = 0. Hence k = 12.",
    distractors: {
      B: "Uses the repeated x-coordinate, x = 3, as k.",
      C: "Sets the coefficient of x, rather than the discriminant, to zero.",
      D: "Drops k when rearranging and keeps only the line's constant term.",
      E: "Assumes tangency occurs only when the quadratic has no constant term."
    },
    benchmarkNote: "NSAA 2018 Section 1, Q77, tangent line to a quadratic; ENGAA 2021 Section 1, Q11, line-quadratic intersections. [ENGAA 2021 paper] [NSAA 2018 paper]",
    editorPick: false
  },
  {
    number: 3,
    stem: "The polynomial p(x) = \\(2x^{3}\\) + \\(ax^{2}\\) - 3x + 6 leaves the same remainder when divided by x - 1 and by x + 2.\nWhat is a?",
    options: {
      A: "-3",
      B: "-1",
      C: "\\(-1/3\\)",
      D: "0",
      E: "1",
      F: "3"
    },
    answer: "F",
    answerText: "3",
    topicCode: "MM1.6",
    topicName: "Algebra and functions: Remainder Theorem",
    difficulty: "2/4 Medium",
    targetSeconds: 65,
    targetDisplay: "65 s",
    tip: "Translate each divisor into the value to substitute before expanding anything.",
    solution: "Equal remainders give p(1) = p(-2). Now p(1) = a + 5 and p(-2) = 4a - 4. Thus a + 5 = 4a - 4, so a = 3.",
    distractors: {
      A: "Uses x = 2 instead of x = -2 for the divisor x + 2.",
      B: "Changes the sign of the cubic term at x = -2 incorrectly.",
      C: "Divides by 3 too early after forming the wrong linear equation.",
      D: "Assumes equal remainders mean both remainders are zero.",
      E: "Evaluates \\((-2)^{2}\\) as -4."
    },
    benchmarkNote: "ENGAA 2023 Section 1, Q21, polynomial-factor information used to determine coefficients. [ENGAA 2023 paper]",
    editorPick: false
  },
  {
    number: 4,
    stem: "For x \\ge 2, let\nf(x) = \\(x^{2}\\) - 4x + 7 and g(x) = \\sqrt{x - 3}.\nWhich expression is equal to g(f(x))?",
    options: {
      A: "x + 2",
      B: "|x - 2|",
      C: "x - 2",
      D: "\\((x - 2)^{2}\\)",
      E: "\\(\\sqrt{x^{2} - 4x + 7}\\)"
    },
    answer: "C",
    answerText: "x - 2",
    topicCode: "MM1.7",
    topicName: "Algebra and functions: function composition MM8.2 graph transformations and composition",
    difficulty: "2/4 Medium",
    targetSeconds: 70,
    targetDisplay: "70 s",
    tip: "Remember that \\sqrt{\\(u^{2}\\)} = |u|, then use the stated domain.",
    solution: "g(f(x)) = \\sqrt{f(x} - 3) = \\sqrt{(x - 2}^{2}) = |x - 2|. Since x \\ge 2, this is x - 2.",
    distractors: {
      A: "Reverses the sign when completing the square.",
      B: "Stops before using the restriction x \\ge 2.",
      D: "Forgets that the outer function takes a square root.",
      E: "Substitutes f(x) into \\sqrt{x} rather than into \\sqrt{x - 3}."
    },
    benchmarkNote: "Official 2026 Notes on Mathematics, MM1.7 and MM8.2 composition style; no close single archive question was used. [official guide]",
    editorPick: true
  },
  {
    number: 5,
    stem: "Both roots of\n\\(x^{2}\\) - 2kx + \\(k^{2}\\) - 1 = 0\nare strictly between 0 and 4. Which condition on k is correct?",
    options: {
      A: "\\(k < 1\\)",
      B: "\\(k > 3\\)",
      C: "\\(-3 < k < -1\\)",
      D: "\\(-1 < k < 3\\)",
      E: "\\(k < 1 or k > 3\\)",
      F: "\\(1 \\le k \\le 3\\)",
      G: "\\(1 < k < 3\\)"
    },
    answer: "G",
    answerText: "\\(1 < k < 3\\)",
    topicCode: "MM1.3",
    topicName: "Algebra and functions: quadratic roots",
    difficulty: "3/4 Hard",
    targetSeconds: 80,
    targetDisplay: "80 s",
    tip: "Complete the square before reaching for the quadratic formula.",
    solution: "The quadratic is \\((x - k)^{2}\\) = 1, so the roots are k - 1 and k + 1. Requiring 0 < k - 1 and k + 1 < 4 gives 1 <\nk < 3.",
    distractors: {
      A: "Checks only that the smaller root is below 4.",
      B: "Checks only that the larger root is positive.",
      C: "Uses roots -k \\pm 1 instead of k \\pm 1.",
      D: "Applies the bounds to k itself rather than to both roots.",
      E: "Chooses the exterior of the required interval after reversing both inequalities.",
      F: "Includes k = 1 and k = 3, where a root equals an excluded endpoint."
    },
    benchmarkNote: "ENGAA 2022 Section 1, Q31, complete-set inequality style; NSAA 2019 Section 1, Q89, polynomial sign intervals. [ENGAA 2022 paper] [NSAA 2019 paper]",
    editorPick: false
  },
  {
    number: 6,
    stem: "A sequence is defined by \\(u_{1}\\) = 2 and \\(u_{n+1}\\) = 1 - u_n.\nWhat is \\(u_{2026}\\)?",
    options: {
      A: "-2",
      B: "-1",
      C: "1",
      D: "2"
    },
    answer: "B",
    answerText: "-1",
    topicCode: "MM2.1",
    topicName: "Sequences and series: recurrence relations",
    difficulty: "1/4 Easy",
    targetSeconds: 35,
    targetDisplay: "35 s",
    tip: "Write the first three terms and look for a short cycle.",
    solution: "The sequence alternates 2, -1, 2, -1, ... . Every even-numbered term is -1.",
    distractors: {
      A: "Changes the sign but forgets the added 1.",
      C: "Treats the recurrence as \\(u_{n+1}\\) = 1 - n.",
      D: "Uses the value of the odd-numbered terms."
    },
    benchmarkNote: "Official 2026 Notes on Mathematics, MM2.1 recurrence exercises; broader ESAT sequence style. [official guide]",
    editorPick: false
  },
  {
    number: 7,
    stem: "An arithmetic progression has first term a, non-zero common difference d, and sum S_n of its first n terms.\nGiven that \\(S_{10}\\) = \\(3S_{5}\\), what is a/d?",
    options: {
      A: "-3",
      B: "-1",
      C: "0",
      D: "1",
      E: "3",
      F: "5"
    },
    answer: "E",
    answerText: "3",
    topicCode: "MM2.2",
    topicName: "Sequences and series: arithmetic series",
    difficulty: "2/4 Medium",
    targetSeconds: 70,
    targetDisplay: "70 s",
    tip: "Cancel the common factor 5 before doing the algebra.",
    solution: "\\(S_{10}\\) = 5(2a + 9d) and \\(S_{5}\\) = (5/2)(2a + 4d). Setting \\(S_{10}\\) = \\(3S_{5}\\) gives 10(2a + 9d) = 15(2a + 4d), so a = 3d.",
    distractors: {
      A: "Moves the d terms across with the wrong sign.",
      B: "Uses 10d and 5d instead of 9d and 4d in the sum formula.",
      C: "Cancels a from both sides even though it is inside brackets.",
      D: "Uses S = n(a + d)/2.",
      F: "Equates the tenth term to three times the fifth term instead of the sums."
    },
    benchmarkNote: "ENGAA 2023 Section 1, Q23, linked arithmetic sums; NSAA 2018 Section 1, Q79, conditions on an arithmetic progression. [ENGAA 2023 paper] [NSAA 2018 paper]",
    editorPick: false
  },
  {
    number: 8,
    stem: "What is the coefficient of \\(x^{2}\\) in\n\\((1 - 2x)^{5}\\) + \\((1 + 2x)^{5}\\)?",
    options: {
      A: "0",
      B: "40",
      C: "80",
      D: "160",
      E: "320"
    },
    answer: "C",
    answerText: "80",
    topicCode: "MM2.4",
    topicName: "Sequences and series: binomial expansion",
    difficulty: "1/4 Easy",
    targetSeconds: 50,
    targetDisplay: "50 s",
    tip: "Odd-power terms cancel, but even-power terms add.",
    solution: "Each expansion contributes C(5,2)\\((2x)^{2}\\) = 10 \\times \\(4x^{2}\\) = \\(40x^{2}\\). The signs are positive for an even power,\nso the total coefficient is 80.",
    distractors: {
      A: "Assumes every non-constant term cancels.",
      B: "Finds the coefficient from only one expansion.",
      D: "Adds the two contributions and then doubles once more.",
      E: "Uses \\(2^{5}\\) instead of \\(2^{2}\\) for the \\(x^{2}\\) term."
    },
    benchmarkNote: "NSAA 2018 Section 1, Q85, coefficient extraction with paired binomial factors. [NSAA 2018 paper]",
    editorPick: false
  },
  {
    number: 9,
    stem: "The line through A(1, 4) and B(5, 2) is perpendicular to line L. Line L passes through A.\nWhat is the equation of L?",
    options: {
      A: "\\(y = 2x + 2\\)",
      B: "\\(y = 2x - 2\\)",
      C: "\\(y = x/2 + 7/2\\)",
      D: "\\(y = -x/2 + 9/2\\)",
      E: "\\(y = -2x + 6\\)"
    },
    answer: "A",
    answerText: "\\(y = 2x + 2\\)",
    topicCode: "MM3.1",
    topicName: "Coordinate geometry: perpendicular lines",
    difficulty: "2/4 Medium",
    targetSeconds: 60,
    targetDisplay: "60 s",
    tip: "Find the gradient first, then use the negative reciprocal.",
    solution: "The gradient of AB is (2 - 4)/(5 - 1) = -1/2, so the perpendicular gradient is 2. Through A, y - 4 = 2(x -\n1), hence y = 2x + 2.",
    distractors: {
      B: "Uses the correct gradient but substitutes A incorrectly.",
      C: "Changes the sign of the gradient but does not take the reciprocal.",
      D: "Uses the equation of AB itself.",
      E: "Takes the reciprocal but keeps the negative sign."
    },
    benchmarkNote: "ENGAA 2018 Section 1, Q5, parallel-gradient reasoning; ENGAA 2022 Section 1, Q37, point-to-line geometry. [ENGAA 2018 paper] [ENGAA 2022 paper]",
    editorPick: false
  },
  {
    number: 10,
    stem: "The circle \\((x - 2)^{2}\\) + \\((y + 1)^{2}\\) = 9 has centre C. A tangent from P(8, -1) touches the circle at T, as shown.\nWhat is PT?",
    options: {
      A: "\\(3/2\\)",
      B: "\\(\\sqrt{3}\\)",
      C: "3",
      D: "\\(2\\sqrt{3}\\)",
      E: "\\(\\sqrt{15}\\)",
      F: "\\(3\\sqrt{3}\\)"
    },
    answer: "F",
    answerText: "\\(3\\sqrt{3}\\)",
    topicCode: "MM3.2",
    topicName: "Coordinate geometry: circles",
    difficulty: "2/4 Medium",
    targetSeconds: 70,
    targetDisplay: "70 s",
    tip: "Join the external point to the centre to create a right-angled triangle.",
    solution: "CP = 6 and CT = 3. Since CT is perpendicular to the tangent, triangle CTP is right-angled. Thus \\(PT^{2}\\) =\n\\(6^{2}\\) - \\(3^{2}\\) = 27, so PT = 3\\sqrt{3}.",
    distractors: {
      A: "Uses the difference of the two lengths and then halves it.",
      B: "Calculates \\sqrt{6 - 3} instead of using squares.",
      C: "Assumes the tangent length equals the radius.",
      D: "Uses \\(PT^{2}\\) = CP \\times CT.",
      E: "Uses \\(PT^{2}\\) = \\(CP^{2}\\) - CT rather than \\(CP^{2}\\) - \\(CT^{2}\\)."
    },
    benchmarkNote: "NSAA 2018 Section 1, Q83, tangent length from an external point to a circle. [NSAA 2018 paper]",
    editorPick: false,
    diagramKey: "m2-1-q10"
  },
  {
    number: 11,
    stem: "The points A(-1, 2) and B(5, 6) are the endpoints of a diameter of a circle.\nWhich is the equation of the circle?",
    options: {
      A: "\\((x - 2)^{2} + (y - 4)^{2} = 52\\)",
      B: "\\((x + 2)^{2} + (y + 4)^{2} = 13\\)",
      C: "\\((x - 2)^{2} + (y - 4)^{2} = 26\\)",
      D: "\\((x - 2)^{2} + (y - 4)^{2} = 13\\)",
      E: "\\((x - 3)^{2} + (y - 2)^{2} = 13\\)"
    },
    answer: "D",
    answerText: "\\((x - 2)^{2} + (y - 4)^{2} = 13\\)",
    topicCode: "MM3.2",
    topicName: "Coordinate geometry: equation of a circle",
    difficulty: "2/4 Medium",
    targetSeconds: 65,
    targetDisplay: "65 s",
    tip: "The diameter is twice the radius, so square lengths with care.",
    solution: "The centre is the midpoint (2, 4). Also \\(AB^{2}\\) = \\(6^{2}\\) + \\(4^{2}\\) = 52, so \\(r^{2}\\) = \\(AB^{2}\\)/4 = 13. Therefore \\((x - 2)^{2}\\) + \\((y -\n4)^{2}\\) = 13.",
    distractors: {
      A: "Uses the squared diameter as \\(r^{2}\\).",
      B: "Uses the right radius but reverses both centre signs.",
      C: "Divides the squared diameter by 2 instead of 4.",
      E: "Finds the wrong midpoint by pairing unlike coordinates."
    },
    benchmarkNote: "Official 2026 Notes on Mathematics, MM3.2 circle-equation examples; broader coordinate-geometry style in ENGAA 2022 Q37. [ENGAA 2022 paper] [official guide]",
    editorPick: false
  },
  {
    number: 12,
    stem: "Evaluate\n(sin \\(30^{\\circ}\\) + cos \\(60^{\\circ}\\)) / tan \\(45^{\\circ}\\).",
    options: {
      A: "\\(1/2\\)",
      B: "1",
      C: "\\(\\sqrt{2}\\)",
      D: "2",
      E: "\\(2\\sqrt{2}\\)"
    },
    answer: "B",
    answerText: "1",
    topicCode: "MM4.3",
    topicName: "Trigonometry: exact values",
    difficulty: "1/4 Easy",
    targetSeconds: 40,
    targetDisplay: "40 s",
    tip: "Recall the exact values before doing any manipulation.",
    solution: "sin \\(30^{\\circ}\\) = cos \\(60^{\\circ}\\) = 1/2 and tan \\(45^{\\circ}\\) = 1. The value is (1/2 + 1/2)/1 = 1.",
    distractors: {
      A: "Uses only one term in the numerator.",
      C: "Confuses sin \\(45^{\\circ}\\) with tan \\(45^{\\circ}\\).",
      D: "Divides each half by 1/2 instead of by 1.",
      E: "Uses tan \\(45^{\\circ}\\) = 1/\\sqrt{2} and also doubles the numerator."
    },
    benchmarkNote: "Official Pearson ESAT Mathematics 2 specimen, exact-trigonometric-value style; specification MM4.3. [official specimen page] [specification]",
    editorPick: false
  },
  {
    number: 13,
    stem: "A circle has radius 6. A minor arc AB has length 4\\pi , and the minor segment cut off by chord AB is shaded.\nWhat is the exact area of the shaded segment?",
    options: {
      A: "\\(4\\pi - 3\\sqrt{3}\\)",
      B: "\\(8\\pi - 9\\sqrt{3}\\)",
      C: "\\(9\\pi - 6\\sqrt{3}\\)",
      D: "\\(12\\pi - 18\\sqrt{3}\\)",
      E: "\\(12\\pi + 9\\sqrt{3}\\)",
      F: "\\(18\\pi - 9\\sqrt{3}\\)",
      G: "\\(12\\pi - 9\\sqrt{3}\\)"
    },
    answer: "G",
    answerText: "\\(12\\pi - 9\\sqrt{3}\\)",
    topicCode: "MM4.2",
    topicName: "Trigonometry: radians, sectors and segments",
    difficulty: "3/4 Hard",
    targetSeconds: 85,
    targetDisplay: "85 s",
    tip: "A segment is a sector minus the triangle formed by the two radii.",
    solution: "The angle is \\theta = s/r = 4\\pi /6 = 2\\pi /3. Sector area is (1/2)\\(r^{2}\\)\\theta = 12\\pi . Triangle AOB has area (1/2)(6)\n(6)sin(2\\pi /3) = 9\\sqrt{3}. The segment area is 12\\pi - 9\\sqrt{3}.",
    distractors: {
      A: "Uses the arc length as if it were the angle.",
      B: "Uses \\theta = \\pi /3 rather than 2\\pi /3.",
      C: "Uses \\pi r\\theta /2 for the sector area.",
      D: "Forgets the factor 1/2 in the triangle area.",
      E: "Adds the triangle instead of subtracting it.",
      F: "Uses the whole 18\\pi half-circle area as the sector."
    },
    benchmarkNote: "ENGAA 2021 Section 1, Q27, exact area of a circular segment; official specification MM4.2. [ENGAA 2021 paper] [specification]",
    editorPick: false,
    diagramKey: "m2-1-q13"
  },
  {
    number: 14,
    stem: "How many solutions of\n\\(2sin^{2}\\)x + cos x = 3/2\nlie in 0 \\le x < 2\\pi ?",
    options: {
      A: "0",
      B: "1",
      C: "2",
      D: "3",
      E: "4"
    },
    answer: "E",
    answerText: "4",
    topicCode: "MM4.6",
    topicName: "Trigonometry: equations in an interval",
    difficulty: "3/4 Hard",
    targetSeconds: 85,
    targetDisplay: "85 s",
    tip: "You only need to check whether the cosine roots lie in [-1, 1]; you do not need their angles.",
    solution: "Let c = cos x and use \\(sin^{2}\\)x = 1 - \\(c^{2}\\). This gives \\(4c^{2}\\) - 2c - 1 = 0, with roots c = (1 \\pm \\sqrt{5})/4. Both lie\nstrictly between -1 and 1, so each cosine value gives two x-values in the interval. Total: 4.",
    distractors: {
      A: "Rejects the irrational cosine values because they are not standard angles.",
      B: "Keeps only one root of the quadratic and one angle.",
      C: "Keeps both cosine roots but gives one angle for each.",
      D: "Treats one valid cosine root as an endpoint value with only one angle."
    },
    benchmarkNote: "NSAA 2018 Section 1, Q75, counting trigonometric solutions in a radian interval. [NSAA 2018 paper]",
    editorPick: true
  },
  {
    number: 15,
    stem: "An acute angle \\theta satisfies tan \\theta = 3/4.\nWhat is sin \\theta - cos \\theta ?",
    options: {
      A: "-1",
      B: "\\(-4/5\\)",
      C: "\\(-1/5\\)",
      D: "\\(1/5\\)",
      E: "\\(7/5\\)"
    },
    answer: "C",
    answerText: "\\(-1/5\\)",
    topicCode: "MM4.5",
    topicName: "Trigonometry: identities",
    difficulty: "1/4 Easy",
    targetSeconds: 45,
    targetDisplay: "45 s",
    tip: "Turn a positive tangent ratio into a right triangle.",
    solution: "Use a 3-4-5 triangle. Then sin \\theta = 3/5 and cos \\theta = 4/5, so sin \\theta - cos \\theta = -1/5.",
    distractors: {
      A: "Subtracts 4 from 3 without dividing by the hypotenuse.",
      B: "Uses sin \\theta = 0.",
      D: "Reverses the order of subtraction.",
      E: "Adds sine and cosine instead of subtracting."
    },
    benchmarkNote: "NSAA 2019 Section 1, Q77, reducing a trigonometric condition to algebraic ratios. [NSAA 2019 paper]",
    editorPick: false
  },
  {
    number: 16,
    stem: "Solve\n\\(4^{x - 1}\\) = \\(8^{x + 1}\\).",
    options: {
      A: "-5",
      B: "-3",
      C: "-1",
      D: "1",
      E: "5"
    },
    answer: "A",
    answerText: "-5",
    topicCode: "MM5.3",
    topicName: "Exponentials and logarithms: exponential equations",
    difficulty: "1/4 Easy",
    targetSeconds: 45,
    targetDisplay: "45 s",
    tip: "Convert both sides to the same base before comparing exponents.",
    solution: "Write both sides in base 2: \\(2^{2x - 2}\\) = \\(2^{3x + 3}\\). Hence 2x - 2 = 3x + 3, giving x = -5.",
    distractors: {
      B: "Drops the factor 2 multiplying x - 1.",
      C: "Equates x - 1 and x + 1 directly.",
      D: "Changes 8 to \\(2^{2}\\) instead of \\(2^{3}\\).",
      E: "Moves the constants across with the wrong sign."
    },
    benchmarkNote: "NSAA 2019 Section 1, Q81, exponential equation reduced using a substitution or common base. [NSAA 2019 paper]",
    editorPick: false
  },
  {
    number: 17,
    stem: "Evaluate\n\\(log_{2}\\)(3/2) + \\(log_{2}\\)(4/3) + \\(log_{2}\\)(5/4) + ... + \\(log_{2}\\)(32/31).",
    options: {
      A: "-4",
      B: "-1",
      C: "1",
      D: "4",
      E: "5"
    },
    answer: "D",
    answerText: "4",
    topicCode: "MM5.2",
    topicName: "Exponentials and logarithms: logarithm laws",
    difficulty: "2/4 Medium",
    targetSeconds: 60,
    targetDisplay: "60 s",
    tip: "Combine first, then cancel the product before evaluating the logarithm.",
    solution: "Combine the logarithms. The product telescopes to (3/2)(4/3)...(32/31) = 32/2 = 16. Therefore the\nsum is \\(log_{2}\\)16 = 4.",
    distractors: {
      A: "Reverses every fraction before combining.",
      B: "Keeps only the first and last denominators in the wrong order.",
      C: "Assumes a telescoping product must equal the base 2.",
      E: "Uses 32 = \\(2^{5}\\) and forgets the remaining division by 2."
    },
    benchmarkNote: "NSAA 2018 Section 1, Q81, telescoping sum of logarithms. [NSAA 2018 paper]",
    editorPick: false
  },
  {
    number: 18,
    stem: "Two quantities are modelled by\nP = 3 \\times \\(2^{t}\\) and Q = 96 \\times \\(2^{-t}\\).\nFor what value of t are P and Q equal?",
    options: {
      A: "\\(-5/2\\)",
      B: "-1",
      C: "0",
      D: "1",
      E: "2",
      F: "\\(5/2\\)"
    },
    answer: "F",
    answerText: "\\(5/2\\)",
    topicCode: "MM5.3",
    topicName: "Exponentials and logarithms: exponential models",
    difficulty: "2/4 Medium",
    targetSeconds: 65,
    targetDisplay: "65 s",
    tip: "Bring equal bases together before comparing exponents.",
    solution: "Set the models equal: 3 \\times \\(2^{t}\\) = 96 \\times \\(2^{-t}\\). Hence \\(2^{2t}\\) = 32 = \\(2^{5}\\), so 2t = 5 and t = 5/2.",
    distractors: {
      A: "Moves \\(2^{-t}\\) across but keeps the exponent negative.",
      B: "Uses 96/3 = \\(2^{-2}\\).",
      C: "Assumes the increasing and decreasing models meet at t = 0.",
      D: "Uses 32 = \\(2^{2}\\).",
      E: "Finds 2t = 4 after treating 32 as 16."
    },
    benchmarkNote: "Official 2026 Notes on Mathematics, MM5.3 exponential-equation modelling; broader ESAT intersection style. [official guide]",
    editorPick: false
  },
  {
    number: 19,
    stem: "The curve y = \\(x^{3}\\) - 3x has a normal at the point where x = 2.\nWhich is the equation of the normal?",
    options: {
      A: "\\(y - 2 = 9(x - 2)\\)",
      B: "\\(y - 2 = -(x - 2)/9\\)",
      C: "\\(y + 2 = -(x + 2)/9\\)",
      D: "\\(y - 2 = -(x - 2)/6\\)",
      E: "\\(y - 2 = (x - 2)/9\\)"
    },
    answer: "B",
    answerText: "\\(y - 2 = -(x - 2)/9\\)",
    topicCode: "MM6.3",
    topicName: "Differentiation: tangents and normals",
    difficulty: "2/4 Medium",
    targetSeconds: 70,
    targetDisplay: "70 s",
    tip: "Find both the point and the negative reciprocal gradient.",
    solution: "At x = 2, y = 2. Also dy/dx = \\(3x^{2}\\) - 3, so the tangent gradient is 9 and the normal gradient is -1/9.\nThus y - 2 = -(x - 2)/9.",
    distractors: {
      A: "Uses the tangent gradient instead of the normal gradient.",
      C: "Uses (-2, -2) instead of (2, 2).",
      D: "Differentiates \\(x^{3}\\) as 3x instead of \\(3x^{2}\\).",
      E: "Takes the reciprocal but forgets the negative sign."
    },
    benchmarkNote: "ENGAA 2021 Section 1, Q21, efficient derivative evaluation; official MM6.3 tangent and normal style. [ENGAA 2021 paper]",
    editorPick: false,
    diagramKey: "m2-1-q19"
  },
  {
    number: 20,
    stem: "For a > 0, the curve\ny = \\(x^{3}\\) - 3ax + 2\nhas a stationary point on the x-axis. What is a?",
    options: {
      A: "-4",
      B: "-2",
      C: "-1",
      D: "0",
      E: "1",
      F: "2",
      G: "4"
    },
    answer: "E",
    answerText: "1",
    topicCode: "MM6.3",
    topicName: "Differentiation: stationary points",
    difficulty: "3/4 Hard",
    targetSeconds: 80,
    targetDisplay: "80 s",
    tip: "Use the derivative equation to remove the parameter from the curve equation.",
    solution: "At a stationary point, \\(3x^{2}\\) - 3a = 0, so a = \\(x^{2}\\). Being on the x-axis also gives \\(x^{3}\\) - \\(3x^{3}\\) + 2 = 0, hence \\(x^{3}\\) =\n1. Therefore x = 1 and a = 1.",
    distractors: {
      A: "Uses a = -\\(x^{2}\\) and x = 2.",
      B: "Substitutes \\(x^{3}\\) = 2 instead of \\(x^{3}\\) = 1.",
      C: "Takes x = -1 even though it does not make the point lie on the axis.",
      D: "Assumes a stationary point on an axis must occur at the origin.",
      F: "Uses \\(x^{3}\\) = 2 after missing the factor -\\(2x^{3}\\).",
      G: "Squares the constant term 2 to obtain a."
    },
    benchmarkNote: "Official 2026 Notes on Mathematics, MM6.3 stationary-point parameter exercises; tangent condition style also seen in NSAA 2018 Q77. [NSAA 2018 paper] [official guide]",
    editorPick: false
  },
  {
    number: 21,
    stem: "An open box is made from a 12 by 8 rectangular sheet by cutting a square of side x from each corner and folding up\nthe sides.\nFor 0 < x < 4, which value of x gives the maximum volume?",
    options: {
      A: "\\((10 + 2\\sqrt{7})/3\\)",
      B: "\\((10 - \\sqrt{7})/3\\)",
      C: "\\((8 - 2\\sqrt{7})/3\\)",
      D: "\\(4 - \\sqrt{7}\\)",
      E: "\\(2\\sqrt{7}/3\\)",
      F: "2",
      G: "\\((10 - 2\\sqrt{7})/3\\)"
    },
    answer: "G",
    answerText: "\\((10 - 2\\sqrt{7})/3\\)",
    topicCode: "MM6.3",
    topicName: "Differentiation: optimisation",
    difficulty: "3/4 Hard",
    targetSeconds: 90,
    targetDisplay: "90 s",
    tip: "Use the physical interval to reject the second stationary value immediately.",
    solution: "V = x(12 - 2x)(8 - 2x) = 4x(6 - x)(4 - x). Differentiating gives V' = \\(12x^{2}\\) - 80x + 96. Thus \\(3x^{2}\\) - 20x + 24 =\n0, so x = (10 \\pm 2\\sqrt{7})/3. Only the minus sign lies in 0 < x < 4, so it gives the maximum.",
    distractors: {
      A: "Keeps the stationary value outside the physical domain.",
      B: "Loses the factor 2 when applying the quadratic formula.",
      C: "Uses 8 rather than 10 in the quadratic-formula numerator.",
      D: "Differentiates the three factors separately but does not use the product rule correctly.",
      E: "Keeps only the square-root part of the solution.",
      F: "Assumes the best cut is half the smaller side's half-width."
    },
    benchmarkNote: "ENGAA 2022 Section 1, Q23, forming an area model from a diagram; official 2026 Notes MM6.3 optimisation style. [ENGAA 2022 paper] [official guide]",
    editorPick: true,
    diagramKey: "m2-1-q21"
  },
  {
    number: 22,
    stem: "The line y = x - 1 is shown for 0 \\le x \\le 3. The two regions between the line and the x-axis are shaded.\nWhat is the total shaded area?",
    options: {
      A: "\\(3/2\\)",
      B: "2",
      C: "\\(5/2\\)",
      D: "3",
      E: "\\(7/2\\)"
    },
    answer: "C",
    answerText: "\\(5/2\\)",
    topicCode: "MM7.1",
    topicName: "Integration: area and signed integral",
    difficulty: "2/4 Medium",
    targetSeconds: 55,
    targetDisplay: "55 s",
    tip: "Areas below the axis still count positively in a total geometric area.",
    solution: "From 0 to 1 the triangle has area 1/2. From 1 to 3 the triangle has area (1/2)(2)(2) = 2. Total area =\n1/2 + 2 = 5/2.",
    distractors: {
      A: "Calculates the signed integral, 2 - 1/2.",
      B: "Counts only the region above the axis.",
      D: "Adds the two triangle bases but omits the factor 1/2.",
      E: "Treats the smaller triangle as having area 3/2."
    },
    benchmarkNote: "ENGAA 2018 Section 1, Q29, area enclosed by a curve and a line; official MM7.1 signed-area distinction. [ENGAA 2018 paper]",
    editorPick: false,
    diagramKey: "m2-1-q22"
  },
  {
    number: 23,
    stem: "The area under y = \\(x^{2}\\) from x = 0 to x = 2 is estimated using the trapezium rule with ordinates at x = 0, 1 and 2.\nWhich row is correct?",
    options: {
      A: "estimate 3; overestimate",
      B: "estimate 3; underestimate",
      C: "estimate 8/3; exact",
      D: "estimate 5/2; underestimate",
      E: "estimate 4; overestimate"
    },
    answer: "A",
    answerText: "estimate 3; overestimate",
    topicCode: "MM7.5",
    topicName: "Integration: trapezium rule",
    difficulty: "2/4 Medium",
    targetSeconds: 65,
    targetDisplay: "65 s",
    tip: "For a convex curve, trapezium tops sit above the curve.",
    solution: "With width 1, the trapezium estimate is (1/2)[0 + 2(1) + 4] = 3. Since y = \\(x^{2}\\) is convex, the chords lie\nabove the curve, so this is an overestimate.",
    distractors: {
      B: "Gets the numerical estimate right but reverses the convexity judgement.",
      C: "Uses the exact integral instead of the trapezium estimate.",
      D: "Uses the midpoint value as an average height.",
      E: "Adds the three ordinates without endpoint half-weights."
    },
    benchmarkNote: "Official 2026 Notes on Mathematics, MM7.5 trapezium-rule and overestimate style; no close archive item was used. [official guide]",
    editorPick: false,
    diagramKey: "m2-1-q23"
  },
  {
    number: 24,
    stem: "A curve satisfies dy/dx = 6x - 4 and passes through (1, 5).\nWhat is the value of y when x = 2?",
    options: {
      A: "5",
      B: "6",
      C: "7",
      D: "8",
      E: "9",
      F: "10"
    },
    answer: "F",
    answerText: "10",
    topicCode: "MM7.6",
    topicName: "Integration: differential equations",
    difficulty: "2/4 Medium",
    targetSeconds: 65,
    targetDisplay: "65 s",
    tip: "Find the constant before substituting the requested x-value.",
    solution: "Integrating gives y = \\(3x^{2}\\) - 4x + C. Using (1, 5), 5 = 3 - 4 + C, so C = 6. At x = 2, y = 12 - 8 + 6 = 10.",
    distractors: {
      A: "Assumes the initial y-value remains constant.",
      B: "Finds C correctly but reports it as the answer.",
      C: "Integrates 6x as 3x rather than \\(3x^{2}\\).",
      D: "Omits the constant of integration.",
      E: "Uses C = 5 without applying the point to the other terms."
    },
    benchmarkNote: "Official 2026 Notes on Mathematics, MM7.6 first-order differential-equation examples. [official guide]",
    editorPick: false
  },
  {
    number: 25,
    stem: "The graph of y = f(x) has a maximum at (-2, 3) and x-intercepts at (-4, 0) and (0, 0), as shown.\nWhat is the turning point of y = -2f(x + 1) + 5?",
    options: {
      A: "(-1, -1)",
      B: "(-3, 11)",
      C: "(-1, 11)",
      D: "(-3, -1)",
      E: "(3, -1)"
    },
    answer: "D",
    answerText: "(-3, -1)",
    topicCode: "MM8.2",
    topicName: "Graphs of functions: transformations",
    difficulty: "1/4 Easy",
    targetSeconds: 55,
    targetDisplay: "55 s",
    tip: "Do the horizontal transformation first, and remember its direction is reversed.",
    solution: "Replacing x by x + 1 shifts the graph left by 1, so the x-coordinate becomes -3. The y-value\ntransforms as -2(3) + 5 = -1. The turning point is (-3, -1).",
    distractors: {
      A: "Shifts the graph right instead of left.",
      B: "Shifts left but uses 2(3) + 5.",
      C: "Shifts right and also misses the reflection.",
      E: "Changes the sign of the original x-coordinate instead of shifting it."
    },
    benchmarkNote: "Official Pearson ESAT Mathematics 2 specimen and 2026 Notes MM8.2 graph-transformation style. [official specimen page]",
    editorPick: false,
    diagramKey: "m2-1-q25"
  },
  {
    number: 26,
    stem: "How many distinct real solutions does\n\\(x^{3}\\) - 3x = 2\nhave?",
    options: {
      A: "1",
      B: "2",
      C: "3",
      D: "4"
    },
    answer: "B",
    answerText: "2",
    topicCode: "MM8.7",
    topicName: "Graphs of functions: intersections",
    difficulty: "3/4 Hard",
    targetSeconds: 80,
    targetDisplay: "80 s",
    tip: "The question asks for distinct roots, so inspect multiplicity after factorising.",
    solution: "Rearrange to \\(x^{3}\\) - 3x - 2 = 0. This factorises as (x - 2)\\((x + 1)^{2}\\) = 0, giving the two distinct roots x = 2\nand x = -1. The repeated root represents tangency to y = 2.",
    distractors: {
      A: "Counts only the crossing at x = 2 and misses the tangent root.",
      C: "Counts the repeated root x = -1 twice.",
      D: "Assumes a cubic and a line can meet in four places."
    },
    benchmarkNote: "NSAA 2018 Section 1, Q77, tangency as a repeated algebraic solution; ENGAA 2021 Section 1, Q11, intersections encoded by a quadratic. [ENGAA 2021 paper] [NSAA 2018 paper]",
    editorPick: true,
    diagramKey: "m2-1-q26"
  },
  {
    number: 27,
    stem: "The graph shown is decreasing, has horizontal asymptote y = -3, and passes through (0, -1).\nWhich is its equation?",
    options: {
      A: "\\(y = 2^{x} - 3\\)",
      B: "\\(y = 2^{-x} + 3\\)",
      C: "\\(y = 2^{x + 1} - 3\\)",
      D: "\\(y = 2^{-x} - 1\\)",
      E: "\\(y = 2^{1 - x} - 3\\)"
    },
    answer: "E",
    answerText: "\\(y = 2^{1 - x} - 3\\)",
    topicCode: "MM8.1",
    topicName: "Graphs of functions: exponential graphs",
    difficulty: "2/4 Medium",
    targetSeconds: 65,
    targetDisplay: "65 s",
    tip: "Use the asymptote and direction first, then check one point.",
    solution: "A decreasing base-2 exponential needs a negative coefficient of x in the exponent. The asymptote\n-3 fixes the vertical shift. At x = 0, \\(2^{1 - 0}\\) - 3 = -1, so y = \\(2^{1 - x}\\) - 3.",
    distractors: {
      A: "Has the right asymptote but is increasing and has y-intercept -2.",
      B: "Is decreasing but has asymptote y = 3.",
      C: "Has the right intercept and asymptote but is increasing.",
      D: "Is decreasing and has the right intercept, but its asymptote is y = -1."
    },
    benchmarkNote: "Official 2026 Notes on Mathematics, MM5.1 and MM8.1-2 exponential-graph style; official Pearson specimen graph interpretation. [official guide] [official specimen page]",
    editorPick: false,
    diagramKey: "m2-1-q27"
  }
];
