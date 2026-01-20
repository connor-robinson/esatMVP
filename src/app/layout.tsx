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
import { ThemeProvider } from "@/contexts/ThemeContext";
import { KaTeXLoader } from "@/components/shared/KaTeXLoader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "CantabPrep | Premium ESAT & TMUA Mastery",
  description:
    "Master the ESAT & TMUA. Secure your Cambridge offer. The non-calculator, high-pressure entrance exams demand more than just knowledge. Master the speed and strategy required for the 2024-25 cycle.",
  keywords: ["mental math", "ESAT", "TMUA", "Cambridge", "entrance exams", "no calculator", "CantabPrep"],
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
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
                  <KaTeXLoader />
                  <Navbar />
                  <main className="min-h-full">
                    <Suspense
                      fallback={
                        <div className="min-h-screen flex items-center justify-center">
                          <LoadingSpinner size="md" />
                        </div>
                      }
                    >
                      {children}
                    </Suspense>
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



