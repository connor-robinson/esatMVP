import { shouldHideSiteChromeForPaper } from "@/lib/papers/activePaperSessionClient";

const HIDDEN_PREFIXES = [
  "/login",
  "/signup",
  "/auth",
  "/onboarding",
  "/pearson",
];

/**
 * Where the floating Help launcher may appear for signed-in users.
 */
export function shouldShowSupportLauncher(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === "/") return false;
  if (shouldHideSiteChromeForPaper(pathname)) return false;
  if (
    HIDDEN_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return false;
  }
  return true;
}
