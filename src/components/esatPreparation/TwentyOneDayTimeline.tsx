import { cn } from "@/lib/utils";
import {
  TWENTY_ONE_DAY_TIMELINE,
  type TimelinePhase,
} from "@/content/esatPreparation";

function PhaseCard({
  phase,
  index,
  total,
}: {
  phase: TimelinePhase;
  index: number;
  total: number;
}) {
  const isLast = index === total - 1;

  return (
    <article
      className={cn(
        "relative flex gap-4 lg:block lg:min-w-[11.5rem] lg:flex-1 lg:gap-0",
        !isLast && "lg:pr-3",
      )}
    >
      {/* Mobile spine */}
      <div className="flex w-6 shrink-0 flex-col items-center lg:hidden" aria-hidden>
        <span className="mt-1 flex h-3 w-3 rounded-full bg-[#3B82F6]" />
        {!isLast ? (
          <span className="mt-1 w-px flex-1 bg-white/15" />
        ) : null}
      </div>

      <div className="min-w-0 flex-1 pb-8 lg:pb-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#3B82F6]">
          {phase.when}
        </p>
        <h3 className="mt-1.5 text-lg font-display font-bold text-white">
          {phase.title}
        </h3>
        <ul className="mt-3 space-y-1.5">
          {phase.items.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-sm leading-relaxed text-[#94A3B8]"
            >
              <span
                aria-hidden
                className="mt-2 h-1 w-1 shrink-0 rounded-full bg-white/50"
              />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

/**
 * 21-day ESAT preparation timeline.
 * Vertical on mobile, stepped horizontal on desktop.
 */
export function TwentyOneDayTimeline({ className }: { className?: string }) {
  const phases = TWENTY_ONE_DAY_TIMELINE;

  return (
    <div className={cn("rounded-2xl bg-[#161D2F] p-5 sm:p-7", className)}>
      {/* Desktop connector */}
      <div className="mb-6 hidden lg:block" aria-hidden>
        <div className="relative mx-1.5 h-3">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/15" />
          <div className="relative z-10 flex justify-between">
            {phases.map((phase) => (
              <span
                key={phase.id}
                className="flex h-3 w-3 rounded-full bg-[#3B82F6] ring-4 ring-[#161D2F]"
              />
            ))}
          </div>
        </div>
      </div>

      <div className="lg:flex lg:items-start lg:gap-0">
        {phases.map((phase, index) => (
          <PhaseCard
            key={phase.id}
            phase={phase}
            index={index}
            total={phases.length}
          />
        ))}
      </div>
    </div>
  );
}
