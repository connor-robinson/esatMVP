/**
 * Loading page component shown during compilation and initial load
 */

"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

interface LoadingPageProps {
  message?: string;
  showProgress?: boolean;
  progress?: number;
}

export function LoadingPage({ 
  message = "Compiling your math training experience...", 
  showProgress = false,
  progress = 0 
}: LoadingPageProps) {
  const [dots, setDots] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);

  const loadingSteps = [
    "Initializing math engines...",
    "Loading practice sessions...",
    "Optimizing algorithms...",
    "Preparing analytics...",
    "Almost ready...",
  ];

  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "" : prev + ".");
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Animate loading steps
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingStep(prev => (prev + 1) % loadingSteps.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [loadingSteps.length]);

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
      <div className="text-center space-y-8 max-w-md mx-auto px-6">
        {/* Logo/Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-4"
        >
          <div className="text-4xl font-bold text-white">
            No-Calc Trainer
          </div>
          <div className="text-white/60 text-sm uppercase tracking-wider">
            Master Mental Math
          </div>
        </motion.div>

        {/* Loading Animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-6"
        >
          {/* Spinner */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-white/20 rounded-full"></div>
              <motion.div
                className="absolute top-0 left-0 w-16 h-16 border-4 border-primary border-r-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </div>
          </div>

          {/* Progress Bar */}
          {showProgress && (
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}

          {/* Loading Message */}
          <motion.div
            key={loadingStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
            className="text-white/80 text-sm font-medium min-h-[20px]"
          >
            {loadingSteps[loadingStep]}
          </motion.div>

          {/* Main Message */}
          <div className="text-white/60 text-sm">
            {message}
            <span className="text-primary">{dots}</span>
          </div>
        </motion.div>

        {/* Fun Math Facts */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-white/40 text-xs space-y-2"
        >
          <div>💡 Did you know?</div>
          <div className="italic">
            &quot;The fastest mental calculators can perform calculations 10x faster than typing on a calculator!&quot;
          </div>
        </motion.div>
      </div>
    </div>
  );
}


