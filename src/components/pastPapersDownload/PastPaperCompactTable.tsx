import Link from "next/link";
import type { PastPaperCompactTable as PastPaperCompactTableData } from "@/data/pastPapersDownload";
import { PastPaperCompactDownloadLink } from "./PastPaperCompactDownloadLink";
import { PastPaperPracticeLink } from "./PastPaperPracticeLink";

type Props = {
  table: PastPaperCompactTableData;
};

function UnavailableCell() {
  return <span className="whitespace-nowrap text-sm text-[#94A3B8]">Not available</span>;
}

export function PastPaperCompactTable({ table }: Props) {
  const isSpecification = table.columns === "specification";

  return (
    <div className="overflow-hidden rounded-2xl bg-[#161D2F]">
      <div className="px-5 py-3.5">
        <h3 className="text-base font-semibold tracking-tight text-[#F1F5F9]">
          {table.heading}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] text-left text-base">
          <thead>
            <tr className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
              <th className="w-[18%] px-5 py-3.5">Year</th>
              {isSpecification ? (
                <th className="px-5 py-3.5">PDF</th>
              ) : (
                <>
                  <th className="px-5 py-3.5">Paper</th>
                  <th className="px-5 py-3.5">Answers</th>
                  <th className="px-5 py-3.5">ESAT Camp</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, index) => (
              <tr
                key={row.id}
                className={
                  index % 2 === 0 ? "bg-white/[0.035]" : "bg-transparent"
                }
              >
                <td className="px-5 py-5 text-base font-medium tabular-nums text-[#F1F5F9]">
                  {row.detailHref ? (
                    <Link
                      href={row.detailHref}
                      className="transition-colors hover:text-[#93C5FD]"
                    >
                      {row.label}
                    </Link>
                  ) : (
                    row.label
                  )}
                </td>
                {isSpecification ? (
                  <td className="px-5 py-5">
                    {row.specificationUrl ? (
                      <PastPaperCompactDownloadLink
                        href={row.specificationUrl}
                        label="Specification"
                        ariaLabel={`Download ${row.label} specification PDF`}
                      />
                    ) : (
                      <UnavailableCell />
                    )}
                  </td>
                ) : (
                  <>
                    <td className="px-5 py-5">
                      {row.paperUrl ? (
                        <PastPaperCompactDownloadLink
                          href={row.paperUrl}
                          label="Past Paper"
                          ariaLabel={`Download ${row.label} past paper PDF`}
                        />
                      ) : (
                        <UnavailableCell />
                      )}
                    </td>
                    <td className="px-5 py-5">
                      {row.answersUrl ? (
                        <PastPaperCompactDownloadLink
                          href={row.answersUrl}
                          label={row.answersLabel ?? "Answer Key"}
                          ariaLabel={`Download ${row.label} ${
                            row.answersLabel ?? "answer key"
                          } PDF`}
                        />
                      ) : (
                        <UnavailableCell />
                      )}
                    </td>
                    <td className="px-5 py-5">
                      {row.practiceHref ? (
                        <PastPaperPracticeLink
                          href={row.practiceHref}
                          ariaLabel={`Start ${row.label} in ESAT Camp`}
                        />
                      ) : (
                        <UnavailableCell />
                      )}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
