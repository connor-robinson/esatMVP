/**
 * Verified Pearson / ESAT keyboard shortcuts.
 * Alt+N/F/E/C/Y from ESAT specimen screenshots (Aug 2026).
 */

export type ShortcutId =
  | "next"
  | "flag"
  | "end-exam"
  | "close"
  | "yes"
  | "no"
  | "ok"
  | "zoom-in"
  | "zoom-out";

export interface VerifiedShortcut {
  id: ShortcutId;
  chord: string;
  description: string;
  verifiedAs: "VERIFIED_ESAT" | "VERIFIED_PEARSON_PLATFORM";
  enabledInStrict: true;
}

export const VERIFIED_SHORTCUTS: readonly VerifiedShortcut[] = [
  {
    id: "next",
    chord: "Alt+N",
    description: "Go to the next screen or question.",
    verifiedAs: "VERIFIED_ESAT",
    enabledInStrict: true,
  },
  {
    id: "flag",
    chord: "Alt+F",
    description: "Flag or unflag the current question for review.",
    verifiedAs: "VERIFIED_ESAT",
    enabledInStrict: true,
  },
  {
    id: "end-exam",
    chord: "Alt+E",
    description: "Open the End Exam confirmation dialog.",
    verifiedAs: "VERIFIED_ESAT",
    enabledInStrict: true,
  },
  {
    id: "close",
    chord: "Alt+C",
    description: "Close the Navigator window.",
    verifiedAs: "VERIFIED_ESAT",
    enabledInStrict: true,
  },
  {
    id: "yes",
    chord: "Alt+Y",
    description: "Confirm End Exam (Yes).",
    verifiedAs: "VERIFIED_ESAT",
    enabledInStrict: true,
  },
  {
    id: "no",
    chord: "Alt+N",
    description: "Cancel End Exam (No). Same key as Next when dialog closed.",
    verifiedAs: "VERIFIED_ESAT",
    enabledInStrict: true,
  },
  {
    id: "ok",
    chord: "Alt+O",
    description: "Dismiss Unseen Content dialog (OK).",
    verifiedAs: "VERIFIED_ESAT",
    enabledInStrict: true,
  },
  {
    id: "zoom-in",
    chord: "Ctrl+",
    description: "Increase magnification (100% to 200% in 25% steps).",
    verifiedAs: "VERIFIED_PEARSON_PLATFORM",
    enabledInStrict: true,
  },
  {
    id: "zoom-out",
    chord: "Ctrl-",
    description: "Decrease magnification (200% to 100% in 25% steps).",
    verifiedAs: "VERIFIED_PEARSON_PLATFORM",
    enabledInStrict: true,
  },
] as const;

export const UNVERIFIED_SHORTCUTS_DISABLED = [
  { chord: "Alt+P", reason: "UNVERIFIED; disabled in strict mode" },
  { chord: "digit answers 1-8", reason: "UNVERIFIED; disabled in strict mode" },
  {
    chord: "arrow keys between questions",
    reason: "UNVERIFIED; disabled in strict mode",
  },
] as const;

export interface MnemonicParts {
  before: string;
  mnemonic: string;
  after: string;
}

export function splitMnemonic(
  label: string,
  letter: string,
): MnemonicParts | null {
  if (!letter || letter.length !== 1) return null;
  const idx = label.toLowerCase().indexOf(letter.toLowerCase());
  if (idx < 0) return null;
  return {
    before: label.slice(0, idx),
    mnemonic: label.slice(idx, idx + 1),
    after: label.slice(idx + 1),
  };
}

export function isVerifiedShortcutId(id: string): id is ShortcutId {
  return VERIFIED_SHORTCUTS.some((s) => s.id === id);
}

export function matchVerifiedShortcut(
  e: Pick<KeyboardEvent, "altKey" | "ctrlKey" | "metaKey" | "key" | "code">,
  context?: {
    endExamDialogOpen?: boolean;
    navigatorOpen?: boolean;
    unseenContentDialogOpen?: boolean;
  },
): ShortcutId | null {
  const key = e.key;
  const code = e.code;

  if (e.altKey && !e.ctrlKey && !e.metaKey) {
    const lk = key.toLowerCase();
    if (context?.unseenContentDialogOpen) {
      if (lk === "o") return "ok";
      return null;
    }
    if (context?.endExamDialogOpen) {
      if (lk === "y") return "yes";
      if (lk === "n") return "no";
      return null;
    }
    if (context?.navigatorOpen && lk === "c") return "close";
    if (lk === "n") return "next";
    if (lk === "f") return "flag";
    if (lk === "e") return "end-exam";
  }

  const mod = e.ctrlKey || e.metaKey;
  if (mod && !e.altKey) {
    if (key === "+" || key === "=" || code === "Equal" || code === "NumpadAdd") {
      return "zoom-in";
    }
    if (key === "-" || key === "_" || code === "Minus" || code === "NumpadSubtract") {
      return "zoom-out";
    }
  }

  return null;
}
