"use client";

import React from "react";
import { motion } from "framer-motion";
import { cleanupLegacyEsatServiceWorkers } from "@/lib/sw/legacyCleanup";
import { trackEvent } from "@/lib/ga/trackEvent";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  referenceCode?: string;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{
    error: Error;
    resetError: () => void;
    referenceCode?: string;
  }>;
}

function readBuildId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const nextData = (window as unknown as { __NEXT_DATA__?: { buildId?: string } })
      .__NEXT_DATA__;
    if (nextData?.buildId) return String(nextData.buildId);
  } catch {
    /* ignore */
  }
  const meta = document.querySelector('meta[name="next-build-id"]');
  if (meta?.getAttribute("content")) return meta.getAttribute("content")!;
  return "unknown";
}

function isChunkLoadError(error: Error): boolean {
  return (
    error.name === "ChunkLoadError" ||
    /loading chunk [\w-]+ failed/i.test(error.message) ||
    /Failed to fetch dynamically imported module/i.test(error.message) ||
    /Importing a module script failed/i.test(error.message)
  );
}

function makeReferenceCode(error: Error): string {
  const raw = `${error.name}|${error.message}|${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  }
  return `EC-${hash.toString(36).toUpperCase().slice(0, 8)}`;
}

function reportBoundaryError(input: {
  error: Error;
  errorInfo?: React.ErrorInfo;
  referenceCode: string;
  recovered: boolean;
}) {
  if (typeof window === "undefined") return;

  const pathname = window.location?.pathname || "";
  const buildId = readBuildId();
  const payload = {
    referenceCode: input.referenceCode,
    name: input.error.name,
    message: String(input.error.message || "").slice(0, 500),
    stack: String(input.error.stack || "").slice(0, 2000),
    componentStack: String(input.errorInfo?.componentStack || "").slice(0, 2000),
    pathname,
    buildId,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    recovered: input.recovered,
  };

  // Structured console report (picked up by Vercel / browser tooling).
  // Do not include tokens, cookies, emails, or answers.
  console.error("[ErrorBoundary]", payload);

  try {
    trackEvent("client_error_boundary", {
      error_name: input.error.name.slice(0, 80),
      pathname: pathname.slice(0, 120),
      build_id: buildId.slice(0, 64),
      reference_code: input.referenceCode,
      recovered: input.recovered ? 1 : 0,
    });
  } catch {
    /* analytics optional */
  }
}

function chunkReloadStorageKey(buildId: string): string {
  return `app-chunk-reload:${buildId}`;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, referenceCode: makeReferenceCode(error) };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const referenceCode =
      this.state.referenceCode || makeReferenceCode(error);

    if (isChunkLoadError(error) && typeof window !== "undefined") {
      const buildId = readBuildId();
      const reloadKey = chunkReloadStorageKey(buildId);
      let alreadyReloaded = false;
      try {
        alreadyReloaded = window.sessionStorage.getItem(reloadKey) === "1";
      } catch {
        alreadyReloaded = false;
      }

      if (!alreadyReloaded) {
        reportBoundaryError({
          error,
          errorInfo,
          referenceCode,
          recovered: true,
        });
        try {
          window.sessionStorage.setItem(reloadKey, "1");
        } catch {
          /* private mode */
        }
        void cleanupLegacyEsatServiceWorkers()
          .catch(() => undefined)
          .finally(() => {
            window.location.reload();
          });
        return;
      }

      try {
        window.sessionStorage.removeItem(reloadKey);
      } catch {
        /* ignore */
      }
    }

    reportBoundaryError({
      error,
      errorInfo,
      referenceCode,
      recovered: false,
    });
    this.setState({ error, errorInfo, referenceCode });
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      referenceCode: undefined,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error!}
            resetError={this.resetError}
            referenceCode={this.state.referenceCode}
          />
        );
      }

      return (
        <DefaultErrorFallback
          error={this.state.error!}
          resetError={this.resetError}
          referenceCode={this.state.referenceCode}
        />
      );
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({
  error,
  resetError,
  referenceCode,
}: {
  error: Error;
  resetError: () => void;
  referenceCode?: string;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-6 max-w-md mx-auto px-6"
      >
        <div className="text-6xl">⚠️</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
          <p className="text-white/60">
            We encountered an error while loading this page.
          </p>
          {referenceCode ? (
            <p className="text-sm text-white/40">
              Support reference: <span className="font-mono">{referenceCode}</span>
            </p>
          ) : null}
        </div>

        {process.env.NODE_ENV === "development" && (
          <details className="text-left bg-white/5 rounded-lg p-4 border border-white/10">
            <summary className="text-white/80 font-medium cursor-pointer mb-2">
              Error Details (Development)
            </summary>
            <pre className="text-xs text-white/60 overflow-auto max-h-40">
              {error.message}
              {error.stack && "\n\n" + error.stack}
            </pre>
          </details>
        )}

        <div className="space-y-3">
          <button
            onClick={() => {
              void cleanupLegacyEsatServiceWorkers()
                .catch(() => undefined)
                .finally(() => {
                  resetError();
                  if (typeof window !== "undefined") {
                    window.location.reload();
                  }
                });
            }}
            className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/80 transition-colors"
          >
            Try Again
          </button>
          <div className="text-sm text-white/40">
            If the problem persists, please refresh the page and share the
            support reference with us.
          </div>
        </div>
      </motion.div>
    </div>
  );
}
