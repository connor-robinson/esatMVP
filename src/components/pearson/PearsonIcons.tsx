/** Inline SVG icons matching ESAT Pearson VUE player (simple line weight). */

export function EndExamIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="14"
      viewBox="0 0 20 14"
      aria-hidden="true"
    >
      {/* Open bracket (left side open) with arrow entering from the left */}
      <path
        d="M7 2h9v10H7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.15"
      />
      <path d="M1 7h5" fill="none" stroke="currentColor" strokeWidth="1.15" />
      <path
        d="M3 5l2 2-2 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

export function NextArrowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="12" viewBox="0 0 14 12" aria-hidden="true">
      <path d="M0 6h10M7 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function NavigatorIcon({ className }: { className?: string }) {
  const dots: Array<[number, number]> = [];
  const cx = 8;
  const cy = 8;
  const r = 5.5;
  for (let i = 0; i < 8; i += 1) {
    const a = (i * Math.PI * 2) / 8 - Math.PI / 2;
    dots.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx={cx} cy={cy} r="1.1" fill="currentColor" />
      {dots.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="0.85" fill="currentColor" />
      ))}
    </svg>
  );
}

export function QuestionCounterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <rect x="2" y="1" width="10" height="12" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M4 4h6M4 7h6M4 10h4" stroke="currentColor" strokeWidth="0.9" />
    </svg>
  );
}

/** White outline waving flag on toolbar; yellow fill when flagged. */
export function FlagIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="16" height="14" viewBox="0 0 16 14" aria-hidden="true">
      <path
        d="M2.5 1.2v11.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="square"
      />
      <path
        d="M2.5 2.2h8.2c.45 0 .85.25 1 .65l-1.15 1.85c-.35.55.05 1.15.65 1.15h.75c.35 0 .6.25.45.55l-1.55 2.25c-.25.4.05.85.5.85h-1.1l-1.35-.35-1.55.35-1.55-.45V2.2z"
        fill={filled ? "#ffcc00" : "none"}
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function NavigatorWindowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="9" cy="9" r="7" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M9 4v2M9 12v2M4 9h2M12 9h2" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function InfoIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <radialGradient id="pearson-info-ball" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#7ec8e8" />
          <stop offset="100%" stopColor="#0066a1" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="14" fill="url(#pearson-info-ball)" />
      <text
        x="16"
        y="21"
        textAnchor="middle"
        fill="#fff"
        fontSize="16"
        fontFamily="Georgia, serif"
        fontStyle="italic"
      >
        i
      </text>
    </svg>
  );
}

export function ColourSchemeCaret() {
  return (
    <svg width="8" height="5" viewBox="0 0 8 5" aria-hidden="true" className="pearson-colour-caret-svg">
      <path d="M0 0h8L4 5 0 0z" fill="#000000" />
    </svg>
  );
}
