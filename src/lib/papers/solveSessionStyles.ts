/** Past-papers solve session — blue (`accent`) nav / primary actions */
export const solveSessionLightBlue =
  "bg-accent text-neutral-900 transition-all duration-fast ease-signature hover:opacity-90 active:scale-95 disabled:pointer-events-none disabled:opacity-40";

export const solveSessionNavBtn = `flex items-center gap-2 rounded-organic-md px-6 py-3 font-medium ${solveSessionLightBlue}`;

export const solveSessionActionBtn = `inline-flex items-center justify-center rounded-organic-md font-semibold ${solveSessionLightBlue}`;

/** MC answer pills — neutral by default; blue only when selected */
export const solveSessionChoiceBtn =
  "flex h-[50px] flex-1 items-center justify-center rounded-organic-md bg-surface-subtle text-base font-medium text-text transition-all duration-fast ease-signature hover:bg-surface-mid active:scale-95";

export const solveSessionChoiceBtnSelected = `flex h-[50px] flex-1 items-center justify-center rounded-organic-md text-base font-semibold ${solveSessionLightBlue}`;

/** Full-width text option rows (solve text mode) */
export const solveSessionTextChoiceBtn =
  "w-full rounded-organic-md px-3.5 py-2.5 text-left bg-surface-subtle text-text transition-all duration-fast hover:bg-surface-mid cursor-pointer";

export const solveSessionTextChoiceBtnSelected = `w-full rounded-organic-md px-3.5 py-2.5 text-left font-semibold ${solveSessionLightBlue}`;
