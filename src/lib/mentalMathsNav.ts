export const MENTAL_MATHS_DRILL_HREF = "/mental-maths/drill";
export const MENTAL_MATHS_DRILL_HOME_EVENT = "esat:mental-maths-drill-home";

export function requestMentalMathsDrillHome() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(MENTAL_MATHS_DRILL_HOME_EVENT));
}

export function isMentalMathsDrillPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return (
    pathname === MENTAL_MATHS_DRILL_HREF ||
    pathname.startsWith(`${MENTAL_MATHS_DRILL_HREF}/`)
  );
}
