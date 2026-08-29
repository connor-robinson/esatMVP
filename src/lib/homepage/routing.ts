/** Public marketing homepage at `/` (always dark; user theme prefs apply elsewhere). */
export function isMarketingHomepagePath(pathname: string | null | undefined): boolean {
  return pathname === "/" || pathname === "";
}
