export const HOMEPAGE_EXAMPLE_REVEAL_KEY = "homepage_example_reveal";

export const HOMEPAGE_EXAMPLE_QUESTION = {
  id: "camera-distance-graph",
  promptMarkdown:
    "A person of fixed height moves away from a stationary camera with fixed zoom. Which curve could show their image height $H$ against distance $d$ from the camera?",
  options: [
    { label: "A", text: "Reciprocal decay" },
    { label: "B", text: "Linear decrease" },
    { label: "C", text: "Rapid exponential decay" },
    { label: "D", text: "Increasing curve" },
  ] as const,
  correctLabel: "A" as const,
  correctValue: "A",
  explanationMarkdown:
    "With a fixed camera, image height is inversely proportional to distance: $H \\propto \\dfrac{1}{d}$.\n\nCurve A decreases steeply at first, stays positive, and approaches zero without reaching it.",
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
