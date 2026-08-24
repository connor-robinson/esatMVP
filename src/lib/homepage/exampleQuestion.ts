export const HOMEPAGE_EXAMPLE_REVEAL_KEY = "homepage_example_reveal";

export type ExampleOptionFeedback = {
  headline: string;
  bodyMarkdown: string;
  primaryAction: "try_again" | "harder";
};

export type HomepageExampleQuestion = {
  id: string;
  promptMarkdown: string;
  options: readonly { label: string; text: string }[];
  correctLabel: string;
  correctValue: string;
  explanationMarkdown: string;
  feedbackByLabel: Record<string, ExampleOptionFeedback>;
};

/** First question shown on the marketing homepage demo. */
export const HOMEPAGE_STARTER_QUESTION: HomepageExampleQuestion = {
  id: "photo-border",
  promptMarkdown: [
    "A photograph is 12 cm by 18 cm.",
    "",
    "A border of equal width is added around all four sides. The total area of the photograph and border is twice the area of the photograph.",
    "",
    "What is the width of the border?",
  ].join("\n"),
  options: [
    { label: "A", text: "1.5 cm" },
    { label: "B", text: "2 cm" },
    { label: "C", text: "3 cm" },
    { label: "D", text: "4 cm" },
    { label: "E", text: "6 cm" },
  ] as const,
  correctLabel: "C",
  correctValue: "3 cm",
  explanationMarkdown: [
    "Area of the photograph: $12 \\times 18 = 216$.",
    "",
    "Total area with border: $2 \\times 216 = 432$.",
    "",
    "If the border width is $w$ cm, then",
    "",
    "$(12 + 2w)(18 + 2w) = 432$",
    "",
    "$216 + 60w + 4w^2 = 432$",
    "",
    "$4w^2 + 60w - 216 = 0$",
    "",
    "$w^2 + 15w - 54 = 0$",
    "",
    "$(w + 18)(w - 3) = 0$",
    "",
    "So $w = 3$ (taking the positive root).",
  ].join("\n"),
  feedbackByLabel: {
    A: {
      headline: "Not quite.",
      bodyMarkdown: [
        "A 1.5 cm border is too narrow.",
        "",
        "With width $w$, the outer rectangle is $(12 + 2w)$ by $(18 + 2w)$, and that area must equal $432$.",
        "",
        "Solving gives $w = 3$ cm.",
        "",
        "The correct answer is **3 cm**.",
      ].join("\n"),
      primaryAction: "try_again",
    },
    B: {
      headline: "Not quite.",
      bodyMarkdown: [
        "A 2 cm border is close, but still too small.",
        "",
        "Check: outer size would be $16 \\times 22 = 352$, which is less than twice the photograph ($432$).",
        "",
        "The correct answer is **3 cm**.",
      ].join("\n"),
      primaryAction: "try_again",
    },
    C: {
      headline: "Correct!",
      bodyMarkdown: [
        "Area of the photograph: $12 \\times 18 = 216$.",
        "",
        "Total area needed: $2 \\times 216 = 432$.",
        "",
        "With border width $w$:",
        "",
        "$(12 + 2w)(18 + 2w) = 432$",
        "",
        "which simplifies to $w^2 + 15w - 54 = 0$, so $w = 3$.",
        "",
        "Nice one. Ready for something harder?",
      ].join("\n"),
      primaryAction: "harder",
    },
    D: {
      headline: "Not quite.",
      bodyMarkdown: [
        "A 4 cm border is too wide.",
        "",
        "Outer size would be $20 \\times 26 = 520$, which is more than twice the photograph ($432$).",
        "",
        "The correct answer is **3 cm**.",
      ].join("\n"),
      primaryAction: "try_again",
    },
    E: {
      headline: "Not quite.",
      bodyMarkdown: [
        "A 6 cm border is much too wide.",
        "",
        "Outer size would be $24 \\times 30 = 720$, well above twice the photograph ($432$).",
        "",
        "The correct answer is **3 cm**.",
      ].join("\n"),
      primaryAction: "try_again",
    },
  },
};

