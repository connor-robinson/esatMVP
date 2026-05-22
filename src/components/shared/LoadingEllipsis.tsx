import { cn } from "@/lib/utils";

interface LoadingEllipsisProps {
  /** Text before the animated dots (default: "loading") */
  label?: string;
  className?: string;
}

/** "loading..." with a sequential blink on the three dots */
export function LoadingEllipsis({
  label = "loading",
  className,
}: LoadingEllipsisProps) {
  return (
    <span
      className={cn("inline-flex items-baseline", className)}
      role="status"
      aria-live="polite"
      aria-label={`${label}…`}
    >
      <span>{label}</span>
      <span className="inline-flex w-[1.15em] shrink-0" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="animate-loading-dot opacity-20"
            style={{ animationDelay: `${i * 0.18}s` }}
          >
            .
          </span>
        ))}
      </span>
    </span>
  );
}
