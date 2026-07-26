import { cn } from "@/lib/utils";

/**
 * "What this paper is good for, and where it stops helping." Used above each
 * exam group so nobody has to guess why a paper is in the list.
 */
export function PaperUseGuide({
  summary,
  goodFor,
  weakFor,
  goodForTitle = "Good for",
  weakForTitle = "Weaker for",
  className,
}: {
  summary?: readonly string[];
  goodFor: readonly string[];
  weakFor: readonly string[];
  goodForTitle?: string;
  weakForTitle?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-5", className)}>
      {summary?.length ? (
        <div className="space-y-4">
          {summary.map((paragraph) => (
            <p key={paragraph} className="leading-relaxed text-[#94A3B8]">
              {paragraph}
            </p>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { title: goodForTitle, items: goodFor, accent: "text-[#86EFAC]" },
          { title: weakForTitle, items: weakFor, accent: "text-[#FDE68A]" },
        ].map((column) => (
          <div key={column.title} className="rounded-2xl bg-white/[0.04] p-5">
            <p className={cn("text-sm font-bold", column.accent)}>
              {column.title}
            </p>
            <ul className="mt-3 space-y-2.5">
              {column.items.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span
                    aria-hidden
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/25"
                  />
                  <span className="text-sm leading-relaxed text-[#94A3B8]">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
