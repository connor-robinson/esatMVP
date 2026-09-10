import { cn } from "@/lib/utils";
import { InlineKatex } from "@/components/home/InlineKatex";

/** Optimized still (~24KB webp) of Maths 1 Mock Q22 in the Pearson player. */
const ESAT_PLAYER = {
  src: "/images/home/esat-camp-mock-player-hero-v2.webp",
  alt: "ESAT Camp Mock 1 exam player showing Maths 1 Mock question 22 with a speed-time graph",
  width: 1400,
  height: 986,
} as const;

const PEARSON_BLUE = "#006daa";

/**
 * Fear hero device stack:
 * laptop = compressed Pearson still, edge-to-edge in the screen;
 * phone = mental maths binary-choice still (trig), solid colors.
 */
export function HeroDeviceShowcase({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[42rem] px-6 pb-8 sm:px-10 lg:max-w-[34rem] lg:px-6 lg:pb-10 xl:max-w-[38rem]",
        className,
      )}
    >
      {/* Laptop */}
      <div className="relative z-10">
        <div className="overflow-hidden rounded-t-lg border border-[#2a3144] bg-[#1a1f2e] p-1 shadow-[0_28px_60px_-16px_rgba(0,0,0,0.7)] sm:rounded-t-xl sm:p-1.5">
          <div className="mb-1 flex items-center justify-center sm:mb-1.5">
            <div className="h-1 w-1 rounded-full bg-[#4a5568] sm:h-1.5 sm:w-1.5" />
          </div>
          <div className="overflow-hidden rounded-[2px] bg-white">
            {/* Plain img: already-optimized webp, no Next image re-encode */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ESAT_PLAYER.src}
              alt={ESAT_PLAYER.alt}
              width={ESAT_PLAYER.width}
              height={ESAT_PLAYER.height}
              decoding="async"
              fetchPriority="high"
              className="block h-auto w-full"
            />
          </div>
        </div>
        <div className="relative mx-auto h-2.5 w-[102%] -translate-x-[1%] rounded-b-lg bg-[#252b3b] shadow-[0_10px_24px_rgba(0,0,0,0.45)] sm:h-3 sm:rounded-b-xl">
          <div className="absolute left-1/2 top-0.5 h-1 w-16 -translate-x-1/2 rounded-b-sm bg-[#3a4254] sm:w-20" />
        </div>
      </div>

      {/* Phone: dark bevel, tighter corners */}
      <div className="absolute bottom-[-2%] right-[6%] z-20 w-[34%] min-w-[7.5rem] max-w-[11.5rem] sm:bottom-[-3%] sm:right-[8%] sm:min-w-[9rem] sm:max-w-[12.5rem] lg:right-[6%]">
        <div className="rounded-[0.75rem] bg-[#0B0D12] p-[0.35rem] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.85)] ring-1 ring-[#2a3144] sm:rounded-[0.85rem] sm:p-[0.4rem]">
          <div className="aspect-[9/16] overflow-hidden rounded-[0.4rem] bg-[#161D2F] sm:rounded-[0.45rem]">
            <MentalMathsPhoneScreen />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Compact still of MentalMathSession + BinaryChoiceInput (trig, solid colors). */
function MentalMathsPhoneScreen() {
  return (
    <div className="flex h-full flex-col bg-[#161D2F] px-2 pb-3 pt-2.5 text-white">
      {/* Header: progress + end */}
      <div className="shrink-0 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-sm bg-[#252B3B]">
            <div
              className="h-full w-[38%] rounded-sm"
              style={{ backgroundColor: PEARSON_BLUE }}
            />
          </div>
          <div className="shrink-0 rounded-sm bg-[#252B3B] px-1.5 py-0.5 text-[6px] font-semibold leading-none text-[#CBD5E1] sm:text-[7px]">
            End
          </div>
        </div>
        <div className="flex items-center justify-between px-0.5 text-[7px] sm:text-[8px]">
          <span
            className="font-semibold tabular-nums"
            style={{ color: PEARSON_BLUE }}
          >
            Time 0:42
          </span>
          <span className="text-[#64748B]">100% accurate</span>
        </div>
      </div>

      {/* Question centered in the middle band */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-0.5">
        <span className="text-[6px] font-sans uppercase tracking-[0.14em] text-[#64748B] sm:text-[7px]">
          Trigonometry
        </span>
        <p className="m-0 text-center text-[11px] font-semibold leading-snug tracking-tight text-[#E2E8F0] sm:text-[12px]">
          What is the exact value of sin 45°?
        </p>
      </div>

      <div className="flex w-full shrink-0 gap-1.5 pb-1">
        {(
          [
            {
              key: "sqrt2",
              latex: "\\dfrac{\\sqrt{2}}{2}",
              fallback: "√2/2",
              selected: true,
            },
            {
              key: "half",
              latex: "\\dfrac{1}{2}",
              fallback: "1/2",
              selected: false,
            },
          ] as const
        ).map((choice) => (
          <div
            key={choice.key}
            className={cn(
              "flex h-10 flex-1 items-center justify-center rounded-md sm:h-11",
              choice.selected ? "text-white" : "bg-[#252B3B] text-[#E2E8F0]",
            )}
            style={
              choice.selected ? { backgroundColor: PEARSON_BLUE } : undefined
            }
          >
            <InlineKatex
              latex={choice.latex}
              fallback={choice.fallback}
              className="text-[12px] leading-none sm:text-[13px] [&_.katex]:text-[1em]"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
