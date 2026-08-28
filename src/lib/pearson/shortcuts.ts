/**
 * Verified Pearson / ESAT keyboard shortcuts only.
 *
 * DO NOT invent Alt+P, Alt+F, digit answers, or arrow-between-questions unless
 * labeled UNVERIFIED and disabled in strict mode.
 */

export type ShortcutId = "next" | "zoom-in" | "zoom-out";

export interface VerifiedShortcut {
  id: ShortcutId;
  /** Human-readable chord, e.g. "Alt+N". */
  chord: string;
  /** Short teaching description for the controls coach page. */
  description: string;
  /** Source tag. */
  verifiedAs: "VERIFIED_PEARSON_PLATFORM";
  /** Whether enabled in strict-simulation. */
  enabledInStrict: true;
}

export const VERIFIED_SHORTCUTS: readonly VerifiedShortcut[] = [
  {
    id: "next",
    chord: "Alt+N",
    description: "Go to the next question (same as clicking Next).",
    verifiedAs: "VERIFIED_PEARSON_PLATFORM",
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

/**
 * Shortcuts that exist in folklore / third-party guides but are NOT shipped
 * in strict mode. Listed here so callers do not invent them silently.
 */
export const UNVERIFIED_SHORTCUTS_DISABLED = [
  { chord: "Alt+P", reason: "UNVERIFIED; disabled in strict mode" },
  { chord: "Alt+F", reason: "UNVERIFIED; disabled in strict mode" },
  { chord: "digit answers 1-8", reason: "UNVERIFIED; disabled in strict mode" },
  {
    chord: "arrow keys between questions",
    reason: "UNVERIFIED; disabled in strict mode (arrow keys still work for native radios when focused)",
  },
] as const;

export interface MnemonicParts {
  before: string;
  mnemonic: string;
  after: string;
}

/**
 * Split a button label so the mnemonic letter can be underlined.
 * Case-insensitive first match of `letter`.
 */
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

/**
 * Match a keyboard event to a verified shortcut action.
 * Returns null for anything not in the verified registry.
 */
export function matchVerifiedShortcut(
  e: Pick<KeyboardEvent, "altKey" | "ctrlKey" | "metaKey" | "key" | "code">,
): ShortcutId | null {
  const key = e.key;
  const code = e.code;

  // Alt+N → Next (VERIFIED_PEARSON_PLATFORM)
  if (e.altKey && !e.ctrlKey && !e.metaKey && (key === "n" || key === "N")) {
    return "next";
  }

  // Ctrl+ / Ctrl= → zoom in; Ctrl- → zoom out (VERIFIED_PEARSON_PLATFORM)
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
