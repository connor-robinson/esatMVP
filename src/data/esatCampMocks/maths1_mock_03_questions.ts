import type { EsatCampMockQuestion } from "./types";

/** ESAT Mathematics 1 practice pack, module 2 */
export const MATHS1_MOCK_03_QUESTIONS: EsatCampMockQuestion[] = [
  {
    number: 1,
    stem: "A 3D printer uses 18 g of filament every 30 minutes at a constant rate. How many kilograms of filament does it use in 25 hours?",
    options: {
      A: "0.09 kg",
      B: "0.9 kg",
      C: "9 kg",
      D: "18 kg",
      E: "36 kg",
      F: "900 kg"
    },
    answer: "B",
    answerText: "0.9 kg",
    topicCode: "M1.1",
    topicName: "Units",
    difficulty: "2/4 Medium",
    targetSeconds: 60,
    targetDisplay: "60 s",
    tip: "Convert the time rate first, then convert grams to kilograms.",
    solution: "The printer uses 36 g per hour. In 25 hours it uses 36 \\times 25 = 900 g = 0.9 kg.",
    distractors: {
      A: "Divides by 10 once too many when converting grams to kilograms.",
      C: "Divides grams by 100 instead of 1000.",
      D: "Uses the 18 g figure as if it were kilograms.",
      E: "Reports the hourly rate as a mass in kilograms.",
      F: "Finds 900 g but relabels it as kilograms."
    },
    benchmarkNote: "NSAA 2023, Part A, Q11: efficient conversion within a rate problem.",
    editorPick: false
  },
  {
    number: 2,
    stem: "Water flows at 7200 \\(cm^{3}\\) per minute. What is this rate in litres per second?",
    options: {
      A: "0.002 L/s",
      B: "0.012 L/s",
      C: "0.072 L/s",
      D: "1.2 L/s",
      E: "0.12 L/s",
      F: "7.2 L/s"
    },
    answer: "E",
    answerText: "0.12 L/s",
    topicCode: "M1.2",
    topicName: "Units",
    difficulty: "1/4 Easy",
    targetSeconds: 50,
    targetDisplay: "50 s",
    tip: "Remember that 1000 \\(cm^{3}\\) equals 1 litre.",
    solution: "7200 \\(cm^{3}\\) = 7.2 litres. Dividing by 60 gives 0.12 L/s.",
    distractors: {
      A: "Divides by both 60 and 60 again.",
      B: "Converts 7200 \\(cm^{3}\\) to 0.72 litres before dividing.",
      C: "Divides by 100 instead of 60.",
      D: "Moves the decimal one place too far after dividing.",
      F: "Converts the volume but leaves the rate per minute."
    },
    benchmarkNote: "Official ESAT Mathematics 1 specimen: broader verified unit-conversion style; no close archive item.",
    editorPick: false
  },
  {
    number: 3,
    stem: "Which expression is equal to 4/(\\sqrt{5} - 1)?",
    options: {
      A: "\\(\\sqrt{5} - 1\\)",
      B: "\\((\\sqrt{5} + 1)/4\\)",
      C: "\\(\\sqrt{5} + 1\\)",
      D: "\\(5 + \\sqrt{5}\\)",
      E: "\\(4/(\\sqrt{5} + 1)\\)",
      F: "\\(2 + \\sqrt{5}\\)"
    },
    answer: "C",
    answerText: "\\(\\sqrt{5} + 1\\)",
    topicCode: "M2.11",
    topicName: "Number",
    difficulty: "2/4 Medium",
    targetSeconds: 70,
    targetDisplay: "70 s",
    tip: "Use the conjugate of the denominator.",
    solution: "Multiply top and bottom by \\sqrt{5} + 1. The denominator becomes 5 - 1 = 4, so the expression simplifies to \\sqrt{5} + 1.",
    distractors: {
      A: "Cancels the 4 without changing the sign in the conjugate.",
      B: "Multiplies the denominator by the conjugate but not the numerator.",
      D: "Forgets to divide the expanded numerator by 4.",
      E: "Changes the sign in the denominator without rationalising.",
      F: "Treats \\sqrt{5} as 3 during simplification."
    },
    benchmarkNote: "NSAA 2023, Part A, Q8: exact surd algebra within a short calculation.",
    editorPick: false
  },
  {
    number: 4,
    stem: "What is (6 \\times \\(10^{7}\\))(4 \\times \\(10^{-3}\\))/(8 \\times \\(10^{2}\\)) in standard form?",
    options: {
      A: "\\(3 \\times 10^{-2}\\)",
      B: "\\(3 \\times 10^{-1}\\)",
      C: "3",
      D: "\\(3 \\times 10\\)",
      E: "\\(7.5 \\times 10\\)",
      F: "\\(2.4 \\times 10^{2}\\)",
      G: "\\(3 \\times 10^{2}\\)"
    },
    answer: "G",
    answerText: "\\(3 \\times 10^{2}\\)",
    topicCode: "M2.8",
    topicName: "Number",
    difficulty: "2/4 Medium",
    targetSeconds: 75,
    targetDisplay: "75 s",
    tip: "Handle the number part and the powers of ten separately.",
    solution: "The number part is 6 \\times 4 / 8 = 3. The power is \\(10^{7 - 3 - 2}\\) = \\(10^{2}\\). Therefore the result is 3 \\times \\(10^{2}\\).",
    distractors: {
      A: "Subtracts all exponents without respecting the negative exponent in the numerator.",
      B: "Combines the powers as \\(10^{-1}\\).",
      C: "Cancels all powers of ten.",
      D: "Leaves one power of ten after an exponent error.",
      E: "Divides 6 by 8 before multiplying by 4, but loses the power of ten.",
      F: "Multiplies 6 and 4 but does not divide the coefficient by 8."
    },
    benchmarkNote: "NSAA 2022, Part A, Q10: standard form combined with proportional reasoning.",
    editorPick: false
  },
  {
    number: 5,
    stem: "A positive number x rounds to 3.7 to the nearest 0.1. Which interval contains every possible value of x?",
    options: {
      A: "\\(3.65 \\le x < 3.75\\)",
      B: "\\(3.65 < x \\le 3.75\\)",
      C: "\\(3.6 \\le x < 3.8\\)",
      D: "\\(3.69 \\le x < 3.71\\)",
      E: "\\(3.7 \\le x < 3.8\\)"
    },
    answer: "A",
    answerText: "\\(3.65 \\le x < 3.75\\)",
    topicCode: "M2.13",
    topicName: "Number",
    difficulty: "1/4 Easy",
    targetSeconds: 50,
    targetDisplay: "50 s",
    tip: "The lower endpoint is included and the upper endpoint is excluded.",
    solution: "The half-unit is 0.05. Values from 3.65 up to, but not including, 3.75 round to 3.7.",
    distractors: {
      B: "Reverses which endpoint is included.",
      C: "Uses the displayed precision as the half-width.",
      D: "Uses 0.01 as the rounding half-width.",
      E: "Assumes all possible values must be at least the rounded value."
    },
    benchmarkNote: "Official ESAT Mathematics 1 specimen: broader verified rounding-interval style; no close archive item.",
    editorPick: false
  },
  {
    number: 6,
    stem: "A four-digit code uses each of the digits 1, 2, 3 and 4 exactly once. How many of the possible codes are even?",
    options: {
      A: "4",
      B: "6",
      C: "8",
      D: "12",
      E: "16",
      F: "24"
    },
    answer: "D",
    answerText: "12",
    topicCode: "M2.5",
    topicName: "Number",
    difficulty: "2/4 Medium",
    targetSeconds: 70,
    targetDisplay: "70 s",
    tip: "Choose the restricted final digit first.",
    solution: "The final digit must be 2 or 4, giving 2 choices. The remaining three digits can be arranged in 3! = 6 ways, so there are 2 \\times 6 = 12 codes.",
    distractors: {
      A: "Chooses only the final digit and one arrangement of the others.",
      B: "Counts arrangements after fixing one particular even final digit only.",
      C: "Uses \\(2^{3}\\) for the remaining positions.",
      E: "Uses \\(4^{2}\\) without enforcing that all digits are used once.",
      F: "Counts all 4! codes without restricting the final digit."
    },
    benchmarkNote: "NSAA 2022, Part A, Q17: systematic counting of selections from a small set.",
    editorPick: false
  },
  {
    number: 7,
    stem: "A map has scale 1:25 000. A lake has area 6 \\(cm^{2}\\) on the map. What is its actual area in hectares?",
    options: {
      A: "0.0375 ha",
      B: "0.375 ha",
      C: "3.75 ha",
      D: "15 ha",
      E: "25 ha",
      F: "37.5 ha",
      G: "375 ha"
    },
    answer: "F",
    answerText: "37.5 ha",
    topicCode: "M3.1",
    topicName: "Ratio and proportion",
    difficulty: "3/4 Hard",
    targetSeconds: 90,
    targetDisplay: "90 s",
    tip: "Square a length scale when converting area.",
    solution: "One map centimetre represents 250 m, so 1 \\(cm^{2}\\) represents \\(250^{2}\\) = 62 500 \\(m^{2}\\). Thus 6 \\(cm^{2}\\) represents 375 000 \\(m^{2}\\) = 37.5 hectares.",
    distractors: {
      A: "Uses the length scale and then converts square metres to hectares twice.",
      B: "Misses a factor of 100 in the hectare conversion.",
      C: "Misses a factor of 10 in the final conversion.",
      D: "Uses 2500 \\(m^{2}\\) for each map square centimetre.",
      E: "Uses the map denominator as the answer in hectares.",
      G: "Treats 1000 \\(m^{2}\\) as one hectare."
    },
    benchmarkNote: "ENGAA 2018, Part A, Q13: scale modelling with cubic, rather than linear, conversion.",
    editorPick: true
  },
  {
    number: 8,
    stem: "After a 12% reduction, a jacket costs £176. What was its original price?",
    options: {
      A: "£200",
      B: "£197.12",
      C: "£188",
      D: "£155",
      E: "£211.20"
    },
    answer: "A",
    answerText: "£200",
    topicCode: "M3.8",
    topicName: "Ratio and proportion",
    difficulty: "1/4 Easy",
    targetSeconds: 50,
    targetDisplay: "50 s",
    tip: "Divide by the multiplier 0.88 rather than adding 12%.",
    solution: "The reduced price is 88% of the original, so the original price is 176/0.88 = £200.",
    distractors: {
      B: "Adds 12% of £176 to the reduced price.",
      C: "Adds £12 rather than 12%.",
      D: "Subtracts 12% again.",
      E: "Uses 176 \\times 1.2 instead of reversing the 12% decrease."
    },
    benchmarkNote: "NSAA 2022, Part A, Q5: reverse successive percentage changes.",
    editorPick: false
  },
  {
    number: 9,
    stem: "For positive variables, t is directly proportional to d and inversely proportional to \\(v^{2}\\). When d = 8 and v = 2, t = 6. What is t when d = 15 and v = 5?",
    options: {
      A: "0.72",
      B: "1.2",
      C: "1.5",
      D: "1.8",
      E: "3.0",
      F: "4.5",
      G: "11.25"
    },
    answer: "D",
    answerText: "1.8",
    topicCode: "M3.9",
    topicName: "Ratio and proportion",
    difficulty: "3/4 Hard",
    targetSeconds: 85,
    targetDisplay: "85 s",
    tip: "Put every proportional relationship into one formula.",
    solution: "Write t = kd/\\(v^{2}\\). From 6 = 8k/4, k = 3. Therefore t = 3 \\times 15/25 = 45/25 = 1.8.",
    distractors: {
      A: "Uses v rather than \\(v^{2}\\) and then inverts the final ratio.",
      B: "Uses inverse proportion to v rather than \\(v^{2}\\).",
      C: "Uses k = 2.5 from an incorrect rearrangement.",
      E: "Divides by v rather than \\(v^{2}\\) after finding k.",
      F: "Uses direct proportion to \\(v^{2}\\).",
      G: "Scales t by d and v in the same direction."
    },
    benchmarkNote: "NSAA 2023, Part A, Q14: chained direct and inverse proportion.",
    editorPick: true
  },
  {
    number: 10,
    stem: "A population of 2500 increases by 20% in one year and then decreases by 10% in the next year. What is the population after the two changes?",
    options: {
      A: "2500",
      B: "2700",
      C: "2750",
      D: "2800",
      E: "3000",
      F: "2250"
    },
    answer: "B",
    answerText: "2700",
    topicCode: "M3.11",
    topicName: "Ratio and proportion",
    difficulty: "2/4 Medium",
    targetSeconds: 65,
    targetDisplay: "65 s",
    tip: "Apply percentage changes multiplicatively, in order.",
    solution: "Use successive multipliers: 2500 \\times 1.20 \\times 0.90 = 2500 \\times 1.08 = 2700.",
    distractors: {
      A: "Assumes a 20% rise and 10% fall cancel to no change.",
      C: "Applies a net 10% increase to the original value.",
      D: "Uses an incorrect combined multiplier of 1.12.",
      E: "Applies only the 20% increase.",
      F: "Applies only the 10% decrease."
    },
    benchmarkNote: "ENGAA 2018, Part A, Q17: successive multiplicative percentage changes.",
    editorPick: false
  },
  {
    number: 11,
    stem: "For x \\ne -1 and x \\ne 1, which expression is equal to 1/(x - 1) - 1/(x + 1)?",
    options: {
      A: "0",
      B: "2/(x + 1)",
      C: "2/(x - 1)",
      D: "\\(-2/(x^{2} - 1)\\)",
      E: "\\(2/(x^{2} - 1)\\)",
      F: "\\(1/(x^{2} - 1)\\)"
    },
    answer: "E",
    answerText: "\\(2/(x^{2} - 1)\\)",
    topicCode: "M4.6",
    topicName: "Algebra",
    difficulty: "3/4 Hard",
    targetSeconds: 90,
    targetDisplay: "90 s",
    tip: "Keep brackets around each numerator when subtracting fractions.",
    solution: "Using the common denominator (x - 1)(x + 1), the numerator is (x + 1) - (x - 1) = 2. Hence the result is 2/(\\(x^{2}\\) - 1).",
    distractors: {
      A: "Cancels the two fractions because their numerators match.",
      B: "Cancels x - 1 across a subtraction.",
      C: "Cancels x + 1 across a subtraction.",
      D: "Reverses the subtraction in the combined numerator.",
      F: "Finds the correct denominator but loses the numerator 2."
    },
    benchmarkNote: "NSAA 2022, Part A, Q7: rational-expression simplification with factorised denominators.",
    editorPick: true
  },
  {
    number: 12,
    stem: "A line passes through (2, 5) and is perpendicular to y = 1/2 x - 3. What is the y-intercept of the line?",
    options: {
      A: "-9",
      B: "-1",
      C: "9",
      D: "1",
      E: "5",
      F: "13"
    },
    answer: "C",
    answerText: "9",
    topicCode: "M4.10",
    topicName: "Algebra",
    difficulty: "1/4 Easy",
    targetSeconds: 60,
    targetDisplay: "60 s",
    tip: "Perpendicular gradients multiply to -1.",
    solution: "The perpendicular gradient is -2. Using y - 5 = -2(x - 2) gives y = -2x + 9, so the y-intercept is 9.",
    distractors: {
      A: "Uses the correct magnitude but the wrong intercept sign.",
      B: "Uses only the negative reciprocal as the intercept.",
      D: "Uses the original gradient's reciprocal without its sign.",
      E: "Reports the given point's y-coordinate.",
      F: "Adds rather than subtracts the gradient contribution at x = 2."
    },
    benchmarkNote: "NSAA 2023, Part A, Q12: perpendicular gradients with algebraic coordinates.",
    editorPick: false
  },
  {
    number: 13,
    stem: "The line y = x + 2 meets the circle \\(x^{2}\\) + \\(y^{2}\\) = 20 at two points. What is the positive x-coordinate of an intersection?",
    options: {
      A: "-4",
      B: "-2",
      C: "0",
      D: "1",
      E: "4",
      F: "6",
      G: "2"
    },
    answer: "G",
    answerText: "2",
    topicCode: "M4.15",
    topicName: "Algebra",
    difficulty: "2/4 Medium",
    targetSeconds: 80,
    targetDisplay: "80 s",
    tip: "Substitute the linear equation into the quadratic equation.",
    solution: "Substitute y = x + 2: \\(x^{2}\\) + \\((x + 2)^{2}\\) = 20. This gives \\(x^{2}\\) + 2x - 8 = 0, so (x + 4)(x - 2) = 0. The positive x-coordinate is 2.",
    distractors: {
      A: "Chooses the negative intersection.",
      B: "Uses the negative of the line's constant term.",
      C: "Assumes the circle meets the line on the y-axis.",
      D: "Halves the positive root.",
      E: "Uses the magnitude of the negative root.",
      F: "Adds the magnitudes of the two roots."
    },
    benchmarkNote: "NSAA 2023, Part A, Q8: a short quadratic created from another algebraic condition.",
    editorPick: true
  },
  {
    number: 14,
    stem: "The formula E = \\(mv^{2}\\)/2 is used with m = 3 and v = 4. What is E?",
    options: {
      A: "6",
      B: "8",
      C: "12",
      D: "16",
      E: "48",
      F: "24"
    },
    answer: "F",
    answerText: "24",
    topicCode: "M4.3",
    topicName: "Algebra",
    difficulty: "1/4 Easy",
    targetSeconds: 50,
    targetDisplay: "50 s",
    tip: "Square v before multiplying by m.",
    solution: "E = 3 \\times \\(4^{2}\\) / 2 = 3 \\times 16 / 2 = 24.",
    distractors: {
      A: "Calculates mv/2 without squaring v.",
      B: "Calculates \\(v^{2}\\)/2 and omits m.",
      C: "Squares v, subtracts m, then halves approximately.",
      D: "Reports \\(v^{2}\\) only.",
      E: "Calculates \\(mv^{2}\\) but forgets to divide by 2."
    },
    benchmarkNote: "ENGAA 2018, Part A, Q20: direct substitution into a contextual formula.",
    editorPick: false
  },
  {
    number: 15,
    stem: "The line y = 4x + k is tangent to the parabola y = \\(x^{2}\\). What is k?",
    options: {
      A: "-16",
      B: "-8",
      C: "-4",
      D: "0",
      E: "4",
      F: "8"
    },
    answer: "C",
    answerText: "-4",
    topicCode: "M4.16",
    topicName: "Algebra",
    difficulty: "3/4 Hard",
    targetSeconds: 90,
    targetDisplay: "90 s",
    tip: "A tangent gives a quadratic with exactly one repeated solution.",
    solution: "At an intersection, \\(x^{2}\\) = 4x + k, so \\(x^{2}\\) - 4x - k = 0. Tangency means one repeated root, so the discriminant is 16 + 4k = 0. Hence k = -4.",
    distractors: {
      A: "Sets the discriminant to 16 rather than zero.",
      B: "Uses \\(b^{2}\\) + 2ac instead of \\(b^{2}\\) - 4ac.",
      D: "Assumes the standard parabola is tangent only to a line through the origin.",
      E: "Loses the negative sign when solving for k.",
      F: "Halves the wrong term in the discriminant equation."
    },
    benchmarkNote: "NSAA 2022, Part A, Q14: using root structure to determine a quadratic parameter.",
    editorPick: true
  },
  {
    number: 16,
    stem: "What are the coordinates of the minimum point of y = \\((x - 2)^{2}\\) - 3?",
    options: {
      A: "(-2, -3)",
      B: "(2, 3)",
      C: "(-2, 3)",
      D: "(3, -2)",
      E: "(2, -3)",
      F: "(0, 1)"
    },
    answer: "E",
    answerText: "(2, -3)",
    topicCode: "M4.11",
    topicName: "Algebra",
    difficulty: "2/4 Medium",
    targetSeconds: 65,
    targetDisplay: "65 s",
    tip: "Read the turning point directly from completed-square form.",
    solution: "The square is smallest when x - 2 = 0, so x = 2. Then y = -3. The minimum point is (2, -3).",
    distractors: {
      A: "Uses x = -2 instead of x = 2.",
      B: "Changes the sign of the vertical shift.",
      C: "Changes both shift signs.",
      D: "Swaps the coordinate values.",
      F: "Substitutes x = 0 and reports that point instead of the minimum."
    },
    benchmarkNote: "NSAA 2022, Part A, Q20: interpreting the minimum point of a family of quadratics.",
    editorPick: false
  },
  {
    number: 17,
    stem: "In kite ABCD, AB = AD and CB = CD. Which congruence criterion proves that triangles ABC and ADC are congruent?",
    options: {
      A: "SSS",
      B: "SAS",
      C: "ASA",
      D: "RHS",
      E: "No standard criterion applies"
    },
    answer: "A",
    answerText: "SSS",
    topicCode: "M5.4",
    topicName: "Geometry",
    difficulty: "1/4 Easy",
    targetSeconds: 50,
    targetDisplay: "50 s",
    tip: "Remember to include the shared side AC.",
    solution: "AB = AD, BC = DC, and AC is common to both triangles. All three corresponding sides are equal, so SSS applies.",
    distractors: {
      B: "Uses two side pairs but assumes an equal included angle without proving it.",
      C: "No pair of equal angles is given initially.",
      D: "There is no given right angle or hypotenuse information.",
      E: "Misses that AC is a common third side."
    },
    benchmarkNote: "Official ESAT Mathematics 1 specimen: broader verified short congruence style; no close archive item.",
    editorPick: false,
    diagramKey: "m1-3-q17"
  },
  {
    number: 18,
    stem: "Each exterior angle of a regular polygon is \\(24^{\\circ}\\). How many sides does the polygon have?",
    options: {
      A: "8",
      B: "10",
      C: "12",
      D: "15",
      E: "18",
      F: "24"
    },
    answer: "D",
    answerText: "15",
    topicCode: "M5.2",
    topicName: "Geometry",
    difficulty: "2/4 Medium",
    targetSeconds: 70,
    targetDisplay: "70 s",
    tip: "For a regular polygon, number of sides equals 360 divided by one exterior angle.",
    solution: "The exterior angles sum to \\(360^{\\circ}\\), so the number of sides is 360/24 = 15.",
    distractors: {
      A: "Uses 180/24 and rounds up.",
      B: "Subtracts the exterior angle from 180, then uses the wrong relationship.",
      C: "Uses 360/30 after confusing \\(24^{\\circ}\\) with a nearby standard angle.",
      E: "Uses 180/10 after an interior-angle detour.",
      F: "Reports the angle itself as the number of sides."
    },
    benchmarkNote: "NSAA 2022, Part A, Q18: linked interior angles of regular polygons.",
    editorPick: false
  },
  {
    number: 19,
    stem: "The plan shows stacks of identical cubes. Each number is the height of a stack. Viewed from the south, what are the visible maximum heights from left to right?",
    options: {
      A: "2, 1, 4",
      B: "2, 3, 4",
      C: "1, 3, 2",
      D: "4, 3, 2",
      E: "3, 4, 2",
      F: "4, 1, 2"
    },
    answer: "B",
    answerText: "2, 3, 4",
    topicCode: "M5.12",
    topicName: "Geometry",
    difficulty: "2/4 Medium",
    targetSeconds: 75,
    targetDisplay: "75 s",
    tip: "For each line of sight, keep only the tallest stack.",
    solution: "Looking north from the south, each visible column shows the greater height in its north-south pair. The maxima are max(2,1), max(1,3), max(4,2) = 2, 3, 4.",
    distractors: {
      A: "Reads only the north row.",
      C: "Reads only the south row.",
      D: "Finds the correct maxima but reverses their order.",
      E: "Takes maxima along rows instead of viewing columns.",
      F: "Mixes the two rows without taking maxima."
    },
    benchmarkNote: "Official ESAT Mathematics 1 specimen: broader verified plans-and-elevations style; no close archive item.",
    editorPick: false,
    diagramKey: "m1-3-q19"
  },
  {
    number: 20,
    stem: "A running track is formed from a rectangle with a semicircle at each end. Its total length is 14 m and each semicircle has radius 3 m. What is the perimeter?",
    options: {
      A: "\\(14 + 3\\pi m\\)",
      B: "\\(16 + 3\\pi m\\)",
      C: "\\(14 + 6\\pi m\\)",
      D: "\\(22 + 3\\pi m\\)",
      E: "\\(22 + 6\\pi m\\)",
      F: "\\(28 + 6\\pi m\\)",
      G: "\\(16 + 6\\pi m\\)"
    },
    answer: "G",
    answerText: "\\(16 + 6\\pi m\\)",
    topicCode: "M5.15",
    topicName: "Geometry",
    difficulty: "2/4 Medium",
    targetSeconds: 75,
    targetDisplay: "75 s",
    tip: "Subtract both radii from the total length to get one straight section.",
    solution: "The two semicircles form a full circle, contributing 6\\pi m. The straight part has length 14 - 2(3) = 8 m, and there are two such sides. The perimeter is 16 + 6\\pi m.",
    distractors: {
      A: "Uses the full 14 m twice incorrectly and only one semicircle arc.",
      B: "Finds the straight sections correctly but includes only one semicircle arc.",
      C: "Uses the full total length as the straight contribution.",
      D: "Adds the diameter to the straight contribution and includes only one semicircle.",
      E: "Uses 11 m for each straight section.",
      F: "Counts the total length twice without removing the rounded ends."
    },
    benchmarkNote: "Official ESAT Mathematics 1 specimen: broader verified composite-shape mensuration style; no close archive item.",
    editorPick: false,
    diagramKey: "m1-3-q20"
  },
  {
    number: 21,
    stem: "The points A(2, 1) and B(6, 5) are joined. At what x-coordinate does the perpendicular bisector of AB cross the x-axis?",
    options: {
      A: "-1",
      B: "1",
      C: "3",
      D: "4",
      E: "5",
      F: "7",
      G: "9"
    },
    answer: "F",
    answerText: "7",
    topicCode: "M5.10",
    topicName: "Geometry",
    difficulty: "2/4 Medium",
    targetSeconds: 85,
    targetDisplay: "85 s",
    tip: "A perpendicular bisector needs both the midpoint and the negative reciprocal gradient.",
    solution: "The midpoint is (4, 3). AB has gradient 1, so the perpendicular gradient is -1. Its equation is y - 3 = -(x - 4), or y = -x + 7. At y = 0, x = 7.",
    distractors: {
      A: "Uses the perpendicular gradient as the x-intercept.",
      B: "Uses the original gradient as the intercept.",
      C: "Reports the midpoint's y-coordinate.",
      D: "Reports the midpoint's x-coordinate.",
      E: "Uses the y-coordinate of B.",
      G: "Adds both midpoint coordinates and the gradient incorrectly."
    },
    benchmarkNote: "ENGAA 2018, Part A, Q5 and NSAA 2023, Part A, Q12: line gradients constrained by parallel or perpendicular geometry.",
    editorPick: false
  },
  {
    number: 22,
    stem: "A right square-based pyramid has base side 12 cm and vertical height TO = 6 cm. O is the centre of the base and C is a base vertex. What is the sloping edge TC?",
    options: {
      A: "6 cm",
      B: "\\(6\\sqrt{2} cm\\)",
      C: "12 cm",
      D: "\\(6\\sqrt{3} cm\\)",
      E: "\\(12\\sqrt{2} cm\\)",
      F: "18 cm"
    },
    answer: "D",
    answerText: "\\(6\\sqrt{3} cm\\)",
    topicCode: "M5.7",
    topicName: "Geometry",
    difficulty: "2/4 Medium",
    targetSeconds: 80,
    targetDisplay: "80 s",
    tip: "Find the half-diagonal of the square base before using Pythagoras.",
    solution: "The centre-to-vertex distance is half the square's diagonal: OC = 6\\sqrt{2} cm. Then \\(TC^{2}\\) = \\(TO^{2}\\) + \\(OC^{2}\\) = 36 + 72 = 108, so TC = 6\\sqrt{3} cm.",
    distractors: {
      A: "Uses only the vertical height.",
      B: "Uses OC as the final answer.",
      C: "Uses a half-base and the height but misses the second horizontal dimension.",
      E: "Uses the full base diagonal instead of the half-diagonal.",
      F: "Adds the height and base side directly."
    },
    benchmarkNote: "NSAA 2022, Part A, Q2: compact multi-stage Pythagorean geometry.",
    editorPick: false,
    diagramKey: "m1-3-q22"
  },
  {
    number: 23,
    stem: "A set of seven numbers has median 8 and range 12. An eighth number, 30, is added. Which measures must increase?",
    options: {
      A: "The mean and range only",
      B: "The mean only",
      C: "The range only",
      D: "The mean and median only",
      E: "The median and range only",
      F: "The mean, median and range"
    },
    answer: "A",
    answerText: "The mean and range only",
    topicCode: "M6.3",
    topicName: "Statistics",
    difficulty: "3/4 Hard",
    targetSeconds: 90,
    targetDisplay: "90 s",
    tip: "Ask what is forced, not what is merely possible.",
    solution: "The old maximum is at most 20 because the median is 8 and the range is 12. Thus 30 is a new maximum, so the range increases. Every old value is at most 20, so the old mean is below 30 and adding 30 increases the mean. The median may stay at 8 or increase, so it is not forced to increase.",
    distractors: {
      B: "Misses that 30 must exceed the old maximum.",
      C: "Misses that adding a value above every old value must raise the mean.",
      D: "Assumes the median must increase and misses the range.",
      E: "Assumes the median must increase and misses the mean.",
      F: "Assumes the new middle pair must have an average above 8."
    },
    benchmarkNote: "NSAA 2023, Part A, Q4: combining constraints on mean, median and mode.",
    editorPick: true
  },
  {
    number: 24,
    stem: "The scatter graph shows practice time and score. Which statement is best supported?",
    options: {
      A: "There is no correlation.",
      B: "There is negative correlation.",
      C: "Removing the isolated point would weaken the positive correlation.",
      D: "The graph proves that extra practice causes a higher score.",
      E: "There is positive correlation, and removing the isolated point would strengthen it.",
      F: "A line of best fit must pass through the origin."
    },
    answer: "E",
    answerText: "There is positive correlation, and removing the isolated point would strengthen it.",
    topicCode: "M6.4",
    topicName: "Statistics",
    difficulty: "2/4 Medium",
    targetSeconds: 65,
    targetDisplay: "65 s",
    tip: "Describe the trend, then test how the outlier affects it.",
    solution: "Most points follow an upward trend, so the correlation is positive. The isolated point at high practice time and low score works against that trend, so removing it would strengthen the correlation. Correlation alone does not prove causation.",
    distractors: {
      A: "Ignores the clear upward pattern among most points.",
      B: "Lets the isolated point dominate the overall direction.",
      C: "Reverses the effect of the isolated point.",
      D: "Confuses correlation with proof of causation.",
      F: "Assumes a line of best fit has a compulsory intercept."
    },
    benchmarkNote: "Official ESAT Mathematics 1 specimen: broader verified scatter-graph interpretation style; no close archive item.",
    editorPick: false,
    diagramKey: "m1-3-q24"
  },
  {
    number: 25,
    stem: "In a group of 60 students, 35 study Physics, 20 study Music, and 12 study both. One student is chosen at random from those who study Physics. What is the probability that the student also studies Music?",
    options: {
      A: "\\(1/5\\)",
      B: "\\(12/35\\)",
      C: "\\(3/5\\)",
      D: "\\(4/7\\)",
      E: "\\(23/60\\)",
      F: "\\(7/12\\)"
    },
    answer: "B",
    answerText: "\\(12/35\\)",
    topicCode: "M7.7",
    topicName: "Probability",
    difficulty: "2/4 Medium",
    targetSeconds: 75,
    targetDisplay: "75 s",
    tip: "After 'from those who', change the denominator to that restricted group.",
    solution: "The sample space is now the 35 Physics students. Of these, 12 also study Music, so the conditional probability is 12/35.",
    distractors: {
      A: "Uses 12/60, the probability from the whole group.",
      C: "Uses 12/20, conditioning on Music instead of Physics.",
      D: "Uses 20/35, treating every Music student as a Physics student.",
      E: "Uses the number studying Physics only over the whole group.",
      F: "Inverts the required conditional probability."
    },
    benchmarkNote: "NSAA 2023, Part A, Q20: conditional probability after dependent information.",
    editorPick: false
  },
  {
    number: 26,
    stem: "A fair six-sided die is rolled twice. What is the probability that the product of the two scores is even?",
    options: {
      A: "\\(1/4\\)",
      B: "\\(1/2\\)",
      C: "\\(3/4\\)",
      D: "\\(5/6\\)",
      E: "\\(2/3\\)"
    },
    answer: "C",
    answerText: "\\(3/4\\)",
    topicCode: "M7.6",
    topicName: "Probability",
    difficulty: "1/4 Easy",
    targetSeconds: 55,
    targetDisplay: "55 s",
    tip: "The complement is quicker than listing all 36 outcomes.",
    solution: "The product is odd only if both scores are odd. That probability is 3/6 \\times 3/6 = 1/4. Therefore the probability of an even product is 1 - 1/4 = 3/4.",
    distractors: {
      A: "Finds the probability of an odd product and forgets to take the complement.",
      B: "Assumes even and odd products are equally likely.",
      D: "Counts only outcomes containing a 1 as odd.",
      E: "Adds the chance of an even score on each die without handling overlap."
    },
    benchmarkNote: "NSAA 2022, Part A, Q4: a non-standard but finite two-dice sample space.",
    editorPick: false
  },
  {
    number: 27,
    stem: "A, B and C lie on a circle. The line through A is tangent to the circle. The angle between the tangent and chord AB is \\(42^{\\circ}\\), and angle BAC is \\(17^{\\circ}\\). What is angle ABC?",
    options: {
      A: "\\(17^{\\circ}\\)",
      B: "\\(42^{\\circ}\\)",
      C: "\\(59^{\\circ}\\)",
      D: "\\(79^{\\circ}\\)",
      E: "\\(96^{\\circ}\\)",
      F: "\\(121^{\\circ}\\)",
      G: "\\(138^{\\circ}\\)"
    },
    answer: "F",
    answerText: "\\(121^{\\circ}\\)",
    topicCode: "M5.9",
    topicName: "Geometry",
    difficulty: "3/4 Hard",
    targetSeconds: 90,
    targetDisplay: "90 s",
    tip: "Use the tangent-chord angle to create an angle inside the triangle.",
    solution: "By the alternate segment theorem, angle ACB equals the angle between the tangent and chord AB, so angle ACB = \\(42^{\\circ}\\). Therefore angle ABC = \\(180^{\\circ}\\) - \\(42^{\\circ}\\) - \\(17^{\\circ}\\) = \\(121^{\\circ}\\).",
    distractors: {
      A: "Copies angle BAC.",
      B: "Copies the tangent-chord angle.",
      C: "Adds the two known angles instead of subtracting from \\(180^{\\circ}\\).",
      D: "Subtracts \\(42^{\\circ}\\) and \\(59^{\\circ}\\) from \\(180^{\\circ}\\) after double-counting \\(17^{\\circ}\\).",
      E: "Assumes the other two angles are both \\(42^{\\circ}\\).",
      G: "Subtracts only \\(42^{\\circ}\\) from \\(180^{\\circ}\\)."
    },
    benchmarkNote: "ENGAA 2018, Part A, Q21: alternate-segment and circle-angle reasoning. 7. Final validation The following tables are generated directly from the final question data. Topic coverage Difficulty distribution Correct-option distribution Validation checks Checked: 27 questions in each module and 54 questions in total Checked: All seven M1 to M7 topic families represented in each module Checked: Every estimated solution time is 90 seconds or less Checked: Exactly one keyed option for every question Checked: No repeated option text within a question Checked: Correct options balanced across A to G without a repeating sequence Checked: Candidate papers separated from solutions and distractor maps Checked: Every calibration note names a verified source style or explicitly states that no close archive item exists Mathematical verification notes are encoded in each concise solution. Final structural and render checks are performed when the document is built.",
    editorPick: true,
    diagramKey: "m1-3-q27"
  }
];
