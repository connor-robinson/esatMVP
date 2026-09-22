import { cn } from "@/lib/utils";

const BAD_CARD = "Solve this entire transformer question again.";
const BETTER_CARDS = [
  "For an ideal transformer, how are voltage, current and turns ratio related?",
  "If speed increases by a factor k, how does braking distance change?",
  "1 m³ equals how many litres?",
] as const;

export function AnkiCardCompare({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2",
        className,
      )}
    >
      <div className="rounded-2xl bg-white/[0.04] p-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F87171]">
          Bad card
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[#94A3B8]">{BAD_CARD}</p>
      </div>
      <div className="rounded-2xl bg-[#3B82F6]/10 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#93C5FD]">
          Better cards
        </p>
        <ul className="mt-3 space-y-3">
          {BETTER_CARDS.map((card) => (
            <li
              key={card}
              className="text-sm leading-relaxed text-[#E2E8F0]"
            >
              {card}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
