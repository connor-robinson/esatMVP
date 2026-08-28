/** Inline SVG icons matching ESAT Pearson VUE player (simple line weight). */

export function EndExamIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="14"
      viewBox="0 0 18 14"
      aria-hidden="true"
    >
      <rect x="1" y="2" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M11 7h5M14 5l2 2-2 2" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function NextArrowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="12" viewBox="0 0 14 12" aria-hidden="true">
      <path d="M0 6h10M7 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function NavigatorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="8" cy="3" r="1" fill="currentColor" />
      <circle cx="12" cy="8" r="1" fill="currentColor" />
      <circle cx="8" cy="13" r="1" fill="currentColor" />
      <circle cx="4" cy="8" r="1" fill="currentColor" />
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

export function FlagIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M2 1v12" stroke="#000" strokeWidth="1.2" />
      {filled ? (
        <path d="M2.5 1.5h8l-2.5 2.5L9.5 8H2.5V1.5z" fill="#ffcc00" stroke="#c4a000" strokeWidth="0.8" />
      ) : (
        <path
          d="M2.5 1.5h8l-2.5 2.5L9.5 8H2.5"
          fill="none"
          stroke="#ffcc00"
          strokeWidth="1"
        />
      )}
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
      <text x="16" y="21" textAnchor="middle" fill="#fff" fontSize="16" fontFamily="Georgia, serif" fontStyle="italic">
        i
      </text>
    </svg>
  );
}