/**
 * Harder follow-up: laser / circle geometry (third step in the homepage demo).
 */
export const HOMEPAGE_HARDER_QUESTION: HomepageExampleQuestion = {
  id: "laser-exclusion-zone",
  promptMarkdown: [
    "A laser beam follows the line $y = 2x + c$.",
    "",
    "For safety, it must just touch the edge of a circular exclusion zone centred at the origin with equation:",
    "",
    "$x^2 + y^2 = 20$",
    "",
    "What is $c^2$?",
  ].join("\n"),
  options: [
    { label: "A", text: "20" },
    { label: "B", text: "40" },
    { label: "C", text: "60" },
    { label: "D", text: "80" },
    { label: "E", text: "100" },
  ] as const,
  correctLabel: "E",
  correctValue: "100",
  explanationMarkdown:
    "The line $2x - y + c = 0$ is tangent to $x^2 + y^2 = 20$, so the distance from the origin equals the radius:\n\n$\\dfrac{|c|}{\\sqrt{5}} = \\sqrt{20} = 2\\sqrt{5}$\n\n$|c| = 10$, so $c^2 = 100$.",
  feedbackByLabel: {
    A: {
      headline: "Not quite.",
      bodyMarkdown: [
        "20 is the value under the square root in $x^2 + y^2 = 20$, not $c^2$.",
        "",
        "Use the tangent condition: distance from the origin to the line equals the radius.",
        "",
        "The correct answer is **100**.",
      ].join("\n"),
      primaryAction: "try_again",
    },
    B: {
      headline: "Not quite.",
      bodyMarkdown: [
        "40 is a common near-miss if the radius algebra is unfinished.",
        "",
        "From $\\dfrac{|c|}{\\sqrt{5}} = 2\\sqrt{5}$, you get $|c| = 10$, so $c^2 = 100$.",
        "",
        "The correct answer is **100**.",
      ].join("\n"),
      primaryAction: "try_again",
    },
    C: {
      headline: "Not quite.",
      bodyMarkdown: [
        "60 does not satisfy the tangent condition for this circle and line.",
        "",
        "The correct answer is **100**.",
      ].join("\n"),
      primaryAction: "try_again",
    },
    D: {
      headline: "Not quite.",
      bodyMarkdown: [
        "80 is close in magnitude but not the value of $c^2$.",
        "",
        "The correct answer is **100**.",
      ].join("\n"),
      primaryAction: "try_again",
    },
    E: {
      headline: "Correct!",
      bodyMarkdown: [
        "The line $2x - y + c = 0$ is tangent to $x^2 + y^2 = 20$, so",
        "",
        "$\\dfrac{|c|}{\\sqrt{5}} = \\sqrt{20} = 2\\sqrt{5}$",
        "",
        "$|c| = 10$, hence $c^2 = 100$.",
        "",
        "Sign up to unlock the full question bank and keep practising.",
      ].join("\n"),
      primaryAction: "try_again",
    },
  },
};

/** @deprecated Prefer HOMEPAGE_STARTER_QUESTION / HOMEPAGE_HARDER_QUESTION */
export const HOMEPAGE_EXAMPLE_QUESTION = HOMEPAGE_HARDER_QUESTION;

/**
 * Harder follow-up in the homepage demo (average-speed trap question).
 * The laser question remains available after signup via the reveal modal.
 */
