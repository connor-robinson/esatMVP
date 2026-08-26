import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_POST_AUTH_PATH,
  FIRST_RUN_POST_ONBOARDING_PATH,
  buildOnboardingUrl,
  dashboardLoginUrl,
  resolvePostAuthPath,
  resolvePostOnboardingPath,
  sanitizeRedirectTo,
} from "@/lib/onboarding/redirect";
import { APP_ROUTES } from "@/lib/seo/config";
import {
  SITEMAP_EXCLUDED_PATHS,
  isPublicSitemapPath,
} from "@/lib/seo/publicSitemap";

const ROOT = path.resolve(__dirname, "../..");

function readSrc(...segments: string[]) {
  return readFileSync(path.join(ROOT, ...segments), "utf8");
}

describe("post-auth redirect defaults", () => {
  it("defaults missing or unsafe redirectTo to /dashboard", () => {
    expect(DEFAULT_POST_AUTH_PATH).toBe("/dashboard");
    expect(sanitizeRedirectTo(null)).toBe("/dashboard");
    expect(sanitizeRedirectTo(undefined)).toBe("/dashboard");
    expect(sanitizeRedirectTo("")).toBe("/dashboard");
    expect(sanitizeRedirectTo("https://evil.test")).toBe("/dashboard");
    expect(sanitizeRedirectTo("//evil.test")).toBe("/dashboard");
    expect(sanitizeRedirectTo("/login")).toBe("/dashboard");
    expect(sanitizeRedirectTo("/signup?x=1")).toBe("/dashboard");
    expect(sanitizeRedirectTo("/onboarding")).toBe("/dashboard");
    expect(sanitizeRedirectTo("/auth/callback")).toBe("/dashboard");
  });

  it("sends first-time users to calibration after onboarding", () => {
    expect(resolvePostOnboardingPath("/dashboard")).toBe(
      FIRST_RUN_POST_ONBOARDING_PATH,
    );
    expect(resolvePostOnboardingPath(null)).toBe(FIRST_RUN_POST_ONBOARDING_PATH);
    expect(resolvePostOnboardingPath("/access/success")).toBe("/access/success");
    expect(resolvePostOnboardingPath("/questions")).toBe("/questions");
  });

  it("preserves explicit public homepage and app paths", () => {
    expect(sanitizeRedirectTo("/")).toBe("/");
    expect(sanitizeRedirectTo("/dashboard")).toBe("/dashboard");
    expect(sanitizeRedirectTo("/dashboard?reveal_example=1")).toBe(
      "/dashboard?reveal_example=1",
    );
    expect(sanitizeRedirectTo("/past-papers/library")).toBe(
      "/past-papers/library",
    );
  });

  it("returns users to /dashboard after auth when setup is complete", () => {
    expect(
      resolvePostAuthPath(
        { username: "alex", onboarding_completed: true },
        "",
      ),
    ).toBe("/dashboard");
    expect(
      resolvePostAuthPath(
        { username: "alex", onboarding_completed: true },
        "/dashboard",
      ),
    ).toBe("/dashboard");
  });

  it("keeps intended /dashboard through onboarding when setup is incomplete", () => {
    expect(
      resolvePostAuthPath(
        { username: null, onboarding_completed: false },
        "/dashboard",
      ),
    ).toBe(buildOnboardingUrl("/dashboard"));
    expect(buildOnboardingUrl("/dashboard")).toContain(
      encodeURIComponent("/dashboard"),
    );
  });

  it("completes partner /access claim before onboarding for incomplete profiles", () => {
    expect(
      resolvePostAuthPath(
        { username: null, onboarding_completed: false },
        "/access/complete",
      ),
    ).toBe("/access/complete");
    expect(
      resolvePostAuthPath(
        { username: null, onboarding_completed: false },
        "/access/ARKWRIGHT26",
      ),
    ).toBe("/access/ARKWRIGHT26");
    expect(
      resolvePostAuthPath(
        { username: null, onboarding_completed: false },
        "/access/success",
      ),
    ).toBe("/access/success");
  });

  it("UsernameGate and middleware both exempt /access from the setup lock", () => {
    const gate = readSrc("components", "auth", "UsernameGate.tsx");
    const middleware = readSrc("middleware.ts");
    expect(gate).toContain('pathname?.startsWith("/access")');
    expect(middleware).toContain("path.startsWith('/access')");
    expect(middleware).toMatch(/needsSetup && !onOnboarding && !onAccess/);
  });

  it("builds a login URL that returns to /dashboard", () => {
    expect(dashboardLoginUrl()).toBe(
      "/login?redirectTo=%2Fdashboard",
    );
    expect(dashboardLoginUrl("signup")).toBe(
      "/login?mode=signup&redirectTo=%2Fdashboard",
    );
  });
});

