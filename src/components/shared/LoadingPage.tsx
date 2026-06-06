/**
 * Full-screen loading overlay — spinner, status message, and a random study hint.
 */

"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { DISPLAY_NAME } from "@/config/brand";

export type LoadingPageVariant = "app" | "session";

interface LoadingPageProps {
  message?: string;
  showProgress?: boolean;
  progress?: number;
  /** Fixed hint; if omitted, a random tip is chosen once on mount. */
  hint?: string;
  variant?: LoadingPageVariant;
}

const APP_LOADING_STEPS = [
  "Initializing math engines...",
  "Loading practice sessions...",
  "Optimizing algorithms...",
  "Preparing analytics...",
  "Almost ready...",
];

export function LoadingPage({
  message,
  showProgress = false,
  progress = 0,
  hint: hintProp,
  variant = "app",
}: LoadingPageProps) {
  const [dots, setDots] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);

  const hint = useMemo(
    () => hintProp ?? pickRandomSessionLoadingHint(),
    [hintProp],
  );

  const isSession = variant === "session";
  const statusMessage =
    message ??
    (isSession
      ? "Preparing your session"
      : "Compiling your math training experience");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isSession) return;
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % APP_LOADING_STEPS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [isSession]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background">
      <div className="mx-auto max-w-md space-y-8 px-6 text-center">
        {!isSession ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            <div className="text-4xl font-bold text-text">{DISPLAY_NAME}</div>
            <div className="text-sm uppercase tracking-wider text-text-muted">
              ESAT &amp; TMUA Preparation
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="font-heading text-2xl font-semibold tracking-tight text-text sm:text-3xl">
              Question Bank
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: isSession ? 0 : 0.15 }}
          className="space-y-6"
        >
          <div className="flex justify-center">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-border-subtle" />
              <motion.div
                className="absolute left-0 top-0 h-16 w-16 rounded-full border-4 border-primary border-r-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </div>
          </div>

          {showProgress ? (
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          ) : null}

          {!isSession ? (
            <motion.div
              key={loadingStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="min-h-[20px] text-sm font-medium text-text-muted"
            >
              {APP_LOADING_STEPS[loadingStep]}
            </motion.div>
          ) : null}

          <div className="text-sm text-text-muted">
            {statusMessage}
            <span className="text-primary">{dots}</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="space-y-2 text-xs text-text-subtle"
        >
          <div>💡 Did you know?</div>
          <p className="text-sm italic leading-relaxed text-text-muted">{hint}</p>
        </motion.div>
      </div>
    </div>
  );
}
