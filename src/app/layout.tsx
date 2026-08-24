import type { Metadata } from "next";
import { Suspense } from "react";
import { EB_Garamond, Space_Grotesk } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { SupabaseSessionProvider } from "@/components/auth/SupabaseSessionProvider";
import { BackgroundPrefetcher } from "@/components/shared/BackgroundPrefetcher";
import { QuicklinkProvider } from "@/components/shared/QuicklinkProvider";
import { LoadingProvider } from "@/components/shared/LoadingProvider";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { ServiceWorkerProvider } from "@/components/shared/ServiceWorkerProvider";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { KaTeXLoader } from "@/components/shared/KaTeXLoader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { SessionRestore } from "@/components/papers/SessionRestore";
import { SessionPersistenceHandler } from "@/components/papers/SessionPersistenceHandler";
import { SiteVisitMarker } from "@/components/shared/SiteVisitMarker";
import { DeferredMount } from "@/components/shared/DeferredMount";
import { UsernameGate } from "@/components/auth/UsernameGate";
import { GoogleOneTap } from "@/components/auth/GoogleOneTap";
import { TesterProgrammeProvider } from "@/contexts/TesterProgrammeContext";
import { TesterProgrammeBanner } from "@/components/tester/TesterProgrammeBanner";
import { BRAND_CONFIG } from "@/config/brand";
import { buildCssVariables, LIGHT_MODE_STRATEGY_STORAGE_KEY } from "@/config/theme";
import { PRODUCTION_SITE_URL } from "@/lib/seo/config";
import {
  AnalyticsConsentProvider,
  CookieConsentBanner,
  GoogleAnalytics,
  PageViewTracker,
} from "@/components/ga";
import { SiteFooter } from "@/components/layout/SiteFooter";
import "@/styles/globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-eb-garamond",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(PRODUCTION_SITE_URL),
  title: BRAND_CONFIG.fullTitle,
  description:
    "Prepare for the ESAT and TMUA with past papers, question banks, and structured practice. ESAT CAMP helps you build speed and strategy for admissions exams.",
  keywords: [...BRAND_CONFIG.keywords],
  icons: {
    icon: [
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
      { url: "/brand/favicon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    siteName: BRAND_CONFIG.displayName,
    title: BRAND_CONFIG.fullTitle,
    description:
      "Prepare for the ESAT and TMUA with past papers, a curated question bank and timed no-calculator drills.",
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND_CONFIG.fullTitle,
    description:
      "Prepare for the ESAT and TMUA with past papers, a curated question bank and timed no-calculator drills.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const darkVars = buildCssVariables("dark");
  const lightVarsDesigned = buildCssVariables("light", "designed");
  const lightVarsInverted = buildCssVariables("light", "inverted");
  // Do not await auth here: cookies()/getSession() would force every route
  // dynamic and block the marketing homepage. Client provider hydrates session.

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`dark ${spaceGrotesk.variable} ${ebGaramond.variable}`}
    >
      <head>
        <link
          rel="preload"
          href="/brand/logo-mark.png"
          as="image"
          type="image/png"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var lightStrategy = localStorage.getItem('${LIGHT_MODE_STRATEGY_STORAGE_KEY}');
                  if (lightStrategy !== 'designed' && lightStrategy !== 'inverted') {
                    lightStrategy = 'inverted';
                  }
                  var darkVars = ${JSON.stringify(darkVars)};
                  var lightVarsDesigned = ${JSON.stringify(lightVarsDesigned)};
                  var lightVarsInverted = ${JSON.stringify(lightVarsInverted)};
                  var vars = darkVars;
                  if (theme === 'light') {
                    vars = lightStrategy === 'designed' ? lightVarsDesigned : lightVarsInverted;
                  }
                  Object.keys(vars).forEach(function(name) {
                    document.documentElement.style.setProperty(name, vars[name]);
                  });
                  document.documentElement.style.setProperty('--subj-maths', 'var(--color-maths)');
                  document.documentElement.style.setProperty('--subj-physics', 'var(--color-physics)');
                  document.documentElement.style.setProperty('--subj-chem', 'var(--color-chemistry)');
                  document.documentElement.style.setProperty('--subj-bio', 'var(--color-biology)');
                  document.documentElement.style.setProperty('--subj-interview', 'var(--color-secondary)');
                  if (theme === 'light' || theme === 'dark') {
                    document.documentElement.classList.add(theme);
                    document.documentElement.classList.remove(theme === 'light' ? 'dark' : 'light');
                  } else {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
            body { 
              margin: 0; 
              background: var(--color-background, #0e0f13); 
              color: var(--color-text, #e5e7eb); 
              font-family: var(--font-space-grotesk), "Space Grotesk", system-ui, -apple-system, sans-serif;
            }
            .loading { 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              min-height: 100vh; 
            }
            .animate-pulse {
              animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          `,
          }}
        />

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className="flex min-h-screen flex-col bg-background text-text antialiased font-sans">
        <SupabaseSessionProvider initialSession={null}>
          <ErrorBoundary>
            <ThemeProvider>
              <AnalyticsConsentProvider>
                <LoadingProvider>
                  <QuicklinkProvider>
                    <SiteVisitMarker />
                    <CookieConsentBanner />
                    <TesterProgrammeProvider>
                      <Navbar />
                      <main className="min-h-full flex-1">
                        <UsernameGate>
                          <Suspense
                            fallback={
                              <div className="min-h-screen flex items-center justify-center">
                                <LoadingSpinner size="md" />
                              </div>
                            }
                          >
                            {children}
                          </Suspense>
                        </UsernameGate>
                      </main>
                      <SiteFooter />
                      <DeferredMount delayMs={1800}>
                        <GoogleOneTap />
                        <GoogleAnalytics />
                        <ServiceWorkerProvider />
                        <BackgroundPrefetcher />
                        <KaTeXLoader />
                        <SessionRestore />
                        <SessionPersistenceHandler />
                        <TesterProgrammeBanner />
                        <Suspense fallback={null}>
                          <PageViewTracker />
                        </Suspense>
                      </DeferredMount>
                    </TesterProgrammeProvider>
                  </QuicklinkProvider>
                </LoadingProvider>
              </AnalyticsConsentProvider>
            </ThemeProvider>
          </ErrorBoundary>
        </SupabaseSessionProvider>
      </body>
    </html>
  );
}



