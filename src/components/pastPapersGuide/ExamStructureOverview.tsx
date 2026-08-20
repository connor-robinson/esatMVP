import { cn } from "@/lib/utils";
import type { ExamStructureBlock } from "@/content/legacyExamStructures";

const ACCENT = {
  nsaa: {
    label: "text-[#8FA88A]",
    chip: "bg-[#8FA88A]/15 text-[#DDE8DA]",
    card: "bg-[#8FA88A]/10",
    bar: "bg-[#8FA88A]",
    mutedBar: "bg-[#8FA88A]/35",
  },
  engaa: {
    label: "text-[#C9A227]",
    chip: "bg-[#C9A227]/15 text-[#F0E0B0]",
    card: "bg-[#C9A227]/10",
    bar: "bg-[#C9A227]",
    mutedBar: "bg-[#C9A227]/35",
  },
  tmua: {
    label: "text-[#9B8AA8]",
    chip: "bg-[#9B8AA8]/15 text-[#C4B5D5]",
    card: "bg-[#9B8AA8]/10",
    bar: "bg-[#9B8AA8]",
    mutedBar: "bg-[#9B8AA8]/35",
  },
} as const;

export function ExamStructureOverview({
  data,
}: {
  data: ExamStructureBlock;
}) {
  const accent = ACCENT[data.accent];

  return (
    <div className="space-y-8">
      <div>
        <p
          className={cn(
            "text-xs font-bold uppercase tracking-[0.3em]",
            accent.label,
          )}
        >
          {data.fullName}
        </p>
        <h2 className="mt-3 text-2xl font-display font-bold tracking-tight text-white sm:text-3xl">
          {data.exam} structure over time
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#94A3B8]">
          {data.summary}
        </p>
      </div>

      {/* Era strip */}
      <div
        className={cn(
          "grid gap-3",
          data.eras.length === 1 ? "grid-cols-1" : "sm:grid-cols-2",
        )}
      >
        {data.eras.map((era, index) => (
          <div
            key={era.years}
            className={cn("relative overflow-hidden rounded-2xl p-5", accent.card)}
          >
            <div
              aria-hidden
              className={cn(
                "absolute inset-y-0 left-0 w-1",
                index === data.eras.length - 1 ? accent.bar : accent.mutedBar,
              )}
            />
            <div className="flex flex-wrap items-center gap-2 pl-3">
              <span className="font-mono text-sm font-bold text-white">
                {era.years}
              </span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  accent.chip,
                )}
              >
                {era.title}
              </span>
            </div>
            {era.highlight ? (
              <p className="mt-3 pl-3 font-display text-lg font-bold text-white">
                {era.highlight}
              </p>
            ) : null}
            <ul className="mt-3 space-y-1.5 pl-3 text-sm leading-relaxed text-[#94A3B8]">
              {era.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Section breakdown */}
      <div className="space-y-6">
        {data.sections.map((section) => (
          <div key={section.name}>
            <h3 className="font-display text-xl font-bold text-white">
              {section.name}
            </h3>
            <div
              className={cn(
                "mt-3 grid gap-3",
                section.eras.length > 1 ? "lg:grid-cols-2" : "grid-cols-1",
              )}
            >
              {section.eras.map((era) => (
                <div
                  key={`${section.name}-${era.years}-${era.title}`}
                  className="rounded-2xl bg-white/[0.035] p-5"
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="font-mono text-xs uppercase tracking-widest text-[#64748B]">
                      {era.years}
                    </p>
                    <p className="font-semibold text-white">{era.title}</p>
                  </div>
                  {era.highlight ? (
                    <p className="mt-2 text-sm font-medium text-red-300">
                      {era.highlight}
                    </p>
                  ) : null}
                  <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-[#94A3B8]">
                    {era.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-2">
                        <span
                          aria-hidden
                          className={cn(
                            "mt-2 h-1.5 w-1.5 shrink-0 rounded-full",
                            accent.bar,
                          )}
                        />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {data.footnote ? (
        <p className="text-sm leading-relaxed text-[#64748B]">{data.footnote}</p>
      ) : null}
    </div>
  );
}
