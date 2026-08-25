/** Yield so React can paint a loading overlay before heavy async work. */
export function allowLoadingPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}
