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
      <ol className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-3">
        {PREP_PIPELINE_STEPS.map((step, index) => (
          <li
            key={step}
            className="flex items-center gap-2 sm:gap-2"
            role="listitem"
          >
            <span className="rounded-xl bg-[#3B82F6]/15 px-3 py-2 text-sm font-bold text-white sm:text-base">
              {step}
            </span>
            {index < PREP_PIPELINE_STEPS.length - 1 ? (
              <span
                aria-hidden
                className="hidden text-[#64748B] sm:inline sm:px-0.5"
              >
                →
              </span>
            ) : null}
            {index < PREP_PIPELINE_STEPS.length - 1 ? (
              <span
                aria-hidden
                className="text-[#64748B] sm:hidden"
              >
                ↓
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
