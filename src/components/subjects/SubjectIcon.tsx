/**
 * SubjectIcon - lucide outline icons mapped by subject id
 */

"use client";

import { Atom, FlaskConical, Leaf, FunctionSquare } from "lucide-react";

export function SubjectIcon({ id, className, color }: { id: string; className?: string; color?: string }) {
  const Map: Record<string, React.ComponentType<any>> = {
    maths: FunctionSquare,
    physics: Atom,
    chemistry: FlaskConical,
    biology: Leaf,
  };
  
  // Convert CSS variables to actual hex colors for inline styles
  const getActualColor = (colorVar: string) => {
    const colorMap: Record<string, string> = {
      'var(--subj-maths)': '#5da8f0',
      'var(--subj-physics)': '#a78bfa', 
      'var(--subj-chem)': '#ef7d7d',
      'var(--subj-bio)': '#85BC82'
    };
    return colorMap[colorVar] || colorVar;
  };
  
  const Icon = Map[id] ?? FunctionSquare;
  return <Icon className={className} strokeWidth={2} style={{ color: getActualColor(color || '') }} />;
}



