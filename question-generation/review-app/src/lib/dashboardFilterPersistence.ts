/** Persist homepage (/) filter query string across reload and return from /review. */

export const DASHBOARD_FILTERS_STORAGE_KEY = "review-dashboard-query";

const EPHEMERAL_KEYS = new Set(["_cb"]);

export function stripEphemeralSearchParams(params: URLSearchParams): URLSearchParams {
  const out = new URLSearchParams();
  params.forEach((value, key) => {
    if (!EPHEMERAL_KEYS.has(key)) out.set(key, value);
  });
  return out;
}

export function hasMeaningfulDashboardFilters(params: URLSearchParams): boolean {
  const p = stripEphemeralSearchParams(params);
  if (p.get("paperType")) return true;
  if (p.get("subjects")) return true;
  if (p.get("difficulties")) return true;
  if (p.get("status")) return true;
  if (p.get("hasVideo") === "1") return true;
  if (p.get("schemaReclass") === "1") return true;
  const sort = p.get("sort");
  if (sort && sort !== "updated_desc") return true;
  const page = parseInt(p.get("page") ?? "1", 10);
  if (Number.isFinite(page) && page > 1) return true;
  return false;
}

export function persistDashboardQuery(params: URLSearchParams): void {
  if (typeof window === "undefined") return;
  try {
    const qs = stripEphemeralSearchParams(params).toString();
    if (qs) sessionStorage.setItem(DASHBOARD_FILTERS_STORAGE_KEY, qs);
    else sessionStorage.removeItem(DASHBOARD_FILTERS_STORAGE_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadPersistedDashboardQuery(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DASHBOARD_FILTERS_STORAGE_KEY);
    return raw?.trim() ? raw.trim() : null;
  } catch {
    return null;
  }
}

export function clearPersistedDashboardQuery(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(DASHBOARD_FILTERS_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function dashboardHomeHref(): string {
  const qs = loadPersistedDashboardQuery();
  return qs ? `/?${qs}` : "/";
}
