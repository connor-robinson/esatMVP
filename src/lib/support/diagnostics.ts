/** Client-side diagnostic context for support tickets (no secrets). */

export type SupportDiagnostics = {
  pageUrl: string;
  userAgent: string;
  viewport: string;
  platform: string;
  appVersion: string;
  submittedAt: string;
};

export function collectSupportDiagnostics(): SupportDiagnostics {
  const nav = typeof navigator !== "undefined" ? navigator : null;
  const win = typeof window !== "undefined" ? window : null;

  const width = win?.innerWidth ?? 0;
  const height = win?.innerHeight ?? 0;
  const dpr =
    typeof win?.devicePixelRatio === "number" ? win.devicePixelRatio : 1;

  const platformParts = [
    nav?.platform || null,
    typeof nav?.maxTouchPoints === "number" && nav.maxTouchPoints > 0
      ? "touch"
      : null,
    typeof (nav as Navigator & { userAgentData?: { mobile?: boolean } })
      ?.userAgentData?.mobile === "boolean"
      ? (nav as Navigator & { userAgentData?: { mobile?: boolean } })
          .userAgentData?.mobile
        ? "mobile"
        : "desktop"
      : null,
  ].filter(Boolean);

  const appVersion =
    (typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_VERCEL_ENV?.trim()) ||
    (typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_APP_VERSION?.trim()) ||
    "0.1.0";

  return {
    pageUrl: win?.location?.href?.slice(0, 1000) ?? "",
    userAgent: (nav?.userAgent ?? "").slice(0, 500),
    viewport: `${width}x${height}@${dpr}`.slice(0, 64),
    platform: platformParts.join("; ").slice(0, 120),
    appVersion: String(appVersion).slice(0, 64),
    submittedAt: new Date().toISOString(),
  };
}
