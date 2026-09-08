import type { EsatCampMockQuestion } from "./types";

/** ESAT Mathematics 2 practice pack, module 2 */
export const MATHS2_MOCK_02_QUESTIONS: EsatCampMockQuestion[] = [
  {
    number: 1,
    stem: "Simplify\n\\[\\frac{1}{\\sqrt{5} - 2} - \\frac{1}{\\sqrt{5} + 2}.\\]",
    options: {
      A: "2",
      B: "4",
      C: "\\(2\\sqrt{5}\\)",
      D: "\\(4\\sqrt{5}\\)",
      E: "8"
    },
    answer: "B",
    answerText: "4",
    topicCode: "MM1.2",
    topicName: "Algebra and functions: surds",
    difficulty: "1/4 Easy",
    targetSeconds: 50,
    targetDisplay: "50 s",
    tip: "Conjugate denominators often collapse to a small integer.",
    solution: "The common denominator is (\\sqrt{5} - 2)(\\sqrt{5} + 2) = 1. The numerator is (\\sqrt{5} + 2) - (\\sqrt{5} - 2) = 4, so the\nvalue is 4.",
    distractors: {
      A: "Subtracts the two 2s instead of accounting for the outer minus sign.",
      C: "Adds the surd parts and cancels the rational parts.",
      D: "Uses 5 + 4 as the denominator rather than the difference of squares.",
      E: "Doubles the numerator again after rationalising both fractions."
    },
    benchmarkNote: "ENGAA 2022 Section 1, Q27, exact simplification of a surd expression. [ENGAA 2022 paper]",
    editorPick: false
  },
  {
    number: 2,
    stem: "The line y = x + 2 intersects the curve y = \\(x^{2}\\) - k at two points. The difference between their x-coordinates is 4.\nWhat is k?",
    options: {
      A: "\\(-\\frac{7}{4}\\)",
      B: "\\(-\\frac{1}{4}\\)",
      C: "\\(\\frac{1}{4}\\)",
      D: "\\(\\frac{3}{4}\\)",
      E: "\\(\\frac{7}{4}\\)"
    },
    answer: "E",
    answerText: "\\(\\frac{7}{4}\\)",
    topicCode: "MM1.4",
    topicName: "Algebra and functions: simultaneous equations",
    difficulty: "2/4 Medium",
    targetSeconds: 75,
    targetDisplay: "75 s",
    tip: "For roots r and s of a monic quadratic, \\((r - s)^{2}\\) equals the discriminant.",
    solution: "Intersections satisfy \\(x^{2}\\) - x - (k + 2) = 0. For a monic quadratic, the root difference has square equal\nto the discriminant: 1 + 4(k + 2) = 4k + 9. Hence 4k + 9 = 16 and k = 7/4.",
    distractors: {
      A: "Moves 9 across with the wrong sign.",
      B: "Uses the difference 4 as the discriminant rather than \\(4^{2}\\).",
      C: "Drops the +2 when equating the graphs.",
      D: "Uses 4k + 1 for the discriminant."
    },
    benchmarkNote: "ENGAA 2021 Section 1, Q11, deducing a line-curve parameter from the separation of intersection roots. [ENGAA 2021 paper]",
    editorPick: false
  },
  {
    number: 3,
    stem: "The polynomial \\(x^{2}\\) + x - 6 is a factor of\n\\[x^{3} + ax^{2} + bx + 12.\\]\nWhat is a + b?",
    options: {
      A: "-9",
      B: "-6",
      C: "-3",
      D: "3",
      E: "9"
    },
    answer: "A",
    answerText: "-9",
    topicCode: "MM1.6",
    topicName: "Algebra and functions: polynomial factors",
    difficulty: "1/4 Easy",
    targetSeconds: 55,
    targetDisplay: "55 s",
    tip: "Use the constant term to find the linear quotient before expanding.",
    solution: "Since \\(x^{2}\\) + x - 6 = (x + 3)(x - 2), the remaining factor is x + c. The constant term is -6c = 12, so c = -2.\nExpanding (\\(x^{2}\\) + x - 6)(x - 2) gives a = -1 and b = -8, hence a + b = -9.",
    distractors: {
      B: "Reports the constant coefficient of the quadratic factor.",
      C: "Uses c = 2 instead of c = -2.",
      D: "Adds the roots 3 and -2 rather than the required coefficients.",
      E: "Finds the correct magnitude but loses the negative signs."
    },
    benchmarkNote: "ENGAA 2023 Section 1, Q21, a quadratic factor used to determine cubic coefficients. [ENGAA 2023 paper]",
    editorPick: false
  },
  {
    number: 4,
    stem: "What is the complete set of real values of x satisfying\n\\[(x - 1)(x + 3) \\geq 4(x - 1)?\\]",
    options: {
      A: "\\(x \\leq -3\\)",
      B: "\\(x \\geq 1\\)",
      C: "\\(x \\leq 1\\)",
      D: "\\(x \\ne 1\\)",
      E: "\\(-3 \\leq x \\leq 1\\)",
      F: "\\(x \\leq -3\\) or \\(x \\geq 1\\)",
      G: "all real x"
    },
    answer: "G",
    answerText: "all real x",
    topicCode: "MM1.5",
    topicName: "Algebra and functions: inequalities",
    difficulty: "2/4 Medium",
    targetSeconds: 65,
    targetDisplay: "65 s",
    tip: "Do not divide by an expression whose sign, or zero value, is unknown.",
    solution: "Move the right side across and factor: (x - 1)[(x + 3) - 4] = \\((x - 1)^{2}\\) \\geq 0. A square is non-negative for\nevery real x, including x = 1.",
    distractors: {
      A: "Keeps the original root -3 after failing to combine the two sides.",
      B: "Divides by x - 1 and assumes it is positive.",
      C: "Divides by x - 1 and assumes it is negative.",
      D: "Recognises a square but incorrectly excludes the zero case despite \\geq .",
      E: "Uses the roots -3 and 1 as if the original product were compared with zero.",
      F: "Uses an exterior sign pattern for roots that disappear after simplification."
    },
    benchmarkNote: "ENGAA 2022 Section 1, Q31, complete-set inequality selection; NSAA 2019 Section 1, Q89, polynomial sign analysis. [ENGAA 2022 paper] [NSAA 2019 paper]",
    editorPick: true
  },
  {
    number: 5,
    stem: "\\(Let f(x) = x^{2} + 1\\) and \\(g(x) = 2x - 3.\\)\nWhat is the complete solution set of f(g(x)) = 5?",
    options: {
      A: "\\(\\{\\frac{1}{2}\\}\\)",
      B: "\\(\\{\\frac{5}{2}\\}\\)",
      C: "\\(\\{-\\frac{1}{2}, \\frac{5}{2}\\}\\)",
      D: "\\(\\{\\frac{1}{2}, \\frac{5}{2}\\}\\)",
      E: "\\(\\{-\\frac{5}{2}, -\\frac{1}{2}\\}\\)"
    },
    answer: "D",
    answerText: "\\(\\{\\frac{1}{2}, \\frac{5}{2}\\}\\)",
    topicCode: "MM1.7",
    topicName: "Algebra and functions: function composition",
    difficulty: "2/4 Medium",
    targetSeconds: 65,
    targetDisplay: "65 s",
    tip: "When a square equals a positive number, keep both signs.",
    solution: "f(g(x)) = \\((2x - 3)^{2}\\) + 1. Setting this equal to 5 gives \\((2x - 3)^{2}\\) = 4, so 2x - 3 = \\pm 2. Hence x = 1/2 or 5/2.",
    distractors: {
      A: "Keeps only the negative square-root branch.",
      B: "Keeps only the positive square-root branch.",
      C: "Solves 2x + 3 = \\pm 2 after reversing the sign in g.",
      E: "Changes both solutions' signs after solving correctly."
    },
    benchmarkNote: "Official 2026 Notes on Mathematics, MM1.7 composition exercises; official Pearson specimen function style. [official guide] [official specimen page]",
    editorPick: false
  },
  {
    number: 6,
    stem: "A sequence is defined by \\(u_{1}\\) = 2 and\n\\[u_{n+1} = u_n + 2n + 1.\\]\nWhat is \\(u_{10}\\)?",
    options: {
      A: "82",
      B: "100",
      C: "101",
      D: "102",
      E: "121"
    },
    answer: "C",
    answerText: "101",
    topicCode: "MM2.1",
    topicName: "Sequences and series: recurrence relations",
    difficulty: "1/4 Easy",
    targetSeconds: 55,
    targetDisplay: "55 s",
    tip: "Recognise 2n + 1 as \\((n + 1)^{2}\\) - \\(n^{2}\\).",
    solution: "The increments 2n + 1 are the differences between consecutive squares. Since \\(u_{1}\\) = \\(1^{2}\\) + 1, it follows\nthat u = \\(n^{2}\\) + 1. Thus \\(u_{10}\\) = 101.",
    distractors: {
      A: "Adds only the odd numbers from 1 to 9 rather than from 3 to 19.",
      B: "Recognises \\(n^{2}\\) but forgets the extra 1.",
      D: "Adds the initial 2 to \\(10^{2}\\) instead of tracking the offset.",
      E: "\\[Uses (n + 1)^{2}.\\]"
    },
    benchmarkNote: "Official 2026 Notes on Mathematics, MM2.1 recurrence and nth-term connection style. [official guide]",
    editorPick: false
  },
  {
    number: 7,
    stem: "A convergent geometric series has positive common ratio and begins\n\\[3 + 3r + 3r^{2} + ... .\\]\nIts sum to infinity is 12. What is the sum of its first two terms?",
    options: {
      A: "3",
      B: "\\(\\frac{15}{4}\\)",
      C: "4",
      D: "\\(\\frac{9}{2}\\)",
      E: "5",
      F: "\\(\\frac{21}{4}\\)"
    },
    answer: "F",
    answerText: "\\(\\frac{21}{4}\\)",
    topicCode: "MM2.3",
    topicName: "Sequences and series: geometric series",
    difficulty: "2/4 Medium",
    targetSeconds: 65,
    targetDisplay: "65 s",
    tip: "Find the common ratio from the infinite sum before using only the terms requested.",
    solution: "3/(1 - r) = 12, so 1 - r = 1/4 and r = 3/4. The first two terms sum to 3 + 9/4 = 21/4.",
    distractors: {
      A: "Reports only the first term.",
      B: "\\[Uses r = \\frac{1}{4}.\\]",
      C: "Adds 3 and the missing amount 1.",
      D: "Uses the second term as 3/2.",
      E: "Rounds 21/4 down or uses r = 2/3."
    },
    benchmarkNote: "ENGAA 2021 Section 1, Q37, compact series evaluation; official 2026 Notes MM2.3. [ENGAA 2021 paper] [official guide]",
    editorPick: false
  },
  {
    number: 8,
    stem: "What is the constant term in the expansion of\n\\[(2x + 1/x)^{4}?\\]",
    options: {
      A: "16",
      B: "24",
      C: "32",
      D: "48",
      E: "96"
    },
    answer: "B",
    answerText: "24",
    topicCode: "MM2.4",
    topicName: "Sequences and series: binomial expansion",
    difficulty: "1/4 Easy",
    targetSeconds: 55,
    targetDisplay: "55 s",
    tip: "Track the power of x before calculating the coefficient.",
    solution: "The general term contains \\(x^{4 - 2r}\\), so the constant term occurs when r = 2. Its coefficient is C(4,2)\n\\[\\times 2^{2} = 6 \\times 4 = 24.\\]",
    distractors: {
      A: "Uses only \\(2^{4}\\) and ignores the binomial coefficient.",
      C: "Uses C(4,1) \\times \\(2^{3}\\), which belongs to a non-constant term.",
      D: "\\[Uses C(4,2) \\times 2^{3}.\\]",
      E: "Multiplies the correct result by the binomial coefficient a second time."
    },
    benchmarkNote: "NSAA 2018 Section 1, Q85, targeted binomial coefficient extraction. [NSAA 2018 paper]",
    editorPick: false
  },
  {
    number: 9,
    stem: "The point Q(4, 2) lies on the circle \\((x - 1)^{2}\\) + \\((y + 2)^{2}\\) = 25.\nWhich is the equation of the tangent at Q?",
    options: {
      A: "\\(3x - 4y = 4\\)",
      B: "\\(4x + 3y = 22\\)",
      C: "\\(3x + 4y = 25\\)",
      D: "\\(4x - 3y = 10\\)",
      E: "\\(3x + 4y = 18\\)",
      F: "\\(4x + 3y = 18\\)",
      G: "\\(3x + 4y = 20\\)"
    },
    answer: "G",
    answerText: "\\(3x + 4y = 20\\)",
    topicCode: "MM3.2",
    topicName: "Coordinate geometry: equation of a circle",
    difficulty: "2/4 Medium",
    targetSeconds: 65,
    targetDisplay: "65 s",
    tip: "Use the radius vector directly as a normal vector to the tangent.",
    solution: "The radius from (1, -2) to Q has direction (3, 4), which is normal to the tangent. Therefore 3(x - 4) + 4(y - 2) = 0, giving 3x + 4y = 20.",
    distractors: {
      A: "Uses the radius direction as the tangent direction.",
      B: "Swaps the normal-vector components.",
      C: "Uses \\(r^{2}\\) = 25 as the line constant.",
      D: "Uses a perpendicular direction but substitutes Q incorrectly.",
      E: "Substitutes the centre rather than Q into 3x + 4y = c.",
      F: "Swaps the components and also uses the wrong constant."
    },
    benchmarkNote: "NSAA 2018 Section 1, Q83, tangent-radius geometry; official 2026 Notes MM3.2-3. [NSAA 2018 paper] [official guide]",
    editorPick: false,
    diagramKey: "m2-2-q09"
  },
  {
    number: 10,
    stem: "The line x = 5 cuts the circle\n\\[(x - 2)^{2} + (y + 1)^{2} = 25\\]\nin a chord. What is the length of the chord?",
    options: {
      A: "4",
      B: "5",
      C: "6",
      D: "8",
      E: "10"
    },
    answer: "D",
    answerText: "8",
    topicCode: "MM3.3",
    topicName: "Coordinate geometry: circle chords",
    difficulty: "2/4 Medium",
    targetSeconds: 60,
    targetDisplay: "60 s",
    tip: "Substitute the fixed coordinate and use both square-root signs.",
    solution: "On x = 5, \\((x - 2)^{2}\\) = 9, so \\((y + 1)^{2}\\) = 16. The endpoints have y = 3 and y = -5, giving chord length 8.",
    distractors: {
      A: "Finds the half-chord and reports it as the full length.",
      B: "Reports the radius.",
      C: "Uses the horizontal distance 3 twice.",
      E: "Assumes the chord is a diameter."
    },
    benchmarkNote: "Official 2026 Notes on Mathematics, MM3.2 circle-coordinate examples and MM3.3 chord property. [official guide]",
    editorPick: false,
    diagramKey: "m2-2-q10"
  },
  {
    number: 11,
    stem: "The two lines y = mx through the origin are tangent to the circle\n\\[(x - 4)^{2} + y^{2} = 4.\\]\nWhat is \\(m^{2}\\)?",
    options: {
      A: "\\(\\frac{1}{3}\\)",
      B: "\\(\\frac{1}{2}\\)",
      C: "1",
      D: "2",
      E: "3"
    },
    answer: "A",
    answerText: "\\(\\frac{1}{3}\\)",
    topicCode: "MM3.2",
    topicName: "Coordinate geometry: tangents to a circle",
    difficulty: "3/4 Hard",
    targetSeconds: 85,
    targetDisplay: "85 s",
    tip: "Tangency turns the substituted intersection equation into a repeated-root quadratic.",
    solution: "Substitute y = mx into the circle: (1 + \\(m^{2}\\))\\(x^{2}\\) - 8x + 12 = 0. Tangency requires discriminant zero, so 64\n- 48(1 + \\(m^{2}\\)) = 0. Hence 16 = \\(48m^{2}\\) and \\(m^{2}\\) = 1/3.",
    distractors: {
      B: "Uses \\(4^{2}\\) instead of the circle's \\(r^{2}\\) = 4 when expanding.",
      C: "Assumes the tangent gradients are \\pm 1 from the sketch.",
      D: "Solves 16 = \\(8m^{2}\\) after losing the factor 1 + \\(m^{2}\\).",
      E: "Finds the reciprocal after rearranging the discriminant equation."
    },
    benchmarkNote: "NSAA 2018 Section 1, Q83, external tangents to a circle; ENGAA 2021 Q11, repeated-root intersection condition. [ENGAA 2021 paper] [NSAA 2018 paper]",
    editorPick: true,
    diagramKey: "m2-2-q11"
  },
  {
    number: 12,
    stem: "In a triangle, two sides of lengths 4 and 5 enclose angle \\theta . The side opposite \\theta has length 3.\nWhat is \\cos \\theta ?",
    options: {
      A: "\\(\\frac{1}{5}\\)",
      B: "\\(\\frac{2}{5}\\)",
      C: "\\(\\frac{3}{5}\\)",
      D: "\\(\\frac{3}{4}\\)",
      E: "\\(\\frac{4}{5}\\)"
    },
    answer: "E",
    answerText: "\\(\\frac{4}{5}\\)",
    topicCode: "MM4.1",
    topicName: "Trigonometry: cosine rule",
    difficulty: "1/4 Easy",
    targetSeconds: 45,
    targetDisplay: "45 s",
    tip: "The side opposite the angle is the one that appears alone on the left of the cosine rule.",
    solution: "By the cosine rule, \\(3^{2}\\) = \\(4^{2}\\) + \\(5^{2}\\) - 2(4)(5)\\cos \\theta . Thus 9 = 41 - 40cos \\theta , so \\cos \\theta = 32/40 = 4/5.",
    distractors: {
      A: "Uses the smallest side divided by the largest as the cosine.",
      B: "Uses 16/40 after omitting \\(5^{2}\\).",
      C: "Uses \\sin \\theta from a 3-4-5 triangle.",
      D: "Uses adjacent/opposite rather than adjacent/hypotenuse in the right triangle."
    },
    benchmarkNote: "Official 2026 Notes on Mathematics, MM4.1 cosine-rule examples; broader diagram-led ESAT trigonometry style. [official guide]",
    editorPick: false,
    diagramKey: "m2-2-q12"
  },
  {
    number: 13,
    stem: "A triangle ABC satisfies A = \\(30^{\\circ}\\), a = 4 and b = 6, where side a is opposite A and side b is opposite B.\nHow many different triangles satisfy these data?",
    options: {
      A: "0",
      B: "1",
      C: "2",
      D: "3"
    },
    answer: "C",
    answerText: "2",
    topicCode: "MM4.1",
    topicName: "Trigonometry: sine rule ambiguous case",
    difficulty: "2/4 Medium",
    targetSeconds: 70,
    targetDisplay: "70 s",
    tip: "In an angle-side-side problem, check both B and \\(180^{\\circ}\\) - B.",
    solution: "The sine rule gives \\sin B = b \\sin A/a = 6(1/2)/4 = 3/4. There is an acute value B and its obtuse\nsupplement. Since the acute B is greater than \\(30^{\\circ}\\), its supplement still leaves A + \\(B < 180\\)^{\\circ}. Both triangles are valid.",
    distractors: {
      A: "Treats b > a as impossible even though B is also larger than A.",
      B: "Keeps only the principal acute value of B.",
      D: "Counts the acute angle, its supplement and a reflected drawing as three different triangles."
    },
    benchmarkNote: "Official 2026 Notes on Mathematics and specification MM4.1, which explicitly includes the ambiguous sine-rule case. [official guide]",
    editorPick: false
  },
  {
    number: 14,
    stem: "How many solutions of\n\\[\\tan x (\\tan^{2}x - 1) = 0\\]\n\\[lie in 0 \\leq x \\leq 2\\pi ?\\]",
    options: {
      A: "1",
      B: "2",
      C: "3",
      D: "4",
      E: "5",
      F: "6",
      G: "7"
    },
    answer: "G",
    answerText: "7",
    topicCode: "MM4.6",
    topicName: "Trigonometry: equations and periodicity",
    difficulty: "3/4 Hard",
    targetSeconds: 80,
    targetDisplay: "80 s",
    tip: "Count endpoints carefully and exclude the vertical asymptotes of \\tan x.",
    solution: "Either \\tan x = 0 or \\tan x = \\pm 1. In the closed interval, \\tan x = 0 at 0, \\pi and 2\\pi , giving three solutions.\nThe equations \\tan x = 1 and \\tan x = -1 give two each, for four more. The undefined points \\pi /2 and 3\\pi /2 are not\nsolutions. Total: 7.",
    distractors: {
      A: "Counts only the factor \\tan x = 0 at x = 0.",
      B: "Counts only the two \\tan x = 1 solutions.",
      C: "Counts \\tan x = 0 but omits both \\pm 1 branches.",
      D: "Counts the \\pm 1 branches but omits \\tan x = 0.",
      E: "Counts two zeros of \\tan and the four \\pm 1 solutions, then loses one branch.",
      F: "Omits one of the equal endpoints 0 or 2\\pi ."
    },
    benchmarkNote: "NSAA 2018 Section 1, Q75, counting all trigonometric solutions in a specified interval. [NSAA 2018 paper]",
    editorPick: true
  },
  {
    number: 15,
    stem: "A sector of radius 3 has perimeter 12. The minor segment between its arc and chord is shaded.\nWhat is the exact shaded area?",
    options: {
      A: "\\(9sin 2\\)",
      B: "\\(9 - 9sin 2\\)",
      C: "\\(9 + (\\frac{9}{2})\\sin 2\\)",
      D: "\\(18 - (\\frac{9}{2})\\sin 2\\)",
      E: "\\(9 - 9sin 1\\)",
      F: "\\(9 - (\\frac{9}{2})\\sin 2\\)"
    },
    answer: "F",
    answerText: "\\(9 - (\\frac{9}{2})\\sin 2\\)",
    topicCode: "MM4.2",
    topicName: "Trigonometry: radians and segments",
    difficulty: "3/4 Hard",
    targetSeconds: 80,
    targetDisplay: "80 s",
    tip: "Use the perimeter to find the arc length before finding the angle.",
    solution: "The arc length is 12 - 2(3) = 6, so the angle is \\theta = 6/3 = 2 radians. The sector area is (1/2)(\\(3^{2}\\))(2) = 9.\nThe triangle area is (1/2)(\\(3^{2}\\))\\sin 2 = (9/2)\\sin 2. Subtracting gives 9 - (9/2)\\sin 2.",
    distractors: {
      A: "Reports twice the triangle area.",
      B: "Omits the factor 1/2 in the triangle area.",
      C: "Adds the triangle to the sector.",
      D: "Uses 18 as the sector area.",
      E: "Halves the angle inside the sine as well as in the triangle formula."
    },
    benchmarkNote: "ENGAA 2021 Section 1, Q27, circular segment area; official specification MM4.2 radian measure. [ENGAA 2021 paper] [specification]",
    editorPick: false,
    diagramKey: "m2-2-q15"
  },
  {
    number: 16,
    stem: "Solve\n\\[log_{2}(x - 1) + log_{2}(x - 3) = 3.\\]",
    options: {
      A: "\\(x = -1 only\\)",
      B: "\\(x = 5 only\\)",
      C: "\\(x = -1 or 5\\)",
      D: "\\(x = 3 or 5\\)",
      E: "no real solution"
    },
    answer: "B",
    answerText: "\\(x = 5 only\\)",
    topicCode: "MM5.2",
    topicName: "Exponentials and logarithms: logarithmic equations",
    difficulty: "2/4 Medium",
    targetSeconds: 70,
    targetDisplay: "70 s",
    tip: "Apply the logarithm domain after solving the algebraic equation.",
    solution: "Combine logs: (x - 1)(x - 3) = 8. Hence \\(x^{2}\\) - 4x - 5 = 0, so x = -1 or 5. The logarithms require \\(x > 3\\), leaving x = 5 only.",
    distractors: {
      A: "Keeps only the algebraic root that makes both \\log arguments negative.",
      C: "Keeps both quadratic roots without checking the domain.",
      D: "Treats the boundary x = 3 as a solution even though \\log 0 is undefined.",
      E: "Rejects both roots after using \\(x > 0\\) rather than \\(x > 3\\)."
    },
    benchmarkNote: "ENGAA 2023 Section 1, Q35, logarithmic equation with a necessary domain check. [ENGAA 2023 paper]",
    editorPick: false
  },
  {
    number: 17,
    stem: "What is the complete solution set of\n\\[4^{x} - 5 \\times 2^{x} + 4 = 0?\\]",
    options: {
      A: "\\(\\{-2, 0\\}\\)",
      B: "\\(\\{0\\}\\)",
      C: "\\(\\{2\\}\\)",
      D: "\\(\\{0, 2\\}\\)",
      E: "\\(\\{1, 4\\}\\)"
    },
    answer: "D",
    answerText: "\\(\\{0, 2\\}\\)",
    topicCode: "MM5.3",
    topicName: "Exponentials and logarithms: reducible exponential equations",
    difficulty: "2/4 Medium",
    targetSeconds: 65,
    targetDisplay: "65 s",
    tip: "When two powers are related, substitute for the smaller base power.",
    solution: "Let u = \\(2^{x}\\) > 0. Then \\(u^{2}\\) - 5u + 4 = 0, so u = 1 or 4. Therefore \\(2^{x}\\) = 1 gives x = 0, and \\(2^{x}\\) = 4 gives x = 2.",
    distractors: {
      A: "Converts u = 4 to x = -2.",
      B: "Keeps only u = 1.",
      C: "Keeps only u = 4.",
      E: "Reports the u-values rather than converting back to x."
    },
    benchmarkNote: "NSAA 2019 Section 1, Q81, reducing an exponential equation to a quadratic. [NSAA 2019 paper]",
    editorPick: false
  },
  {
    number: 18,
    stem: "A quantity is modelled by\n\\[N(t) = 1600 \\times 2^{-t/3}.\\]\nFor what value of t is N(t) = 800?",
    options: {
      A: "3",
      B: "6",
      C: "9",
      D: "12",
      E: "24"
    },
    answer: "A",
    answerText: "3",
    topicCode: "MM5.1",
    topicName: "Exponentials and logarithms: exponential models",
    difficulty: "1/4 Easy",
    targetSeconds: 40,
    targetDisplay: "40 s",
    tip: "Compare the model with its initial value before solving the exponent.",
    solution: "800/1600 = 1/2 = \\(2^{-1}\\). Hence -t/3 = -1, so t = 3.",
    distractors: {
      B: "Treats one halving as two periods.",
      C: "Uses the denominator 3 as a multiplier twice.",
      D: "\\[Uses \\frac{800}{1600} = \\frac{1}{4}.\\]",
      E: "Divides 1600 by the exponent denominator instead of using the ratio."
    },
    benchmarkNote: "Official 2026 Notes on Mathematics, MM5.1 exponential graphs and simple growth-decay models. [official guide]",
    editorPick: false
  },
  {
    number: 19,
    stem: "Given\ny = (\\(x^{3}\\) + 2x)/\\sqrt{x}, find dy/dx when x = 4.",
    options: {
      A: "\\(\\frac{9}{2}\\)",
      B: "10",
      C: "\\(\\frac{21}{2}\\)",
      D: "20",
      E: "\\(\\frac{41}{2}\\)"
    },
    answer: "E",
    answerText: "\\(\\frac{41}{2}\\)",
    topicCode: "MM6.2",
    topicName: "Differentiation: rational powers",
    difficulty: "2/4 Medium",
    targetSeconds: 70,
    targetDisplay: "70 s",
    tip: "Simplify powers before differentiating.",
    solution: "First simplify: y = \\(x^{5/2}\\) + \\(2x^{1/2}\\). Thus dy/dx = (5/2)\\(x^{3/2}\\) + \\(x^{-1/2}\\). At x = 4, this is (5/2)(8) + 1/2 = 41/2.",
    distractors: {
      A: "Substitutes x = 4 before differentiating and differentiates the resulting number.",
      B: "\\[Uses x^{\\frac{3}{2}} = 4.\\]",
      C: "Uses (5/2)(4) + 1/2.",
      D: "Drops the derivative of \\(2x^{1/2}\\)."
    },
    benchmarkNote: "ENGAA 2021 Section 1, Q21, differentiating an expression after index simplification. [ENGAA 2021 paper]",
    editorPick: false
  },
  {
    number: 20,
    stem: "For which values of a is\nf'(x) > 0 for every real x, where\n\\[f(x) = x^{3} + ax^{2} + 3x?\\]",
    options: {
      A: "\\(a < -3\\)",
      B: "\\(a > 3\\)",
      C: "\\(-3 < a < 3\\)",
      D: "\\(a \\leq -3\\) or \\(a \\geq 3\\)",
      E: "\\(-3 \\leq a \\leq 3\\)"
    },
    answer: "C",
    answerText: "\\(-3 < a < 3\\)",
    topicCode: "MM6.3",
    topicName: "Differentiation: strictly increasing functions",
    difficulty: "3/4 Hard",
    targetSeconds: 85,
    targetDisplay: "85 s",
    tip: "A positive quadratic for all real x needs positive leading coefficient and negative discriminant.",
    solution: "f'(x) = \\(3x^{2}\\) + 2ax + 3. This upward-opening quadratic is positive for every real x exactly when it has\nno real roots, so its discriminant is negative: \\((2a)^{2}\\) - 36 < 0. Hence \\(a^{2}\\) < 9, giving -3 < \\(a < 3\\).",
    distractors: {
      A: "Chooses one exterior interval after reversing the discriminant inequality.",
      B: "Chooses the other exterior interval.",
      D: "Uses discriminant \\geq 0 instead of < 0.",
      E: "Includes a = \\pm 3, where f'(x) equals zero at one x and so fails the stated > 0 condition."
    },
    benchmarkNote: "Official 2026 Notes on Mathematics, MM6.3 increasing-function and parameter style; discriminant reasoning calibrated against NSAA 2018 Q77. [NSAA 2018 paper] [official guide]",
    editorPick: false
  },
  {
    number: 21,
    stem: "A particle has displacement\n\\[s(t) = t^{3} - 6t^{2} + 9t\\]\nfor 0 \\leq \\(t \\leq 4\\). At which time or times is its velocity greatest?",
    options: {
      A: "\\(t = 0 only\\)",
      B: "\\(t = 1 only\\)",
      C: "\\(t = 2 only\\)",
      D: "\\(t = 3 only\\)",
      E: "\\(t = 4 only\\)",
      F: "\\(t = 1 and t = 3\\)",
      G: "\\(t = 0 and t = 4\\)"
    },
    answer: "G",
    answerText: "\\(t = 0 and t = 4\\)",
    topicCode: "MM6.3",
    topicName: "Differentiation: rates of change",
    difficulty: "3/4 Hard",
    targetSeconds: 80,
    targetDisplay: "80 s",
    tip: "On a closed interval, a maximum can occur at an endpoint rather than at a stationary point.",
    solution: "Velocity is v(t) = \\(3t^{2}\\) - 12t + 9, an upward-opening quadratic. Its stationary point at t = 2 is a\nminimum, so compare the endpoints: v(0) = 9 and v(4) = 9. The greatest velocity occurs at both t = 0 and t = 4.",
    distractors: {
      A: "Checks the first endpoint but not the second.",
      B: "Uses a zero of velocity rather than its maximum.",
      C: "Assumes every stationary point is a maximum.",
      D: "Uses the other zero of velocity.",
      E: "Checks the second endpoint but not the first.",
      F: "Uses the two times when displacement is stationary."
    },
    benchmarkNote: "Official 2026 Notes on Mathematics, MM6.1 rate interpretation and MM6.3 endpoint-aware optimisation style. [official guide]",
    editorPick: false
  },
  {
    number: 22,
    stem: "It is given that\n\\(\\int _{-1}^{2} f(x) dx = 5\\) and \\(\\int _{4}^{2} f(x) dx = -3.\\)\nWhat is \\int _{-1}^{4} f(x) dx?",
    options: {
      A: "-8",
      B: "-5",
      C: "-2",
      D: "2",
      E: "5",
      F: "8"
    },
    answer: "F",
    answerText: "8",
    topicCode: "MM7.4",
    topicName: "Integration: combining and reversing ranges",
    difficulty: "2/4 Medium",
    targetSeconds: 60,
    targetDisplay: "60 s",
    tip: "Reverse the limits before joining contiguous intervals.",
    solution: "Reversing the second integral gives \\int _{2}^{4} f(x) dx = 3. Therefore \\int _{-1}^{4} f(x) dx = 5 + 3 = 8.",
    distractors: {
      A: "Adds the magnitudes and then keeps the reversed sign.",
      B: "Uses only the first integral and changes its sign.",
      C: "Adds 5 and -3 without reversing the second integral.",
      D: "Subtracts 3 from 5 after recognising the intervals are contiguous.",
      E: "Ignores the second interval."
    },
    benchmarkNote: "NSAA 2019 Section 1, Q83, combining definite integrals with different orientations. [NSAA 2019 paper]",
    editorPick: false
  },
  {
    number: 23,
    stem: "The curve y = (3/2)x(x - 1) is shown from x = 0 to x = 2. The regions between the curve and the x-axis are shaded.\nWhat is the total shaded area?",
    options: {
      A: "1",
      B: "\\(\\frac{3}{2}\\)",
      C: "2",
      D: "\\(\\frac{5}{2}\\)",
      E: "3"
    },
    answer: "B",
    answerText: "\\(\\frac{3}{2}\\)",
    topicCode: "MM7.1",
    topicName: "Integration: total area between curve and axis",
    difficulty: "3/4 Hard",
    targetSeconds: 85,
    targetDisplay: "85 s",
    tip: "Split at every x-intercept and make each geometric contribution positive.",
    solution: "An antiderivative is F(x) = \\(x^{3}\\)/2 - \\(3x^{2}\\)/4. From 0 to 1, the integral is -1/4, so that area is 1/4. From 1\nto 2, the integral is F(2) - F(1) = 1 - (-1/4) = 5/4. The total area is 1/4 + 5/4 = 3/2.",
    distractors: {
      A: "Uses only F(2), the signed integral from 0 to 2.",
      C: "Adds the magnitudes but doubles the smaller region.",
      D: "Adds 5/4 and 5/4, treating the two regions as equal.",
      E: "Omits the factor 1/2 when integrating the leading term."
    },
    benchmarkNote: "ENGAA 2018 Section 1, Q29, exact enclosed area; official MM7.1 distinction between signed integral and geometric area. [ENGAA 2018 paper]",
    editorPick: true,
    diagramKey: "m2-2-q23"
  },
  {
    number: 24,
    stem: "Let\n\\[F(x) = \\int _{0}^{x} (3t^{2} - 12t + 9) dt.\\]\nOn which interval is F decreasing?",
    options: {
      A: "\\(x < 1\\)",
      B: "\\(x > 3\\)",
      C: "\\(x < 1\\) or \\(x > 3\\)",
      D: "\\(1 < x < 3\\)",
      E: "\\(-1 < x < 3\\)"
    },
    answer: "D",
    answerText: "\\(1 < x < 3\\)",
    topicCode: "MM7.3",
    topicName: "Integration: Fundamental Theorem of Calculus",
    difficulty: "2/4 Medium",
    targetSeconds: 70,
    targetDisplay: "70 s",
    tip: "Differentiate the integral by reading off its integrand.",
    solution: "By the Fundamental Theorem, F'(x) = \\(3x^{2}\\) - 12x + 9 = 3(x - 1)(x - 3). This is negative between its\nroots, so F decreases for 1 < \\(x < 3\\).",
    distractors: {
      A: "Uses only the interval to the left of the first root.",
      B: "Uses only the interval to the right of the second root.",
      C: "Selects where the upward-opening derivative is positive.",
      E: "Uses -1 as a root after a sign error in factorisation."
    },
    benchmarkNote: "Official 2026 Notes on Mathematics, MM7.3 Fundamental Theorem examples combined with MM6.3 monotonicity. [official guide]",
    editorPick: false
  },
  {
    number: 25,
    stem: "The graph of y = f(x) has vertical asymptote x = 2 and crosses the x-axis at x = 5, as shown.\nFor y = f(2x + 1), which pair is correct?",
    options: {
      A: "asymptote x = 1/2; root x = 2",
      B: "asymptote x = 3/2; root x = 3",
      C: "asymptote x = 1; root x = 5/2",
      D: "asymptote x = 3; root x = 6",
      E: "asymptote x = 4; root x = 10"
    },
    answer: "A",
    answerText: "asymptote x = 1/2; root x = 2",
    topicCode: "MM8.2",
    topicName: "Graphs of functions: horizontal transformations",
    difficulty: "1/4 Easy",
    targetSeconds: 50,
    targetDisplay: "50 s",
    tip: "Transform important input values by solving the inside equation, not by shifting the picture by inspection.",
    solution: "The asymptote occurs when 2x + 1 = 2, giving x = 1/2. The root occurs when 2x + 1 = 5, giving x = 2.",
    distractors: {
      B: "Adds 1 before dividing both original x-values by 2.",
      C: "Divides the original x-values by 2 but ignores the +1.",
      D: "Adds 1 directly to both original x-values.",
      E: "Multiplies both original x-values by 2."
    },
    benchmarkNote: "Official Pearson ESAT Mathematics 2 specimen and 2026 Notes MM8.2 horizontal-transformation style. [official specimen page]",
    editorPick: false,
    diagramKey: "m2-2-q25"
  },
  {
    number: 26,
    stem: "The graph shown is V-shaped, has vertex (2, -1), and passes through (0, 3).\nWhich is its equation?",
    options: {
      A: "\\(y = |x - 2| - 1\\)",
      B: "\\(y = 2|x + 2| - 1\\)",
      C: "\\(y = |2x - 2| - 1\\)",
      D: "\\(y = 2|x - 2| + 1\\)",
      E: "\\(y = 2|x - 2| - 1\\)"
    },
    answer: "E",
    answerText: "\\(y = 2|x - 2| - 1\\)",
    topicCode: "MM8.1",
    topicName: "Graphs of functions: modulus graphs",
    difficulty: "2/4 Medium",
    targetSeconds: 65,
    targetDisplay: "65 s",
    tip: "Use the vertex to fix the shifts, then one point to fix the stretch.",
    solution: "A modulus graph with vertex (2, -1) has form y = a|x - 2| - 1. Using (0, 3), 3 = 2a - 1, so a = 2. Hence\n\\[y = 2|x - 2| - 1.\\]",
    distractors: {
      A: "Has the correct vertex but slope magnitude 1, so it passes through (0, 1).",
      B: "Places the vertex at (-2, -1).",
      C: "Places the vertex at (1, -1).",
      D: "Places the vertex at (2, 1)."
    },
    benchmarkNote: "Official 2026 Notes on Mathematics, MM8.1 modulus graphs and MM8.2 transformations. [official guide]",
    editorPick: false,
    diagramKey: "m2-2-q26"
  },
  {
    number: 27,
    stem: "How many real solutions does\n\\[|x^{2} - 1| = x + 1\\]\nhave?",
    options: {
      A: "1",
      B: "2",
      C: "3",
      D: "4",
      E: "5"
    },
    answer: "C",
    answerText: "3",
    topicCode: "MM8.7",
    topicName: "Graphs of functions: intersections",
    difficulty: "2/4 Medium",
    targetSeconds: 75,
    targetDisplay: "75 s",
    tip: "Split where the expression inside the modulus changes sign, and respect each region.",
    solution: "\\(For -1 \\leq x \\leq 1, 1 - x^{2} = x + 1, so x(x + 1) = 0\\) and \\(x = -1 or 0. For x \\geq 1, x^{2} - 1 = x + 1, so (x - 2)(x + 1) = 0\\)\nand only x = 2 fits this region. For \\(x < -1\\) the right side is negative, so there are no solutions. Total: 3.",
    distractors: {
      A: "Keeps only the positive solution x = 2.",
      B: "Solves only the central modulus branch.",
      D: "Keeps x = -1 twice, once from each algebraic branch.",
      E: "Counts every algebraic root before checking branch conditions."
    },
    benchmarkNote: "Official 2026 Notes on Mathematics, MM8.1 modulus graphs and MM8.7 graph-intersection interpretation. [official guide]",
    editorPick: true,
    diagramKey: "m2-2-q27"
  }
];
