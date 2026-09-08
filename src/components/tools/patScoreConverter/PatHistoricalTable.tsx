import {
  listPatYearsNewestFirst,
  percentileMethodLabel,
} from "@/lib/patScoreConverter/years";
import { round1 } from "@/lib/patScoreConverter/percentile";

function formatMeanSd(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "–";
  return round1(value).toFixed(1);
}

function formatBenchmark(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "–";
  return String(value);
}

export function PatHistoricalTable() {
  const rows = listPatYearsNewestFirst();

  return (
    <section aria-labelledby="pat-historical-table-heading">
      <div className="mb-3">
        <h2
          id="pat-historical-table-heading"
          className="text-lg font-bold tracking-tight text-text sm:text-xl"
        >
          Historical PAT score data
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-text-muted">
          Official Oxford Physics cohort statistics. Shortlisting marks are shown
          only when Oxford published a PAT-score cut-off for that year.
        </p>
      </div>

      <div className="overflow-x-auto rounded-organic-lg bg-surface-elevated shadow-modal-card">
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <thead>
            <tr className="bg-surface-mid text-left">
              <th
                scope="col"
                className="px-3.5 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-text-muted"
              >
                Year
              </th>
              <th
                scope="col"
                className="px-3.5 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-text-muted"
              >
                Mean
              </th>
              <th
                scope="col"
                className="px-3.5 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-text-muted"
              >
                SD
              </th>
              <th
                scope="col"
                className="px-3.5 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-text-muted"
              >
                Historical shortlisting benchmark
              </th>
              <th
                scope="col"
                className="px-3.5 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-text-muted"
              >
                Format note
              </th>
              <th
                scope="col"
                className="px-3.5 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-text-muted"
              >
                Percentile method
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/70">
            {rows.map((row, index) => (
              <tr
                key={row.year}
                className={
                  index % 2 === 0 ? "bg-surface-subtle/45" : "bg-surface-elevated"
                }
              >
                <th
                  scope="row"
                  className="px-3.5 py-2.5 text-left text-sm font-semibold tabular-nums text-text"
                >
                  {row.year}
                </th>
                <td className="px-3.5 py-2.5 tabular-nums font-medium text-text">
                  {formatMeanSd(row.mean)}
                </td>
                <td className="px-3.5 py-2.5 tabular-nums font-medium text-text">
                  {formatMeanSd(row.sd)}
                </td>
                <td className="px-3.5 py-2.5 tabular-nums font-medium text-text">
                  {formatBenchmark(row.shortlistingBenchmark)}
                </td>
                <td className="px-3.5 py-2.5 text-text-muted">{row.formatLabel}</td>
                <td className="px-3.5 py-2.5 text-text-muted">
                  {percentileMethodLabel(row.percentileMethod)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
