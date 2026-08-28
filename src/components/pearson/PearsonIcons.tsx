/** Inline SVG chrome icons matching ESAT Pearson VUE player. */

const CHROME_ICON = "pearson-chrome-icon";

export function EndExamIcon({ className }: { className?: string }) {
  return (
    <svg
      className={[CHROME_ICON, CHROME_ICON + "--footer", className].filter(Boolean).join(" ")}
      viewBox="0 0 20 14"
      aria-hidden="true"
    >
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

/** Chunky rounded footer arrow (specimen style). */
export function NextArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={[CHROME_ICON, CHROME_ICON + "--footer", className].filter(Boolean).join(" ")}
      viewBox="0 0 16 14"
      aria-hidden="true"
    >
      <path
        d="M1 7h7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M7 2.5l5.5 4.5-5.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PrevArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={[CHROME_ICON, CHROME_ICON + "--footer", className].filter(Boolean).join(" ")}
      viewBox="0 0 16 14"
      aria-hidden="true"
    >
      <path
        d="M15 7H7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M9 2.5 3.5 7 9 11.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function NavigatorIcon({ className }: { className?: string }) {
  return (
    <svg
      className={[CHROME_ICON, CHROME_ICON + "--footer", className].filter(Boolean).join(" ")}
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="1.1" fill="currentColor" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const a = (i * Math.PI * 2) / 8 - Math.PI / 2;
        const x = 8 + 5.5 * Math.cos(a);
        const y = 8 + 5.5 * Math.sin(a);
        return <circle key={i} cx={x} cy={y} r="0.85" fill="currentColor" />;
      })}
    </svg>
  );
}

export function TimerClockIcon({
  className,
  yellow,
}: {
  className?: string;
  yellow?: boolean;
}) {
  const stroke = yellow ? "#ffff00" : "currentColor";
  return (
    <svg
      className={[CHROME_ICON, CHROME_ICON + "--header", className].filter(Boolean).join(" ")}
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
      <line
        x1="3.5"
        y1="9"
        x2="3.5"
        y2="6.5"
        stroke={stroke}
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <circle cx="9" cy="8" r="5.5" fill="none" stroke={stroke} strokeWidth="1.1" />
      <line
        x1="9"
        y1="8"
        x2="9"
        y2="4.5"
        stroke={stroke}
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <line
        x1="9"
        y1="8"
        x2="11.8"
        y2="9.8"
        stroke={stroke}
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function QuestionCounterIcon({ className }: { className?: string }) {
  return (
    <svg
      className={[CHROME_ICON, CHROME_ICON + "--header", className].filter(Boolean).join(" ")}
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
      <line x1="5" y1="2.5" x2="11" y2="2.5" stroke="currentColor" strokeWidth="1.15" />
      <rect
        x="3.25"
        y="5.25"
        width="9.5"
        height="5.5"
        rx="2.75"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.15"
      />
      <line x1="5" y1="13.5" x2="11" y2="13.5" stroke="currentColor" strokeWidth="1.15" />
    </svg>
  );
}

/** White outline waving flag on toolbar; yellow fill when flagged. */
export function FlagIcon({ filled }: { filled?: boolean }) {
  return (
    <svg
      className={[CHROME_ICON, CHROME_ICON + "--toolbar"].join(" ")}
      viewBox="0 0 16 14"
      aria-hidden="true"
    >
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
    <svg
      className={[CHROME_ICON, CHROME_ICON + "--dialog"].join(" ")}
      viewBox="0 0 18 18"
      aria-hidden="true"
    >
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
