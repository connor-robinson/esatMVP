import Link from "next/link";
import type { PastPaperCompactTable as PastPaperCompactTableData } from "@/data/pastPapersDownload";
import { PastPaperCompactDownloadLink } from "./PastPaperCompactDownloadLink";

type Props = {
  table: PastPaperCompactTableData;
};

function UnavailableCell() {
  return <span className="text-sm text-[#64748B]">—</span>;
}

export function PastPaperCompactTable({ table }: Props) {
  const isSpecification = table.columns === "specification";

  return (
    <div className="overflow-hidden rounded-2xl bg-[#1E293B]">
      <div className="bg-[#334155]/50 px-4 py-2.5">
        <h3 className="text-lg font-semibold text-white">{table.heading}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[280px] text-left text-base">
          <thead>
            <tr className="text-sm font-semibold text-[#94A3B8]">
              <th className="w-[32%] px-4 py-1.5">Year</th>
              {isSpecification ? (
                <th className="px-4 py-1.5">PDF</th>
              ) : (
                <>
                  <th className="px-4 py-1.5">Paper</th>
                  <th className="px-4 py-1.5">Answers</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, index) => (
              <tr
                key={row.id}
                className={
                  index % 2 === 0 ? "bg-white/[0.04]" : "bg-transparent"
                }
              >
                <td className="px-4 py-1 text-base font-medium text-[#F1F5F9]">
                  {row.detailHref ? (
                    <Link
                      href={row.detailHref}
                      className="transition-colors hover:text-[#3B82F6]"
                    >
                      {row.label}
                    </Link>
                  ) : (
                    row.label
                  )}
                </td>
                {isSpecification ? (
                  <td className="px-4 py-1">
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
                    <td className="px-4 py-1">
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
                    <td className="px-4 py-1">
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
