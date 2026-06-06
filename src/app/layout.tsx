import type { Metadata } from "next";
import { Suspense } from "react";
import { EB_Garamond, Space_Grotesk } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { SupabaseSessionProvider } from "@/components/auth/SupabaseSessionProvider";
import { createServerClient } from "@/lib/supabase/server";
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
import { UsernameGate } from "@/components/auth/UsernameGate";
import { BRAND_CONFIG } from "@/config/brand";
import { buildCssVariables } from "@/config/theme";
import "@/styles/globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-eb-garamond",
  display: "swap",
});

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: BRAND_CONFIG.fullTitle,
  description:
    "Prepare for the ESAT and TMUA with past papers, question banks, and structured practice. The ESAT Guide helps you build speed and strategy for admissions exams.",
  keywords: [...BRAND_CONFIG.keywords],
  icons: {
    icon: [
      { url: "/brand/favicon-dark.png", media: "(prefers-color-scheme: dark)" },
    ],
    apple: [
      {
        url: "/brand/apple-icon-dark.png",
        media: "(prefers-color-scheme: dark)",
      },
    ],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const darkVars = buildCssVariables("dark");
  const lightVars = buildCssVariables("light");
  const supabase = createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${ebGaramond.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var darkVars = ${JSON.stringify(darkVars)};
                  var lightVars = ${JSON.stringify(lightVars)};
                  var vars = theme === 'light' ? lightVars : darkVars;
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

        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#0a0a0a" />
      </head>
      <body className="min-h-screen bg-background text-text antialiased font-sans">
        <SupabaseSessionProvider initialSession={session}>
          <ErrorBoundary>
            <ThemeProvider>
              <LoadingProvider>
                <QuicklinkProvider>
                  <ServiceWorkerProvider />
                  <BackgroundPrefetcher />
                  <KaTeXLoader />
                  <SessionRestore />
                  <SessionPersistenceHandler />
                  <Navbar />
                  <main className="min-h-full">
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
                </QuicklinkProvider>
              </LoadingProvider>
            </ThemeProvider>
          </ErrorBoundary>
        </SupabaseSessionProvider>
      </body>
    </html>
  );
}