describe("homepage vs dashboard route ownership", () => {
  it("keeps / as marketing-only with no auth swap to the dashboard", () => {
    const homePage = readSrc("app", "page.tsx");
    const homeContent = readSrc(
      "components",
      "homepage",
      "HomePageContent.tsx",
    );

    expect(homePage).toContain("HomePageContent");
    expect(homePage).toMatch(/index:\s*true/);
    expect(homePage).toContain('canonical: buildCanonicalUrl("/")');
    expect(homeContent).toContain("MarketingHomepage");
    expect(homeContent).not.toContain("LoggedInHomepage");
    expect(homeContent).not.toContain("useHomepageState");
  });

  it("hosts the authenticated dashboard at /dashboard with auth gate", () => {
    const dashboardPage = readSrc("app", "dashboard", "page.tsx");
    const dashboardContent = readSrc(
      "components",
      "homepage",
      "DashboardPageContent.tsx",
    );
    const dashboardLayout = readSrc("app", "dashboard", "layout.tsx");

    expect(dashboardPage).toContain("DashboardPageContent");
    expect(dashboardPage).toContain("getSession");
    expect(dashboardPage).toContain("redirectTo");
    expect(dashboardPage).toContain("/login");
    expect(dashboardContent).toContain("LoggedInHomepage");
    expect(dashboardContent).toContain("useHomepageState");
    expect(dashboardLayout).toContain("noIndexFollowMetadata");
  });

  it("uses the brand logo as dashboard when logged in, homepage when logged out", () => {
    const navbar = readSrc("components", "layout", "Navbar.tsx");
    expect(navbar).toContain("DEFAULT_POST_AUTH_PATH");
    expect(navbar).toContain("logoHref");
    expect(navbar).toContain("BrandNavLockup");
    expect(navbar).not.toMatch(/>\s*Dashboard\s*</);
  });

  it("points practice CTAs and legacy overview redirects at /dashboard", () => {
    expect(readSrc("app", "pricing", "success", "page.tsx")).toContain(
      'href="/dashboard"',
    );
    expect(readSrc("app", "founding-tester", "page.tsx")).toContain(
      'href="/dashboard"',
    );
    expect(readSrc("app", "train", "overview", "page.tsx")).toContain(
      "DEFAULT_POST_AUTH_PATH",
    );
    expect(readSrc("app", "mental-maths", "overview", "page.tsx")).toContain(
      "DEFAULT_POST_AUTH_PATH",
    );
    expect(
      readSrc("components", "home", "ExampleQuestionDemo.tsx"),
    ).toContain("redirectTo=%2Fdashboard%3Freveal_example%3D1");
    expect(readSrc("app", "login", "page.tsx")).toContain(
      "DEFAULT_POST_AUTH_PATH",
    );
  });

  it("keeps /dashboard out of the public sitemap and APP_ROUTES aligned", () => {
    expect(APP_ROUTES.dashboard).toBe("/dashboard");
    expect(SITEMAP_EXCLUDED_PATHS).toContain("/dashboard");
    expect(isPublicSitemapPath("/dashboard")).toBe(false);
    expect(isPublicSitemapPath("/")).toBe(true);
  });
});

describe("partner / premium / founding-tester access remains dashboard-owned", () => {
  it("reuses LoggedInHomepage for access-state UI instead of duplicating it", () => {
    const dashboardContent = readSrc(
      "components",
      "homepage",
      "DashboardPageContent.tsx",
    );
    const loggedIn = readSrc(
      "components",
      "homepage",
      "LoggedInHomepage.tsx",
    );

    expect(dashboardContent).toContain("LoggedInHomepage");
    expect(loggedIn).toContain("TesterAccessStatus");
    expect(loggedIn).toContain("UpgradePrompt");
    expect(loggedIn).toContain("PrimaryActionCard");
    expect(loggedIn).toContain("TopicHub");
  });
});
