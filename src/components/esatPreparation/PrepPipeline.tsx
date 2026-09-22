import { cn } from "@/lib/utils";
import { PREP_PIPELINE_STEPS } from "@/content/esatPreparation";

/** Visual order of work: Calibration → Past papers → … → Review */
export function PrepPipeline({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white/[0.04] px-4 py-5 sm:px-6 sm:py-6",
        className,
      )}
      role="list"
      aria-label="ESAT preparation order"
    >
      {/* Mobile: vertical stack */}
      <ol className="flex flex-col items-stretch gap-2 sm:hidden">
        {PREP_PIPELINE_STEPS.map((step, index) => (
          <li key={step} className="flex flex-col items-center" role="listitem">
            <span className="w-full rounded-xl bg-[#3B82F6]/15 px-3 py-2.5 text-center text-sm font-bold text-white">
              {step}
            </span>
            {index < PREP_PIPELINE_STEPS.length - 1 ? (
              <span aria-hidden className="py-1 text-[#64748B]">
                ↓
              </span>
            ) : null}
          </li>
        ))}
      </ol>

      {/* Desktop: horizontal flow */}
      <ol className="hidden flex-wrap items-center gap-x-2 gap-y-3 sm:flex">
        {PREP_PIPELINE_STEPS.map((step, index) => (
          <li key={step} className="flex items-center gap-2" role="listitem">
            <span className="rounded-xl bg-[#3B82F6]/15 px-3 py-2 text-base font-bold text-white">
              {step}
            </span>
            {index < PREP_PIPELINE_STEPS.length - 1 ? (
              <span aria-hidden className="text-[#64748B]">
                →
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
