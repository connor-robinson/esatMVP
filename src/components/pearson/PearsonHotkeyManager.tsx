"use client";

import { useEffect } from "react";
import type { PearsonExamController } from "@/lib/pearson/usePearsonExamController";

interface PearsonHotkeyManagerProps {
  controller: Pick<PearsonExamController, "handleVerifiedHotkey" | "completed">;
}

/**
 * Listens for verified shortcuts only (strict mode):
 * Alt+N, Ctrl+/Ctrl-, clock is click-only.
 * Unverified chords are intentionally ignored.
 */
export function PearsonHotkeyManager({
  controller,
}: PearsonHotkeyManagerProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (controller.completed) return;
      // Let native radio arrow/space behaviour alone when typing in inputs/selects
      // other than our hotkeys. Still allow Alt+N / Ctrl+/- globally.
      controller.handleVerifiedHotkey(e);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [controller]);

  return null;
}
