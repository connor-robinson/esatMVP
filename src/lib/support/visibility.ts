import { shouldHideSiteChromeForPaper } from "@/lib/papers/activePaperSessionClient";

const HIDDEN_PREFIXES = [
  "/login",
  "/signup",
  "/auth",
  "/onboarding",
  "/pearson",
  "/access",
  "/mental-maths/drill",
  // Question bank session chrome has its own report control above Next;
  // the floating Help launcher sits on top of the footer Next button.
  "/questions/questionbank",
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
