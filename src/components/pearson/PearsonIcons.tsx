/** Official Pearson VUE bitmap icons extracted from ESAT specimen UI screenshots. */

const ICONS = {
  flag: "/pearson/icons/flag.png",
  flagFilled: "/pearson/icons/flag-filled.png",
  endExam: "/pearson/icons/end-exam.png",
  counter: "/pearson/icons/counter.png",
  timer: "/pearson/icons/timer.png",
  timerYellow: "/pearson/icons/timer-yellow.png",
  prev: "/pearson/icons/prev.png",
  navigator: "/pearson/icons/navigator.png",
  next: "/pearson/icons/next.png",
} as const;

type RasterIconProps = {
  src: string;
  height?: number;
  className?: string;
};

function RasterIcon({ src, height = 14, className }: RasterIconProps) {
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className={className ? `pearson-raster-icon ${className}` : "pearson-raster-icon"}
      style={{ height, width: "auto" }}
      draggable={false}
    />
  );
}

export function EndExamIcon({ className }: { className?: string }) {
  return <RasterIcon src={ICONS.endExam} height={14} className={className} />;
}

export function NextArrowIcon({ className }: { className?: string }) {
  return <RasterIcon src={ICONS.next} height={12} className={className} />;
}

export function PrevArrowIcon({ className }: { className?: string }) {
  return <RasterIcon src={ICONS.prev} height={12} className={className} />;
}

export function NavigatorIcon({ className }: { className?: string }) {
  return <RasterIcon src={ICONS.navigator} height={14} className={className} />;
}

export function TimerClockIcon({
  className,
  yellow,
}: {
  className?: string;
  yellow?: boolean;
}) {
  return (
    <RasterIcon
      src={yellow ? ICONS.timerYellow : ICONS.timer}
      height={14}
      className={className}
    />
  );
}

export function QuestionCounterIcon({ className }: { className?: string }) {
  return <RasterIcon src={ICONS.counter} height={14} className={className} />;
}

/** White outline waving flag on toolbar; yellow when flagged. */
export function FlagIcon({ filled }: { filled?: boolean }) {
  return (
    <RasterIcon src={filled ? ICONS.flagFilled : ICONS.flag} height={13} />
  );
}

export function NavigatorWindowIcon() {
  return <RasterIcon src={ICONS.navigator} height={16} />;
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
