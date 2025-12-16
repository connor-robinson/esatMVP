import type { Metadata } from "next";
import { Suspense } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { SupabaseSessionProvider } from "@/components/auth/SupabaseSessionProvider";
import { createServerClient } from "@/lib/supabase/server";
import { BackgroundPrefetcher } from "@/components/shared/BackgroundPrefetcher";
import { QuicklinkProvider } from "@/components/shared/QuicklinkProvider";
import { LoadingProvider } from "@/components/shared/LoadingProvider";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { ServiceWorkerProvider } from "@/components/shared/ServiceWorkerProvider";
import { BuildBadge } from "@/components/shared/BuildBadge";
import { PerformanceMonitor } from "@/components/shared/PerformanceMonitor";
import { ThemeProvider } from "@/contexts/ThemeContext";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "No-Calc Trainer | Master Mental Math",
  description:
    "Train for non-calculator exams like ESAT and TMUA. Build speed and accuracy with gamified practice sessions.",
  keywords: ["mental math", "ESAT", "TMUA", "math training", "no calculator"],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <html lang="en">
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
            body { 
              margin: 0; 
              background: #0a0a0a; 
              color: #ffffff; 
              font-family: system-ui, -apple-system, sans-serif;
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
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#0a0a0a" />
      </head>
      <body className="min-h-screen bg-background text-neutral-100 antialiased font-sans">
        <SupabaseSessionProvider initialSession={session}>
          <ErrorBoundary>
            <ThemeProvider>
              <LoadingProvider>
                <QuicklinkProvider>
                  <ServiceWorkerProvider />
                  <BackgroundPrefetcher />
                  <Navbar />
                  <main className="min-h-full">
                    <Suspense
                      fallback={
                        <div className="min-h-screen flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      }
                    >
                      {children}
                    </Suspense>
                  </main>
                  <BuildBadge />
                  <PerformanceMonitor />
                </QuicklinkProvider>
              </LoadingProvider>
            </ThemeProvider>
          </ErrorBoundary>
        </SupabaseSessionProvider>
      </body>
    </html>
  );
}



