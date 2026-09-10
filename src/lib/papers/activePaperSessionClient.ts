/** Routes that show the paper itself, where the main navbar stays hidden. */
const PAPER_IMMERSIVE_ROUTES = [
  '/past-papers/solve',
  '/past-papers/mark',
  '/past-papers/submit',
  '/past-papers/pearson-demo',
  '/exam-tools/calibration/math-1/test',
];

/**
 * True while the user is actually inside the paper. Everywhere else the main
 * navbar must stay usable, even with a session running.
 */
export function isPaperImmersiveRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  if (
    pathname === "/past-papers/solve/start" ||
    pathname.startsWith("/past-papers/solve/start/")
  ) {
    return false;
  }
  return PAPER_IMMERSIVE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/** Pearson chrome should hide site nav/footer even without a saved session. */
export function isPearsonChromeRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === "/pearson" || pathname.startsWith("/pearson/")) return true;
  if (
    pathname === "/exam-tools/calibration/math-1/test" ||
    pathname.startsWith("/exam-tools/calibration/math-1/test/")
  ) {
    return true;
  }
  return (
    pathname === "/past-papers/pearson-demo" ||
    pathname.startsWith("/past-papers/pearson-demo/")
  );
}

export function shouldHideSiteChromeForPaper(
  pathname: string | null,
  _hasActiveSession = false,
): boolean {
  if (isPearsonChromeRoute(pathname)) return true;
  return isPaperImmersiveRoute(pathname);
}
