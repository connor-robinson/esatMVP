import { cn } from "@/lib/utils";
import { CONDENSED_PAST_PAPER_ROADMAP } from "@/content/esatPreparation";

/**
 * Condensed past-paper roadmap table.
 * Full interactive roadmap remains on /esat-past-papers-guide.
 */
export function CondensedPastPaperRoadmap({
  className,
}: {
  className?: string;
}) {
  return (
    <div className={cn(className)}>
      {/* Mobile: stacked rows */}
      <ul className="space-y-3 sm:hidden">
        {CONDENSED_PAST_PAPER_ROADMAP.map((row) => (
          <li
            key={row.material}
            className="rounded-2xl bg-[#161D2F] px-4 py-4"
          >
            <p className="font-semibold text-white">{row.material}</p>
            <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">
              {row.recommendation}
            </p>
          </li>
        ))}
      </ul>

      {/* Desktop / tablet table */}
      <figure className="m-0 hidden sm:block">
        <div className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          <div className="min-w-[36rem] overflow-hidden rounded-2xl bg-[#161D2F]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]"
                  >
                    Material
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]"
                  >
                    Recommendation
                  </th>
                </tr>
              </thead>
              <tbody>
                {CONDENSED_PAST_PAPER_ROADMAP.map((row, index) => (
                  <tr
                    key={row.material}
                    className={index % 2 === 0 ? "bg-white/[0.035]" : undefined}
                  >
                    <td className="px-5 py-4 align-top font-semibold text-[#F1F5F9]">
                      {row.material}
                    </td>
                    <td className="px-5 py-4 align-top leading-relaxed text-[#94A3B8]">
                      {row.recommendation}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </figure>
    </div>
  );
}
