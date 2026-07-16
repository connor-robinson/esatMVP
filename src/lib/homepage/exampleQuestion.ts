export const HOMEPAGE_EXAMPLE_REVEAL_KEY = "homepage_example_reveal";

export const HOMEPAGE_EXAMPLE_QUESTION = {
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
    { label: "F", text: "200" },
  ] as const,
  correctLabel: "E" as const,
  correctValue: "100",
  explanationMarkdown:
    "The line $2x - y + c = 0$ is tangent to $x^2 + y^2 = 20$, so the distance from the origin equals the radius:\n\n$\\dfrac{|c|}{\\sqrt{5}} = \\sqrt{20} = 2\\sqrt{5}$\n\n$|c| = 10$, so $c^2 = 100$.",
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
