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

function isPastPapersMarkPath(pathname: string): boolean {
  return (
    pathname === "/past-papers/mark" ||
    pathname.startsWith("/past-papers/mark/")
  );
}

/**
 * Where the floating Help launcher may appear for signed-in users.
 */
export function shouldShowSupportLauncher(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === "/") return false;
  // Mark is immersive (no site chrome) but still needs Help; solve/submit stay hidden.
  if (isPastPapersMarkPath(pathname)) return true;
  if (shouldHideSiteChromeForPaper(pathname)) return false;
  if (
    HIDDEN_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return false;
  }
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return false;
  }
  return true;
}