export const HOMEPAGE_SPEED_QUESTION: HomepageExampleQuestion = {
  id: "average-speed-lap",
  promptMarkdown: [
    "A car travels half a lap at $120$ km/h and the other half at $180$ km/h.",
    "",
    "What is the car's average speed for the whole lap?",
  ].join("\n"),
  options: [
    { label: "A", text: "144 km/h" },
    { label: "B", text: "150 km/h" },
    { label: "C", text: "152 km/h" },
    { label: "D", text: "160 km/h" },
    { label: "E", text: "180 km/h" },
  ] as const,
  correctLabel: "A",
  correctValue: "144 km/h",
  explanationMarkdown: [
    "The car spends more time travelling at $120$ km/h than at $180$ km/h, so you cannot simply average the two speeds.",
    "",
    "For a $360$ km lap:",
    "",
    "First $180$ km: $180/120 = 1.5$ hours",
    "",
    "Second $180$ km: $180/180 = 1$ hour",
    "",
    "Average speed $= 360 / 2.5 = 144$ km/h.",
  ].join("\n"),
  feedbackByLabel: {
    A: {
      headline: "Correct!",
      bodyMarkdown: [
        "The car spends more time travelling at $120$ km/h than at $180$ km/h, so you cannot simply average the two speeds.",
        "",
        "For a $360$ km lap:",
        "",
        "First $180$ km: $180/120 = 1.5$ hours",
        "",
        "Second $180$ km: $180/180 = 1$ hour",
        "",
        "So:",
        "",
        "Average speed $= \\dfrac{360}{2.5} = 144$ km/h",
        "",
        "Nice one. Ready for something harder? Sign up to unlock the laser question and the full bank.",
      ].join("\n"),
      primaryAction: "try_again",
    },
    B: {
      headline: "Not quite. This is the tempting answer.",
      bodyMarkdown: [
        "$150$ km/h is the average of $120$ and $180$:",
        "",
        "$\\dfrac{120 + 180}{2} = 150$",
        "",
        "But that only works if the car spends the same amount of time at each speed.",
        "",
        "Here, it travels the same distance at each speed, so it spends longer at $120$ km/h.",
        "",
        "The correct answer is $144$ km/h.",
      ].join("\n"),
      primaryAction: "try_again",
    },
    C: {
      headline: "Not quite.",
      bodyMarkdown: [
        "The average speed must account for how long the car spends at each speed.",
        "",
        "For a $360$ km lap, the two halves take:",
        "",
        "$180/120 = 1.5$ h",
        "",
        "and",
        "",
        "$180/180 = 1$ h",
        "",
        "So the whole lap takes $2.5$ hours:",
        "",
        "$360/2.5 = 144$ km/h",
        "",
        "The correct answer is $144$ km/h.",
      ].join("\n"),
      primaryAction: "try_again",
    },
    D: {
      headline: "Not quite.",
      bodyMarkdown: [
        "It might seem reasonable for the average to be closer to $180$ km/h, but the car spends more time on the slower half of the lap.",
        "",
        "Using a $360$ km lap:",
        "",
        "Total time $= 1.5 + 1 = 2.5$ h",
        "",
        "so:",
        "",
        "Average speed $= \\dfrac{360}{2.5} = 144$ km/h",
        "",
        "The correct answer is $144$ km/h.",
      ].join("\n"),
      primaryAction: "try_again",
    },
    E: {
      headline: "Not quite.",
      bodyMarkdown: [
        "$180$ km/h is the car's speed for only half of the lap.",
        "",
        "Since the other half is travelled at $120$ km/h, the overall average must be below $180$ km/h.",
        "",
        "Accounting for the time spent on both halves gives:",
        "",
        "Average speed $= 144$ km/h",
      ].join("\n"),
      primaryAction: "try_again",
    },
  },
};

export function markHomepageExampleRevealPending() {
  try {
    sessionStorage.setItem(HOMEPAGE_EXAMPLE_REVEAL_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function consumeHomepageExampleRevealPending(): boolean {
  try {
    const pending = sessionStorage.getItem(HOMEPAGE_EXAMPLE_REVEAL_KEY) === "1";
    if (pending) sessionStorage.removeItem(HOMEPAGE_EXAMPLE_REVEAL_KEY);
    return pending;
  } catch {
    return false;
  }
}
