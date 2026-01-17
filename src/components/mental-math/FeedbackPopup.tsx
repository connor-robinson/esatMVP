/**
 * Feedback popup component for correct answer notifications
 */

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";

interface FeedbackPopupProps {
  show: boolean;
  message?: string;
}

export function FeedbackPopup({ show, message = "Correct!" }: FeedbackPopupProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
        >
          <div className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary/20 border border-primary/40 text-primary font-semibold text-base backdrop-blur-sm shadow-lg">
            <Check className="h-5 w-5" strokeWidth={2.5} />
            <span>{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}



























