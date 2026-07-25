import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FaqItem } from "@/lib/seo/config";

/**
 * FAQ accordion built on native `<details>` so every answer is present in the
 * server-rendered HTML rather than behind client-side state.
 */
export function SeoFaq({
  items,
  heading = "Frequently asked questions",
  className,
}: {
  items: readonly FaqItem[];
  heading?: string;
  className?: string;
}) {
  return (
    <section className={cn("scroll-mt-24", className)} id="faq">
      <h2 className="text-2xl font-display font-bold tracking-tight text-white sm:text-3xl">
        {heading}
      </h2>
      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <details
            key={item.question}
            className="group overflow-hidden rounded-2xl bg-white/[0.035] transition-colors hover:bg-white/[0.055]"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 text-left sm:px-6">
              <h3 className="text-base font-bold leading-snug text-white sm:text-lg">
                {item.question}
              </h3>
              <ChevronDown
                aria-hidden
                className="h-5 w-5 shrink-0 text-[#94A3B8] transition-transform duration-300 ease-out group-open:rotate-180 group-open:text-[#3B82F6]"
              />
            </summary>
            <p className="px-5 pb-6 text-sm leading-relaxed text-[#94A3B8] sm:px-6 sm:text-[15px]">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
