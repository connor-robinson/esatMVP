export const HOMEPAGE_EXAMPLE_REVEAL_KEY = "homepage_example_reveal";

export const HOMEPAGE_EXAMPLE_QUESTION = {
  id: "camera-distance-graph",
  promptMarkdown: [
    "A person of fixed height stands directly in front of a camera.",
    "",
    "They move further away from the camera. The camera position and zoom do not change.",
    "",
    "Which labelled curve could show the height $H$ of their image in the photo against distance $d$ from the camera?",
  ].join("\n"),
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
