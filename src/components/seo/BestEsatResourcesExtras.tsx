import { cn } from "@/lib/utils";
import {
  COMPARISON_RESOURCES,
  COMPARISON_VERIFIED,
  PRACTICE_LOOP_STEPS,
  type ComparisonResource,
} from "@/data/bestEsatResourcesComparison";

/** Desktop table + stacked mobile cards for the quick comparison. */
export function ResourceComparisonTable() {
  return (
    <>
      <div className="hidden md:block">
        <figure className="m-0">
          <div className="overflow-hidden rounded-2xl bg-[#161D2F]">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Quick comparison of ESAT preparation resources. Prices checked{" "}
                {COMPARISON_VERIFIED.shortLabel}.
              </caption>
              <thead>
                <tr>
                  {["Resource", "Best for", "Price", "Our take"].map((column) => (
                    <th
                      key={column}
                      scope="col"
                      className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_RESOURCES.map((resource, rowIndex) => (
                  <tr
                    key={resource.id}
                    className={cn(
                      rowIndex % 2 === 0 ? "bg-white/[0.035]" : undefined,
                      resource.isOurs ? "bg-[#3B82F6]/[0.07]" : undefined,
                    )}
                  >
                    <th
                      scope="row"
                      className="px-5 py-4 align-top font-semibold text-[#F1F5F9]"
                    >
                      <ResourceNameCell resource={resource} />
                    </th>
                    <td className="px-5 py-4 align-top leading-relaxed text-[#94A3B8]">
                      {resource.bestFor}
                    </td>
                    <td className="px-5 py-4 align-top leading-relaxed text-[#94A3B8]">
                      {resource.pricingSummary}
                    </td>
                    <td className="px-5 py-4 align-top leading-relaxed text-[#94A3B8]">
                      {resource.ourTake}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <figcaption className="mt-3 text-sm text-[#94A3B8]">
            Prices and advertised features checked {COMPARISON_VERIFIED.shortLabel}.
          </figcaption>
        </figure>
      </div>

      <ul className="grid gap-3 md:hidden">
        {COMPARISON_RESOURCES.map((resource) => (
          <li
            key={resource.id}
            className={cn(
              "rounded-2xl bg-[#161D2F] p-4",
              resource.isOurs && "ring-1 ring-[#3B82F6]/35",
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-[#F1F5F9]">{resource.name}</p>
              {resource.isOurs ? (
                <span className="rounded-md bg-white/[0.08] px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-[#93C5FD]">
                  Our platform
                </span>
              ) : null}
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                  Best for
                </dt>
                <dd className="mt-0.5 leading-relaxed text-[#94A3B8]">
                  {resource.bestFor}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                  Price
                </dt>
                <dd className="mt-0.5 leading-relaxed text-[#94A3B8]">
                  {resource.pricingSummary}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                  Our take
                </dt>
                <dd className="mt-0.5 leading-relaxed text-[#94A3B8]">
                  {resource.ourTake}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-[#94A3B8] md:hidden">
        Prices and advertised features checked {COMPARISON_VERIFIED.shortLabel}.
      </p>
    </>
  );
}

function ResourceNameCell({ resource }: { resource: ComparisonResource }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span>{resource.name}</span>
      {resource.isOurs ? (
        <span className="w-fit rounded-md bg-white/[0.08] px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-[#93C5FD]">
          Our platform
        </span>
      ) : null}
    </div>
  );
}

/** Accessible practice-loop diagram: horizontal on desktop, vertical on mobile. */
export function PracticeLoopDiagram() {
  return (
    <ol className="flex flex-col gap-0 md:flex-row md:flex-wrap md:items-stretch md:justify-between md:gap-y-4">
      {PRACTICE_LOOP_STEPS.map((step, index) => (
        <li
          key={step}
          className="flex flex-col items-stretch md:max-w-[9.5rem] md:flex-1"
        >
          <div className="flex items-center gap-3 md:flex-col md:items-center md:gap-0 md:text-center">
            <span
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#3B82F6]/15 text-sm font-bold tabular-nums text-[#93C5FD] md:mb-3"
            >
              {index + 1}
            </span>
            <span className="text-sm font-semibold leading-snug text-white md:text-[0.9rem]">
              {step}
            </span>
          </div>
          {index < PRACTICE_LOOP_STEPS.length - 1 ? (
            <span
              aria-hidden
              className="ml-4 block h-6 w-px bg-white/15 md:ml-0 md:mt-3 md:hidden"
            />
          ) : null}
          {index < PRACTICE_LOOP_STEPS.length - 1 ? (
            <span
              aria-hidden
              className="mt-3 hidden text-center text-[#3B82F6]/70 md:block"
            >
              →
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
