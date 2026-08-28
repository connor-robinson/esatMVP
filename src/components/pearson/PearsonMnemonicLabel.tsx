"use client";

import { splitMnemonic } from "@/lib/pearson/shortcuts";
import { cn } from "@/lib/utils";

interface PearsonMnemonicLabelProps {
  label: string;
  letter: string;
  className?: string;
}

/**
 * Alt+letter underline on a single inline span so flex parents do not
 * insert gap between the mnemonic letter and the rest of the label.
 */
export function PearsonMnemonicLabel({
  label,
  letter,
  className,
}: PearsonMnemonicLabelProps) {
  const parts = splitMnemonic(label, letter);
  if (!parts) {
    return <span className={className}>{label}</span>;
  }
  return (
    <span className={cn("pearson-mnemonic-text", className)}>
      {parts.before}
      <span className="pearson-mnemonic-u">{parts.mnemonic}</span>
      {parts.after}
    </span>
  );
}
