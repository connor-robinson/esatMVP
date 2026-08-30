import Link from "next/link";
import type { PastPaperCompactTable as PastPaperCompactTableData } from "@/data/pastPapersDownload";
import { PastPaperCompactDownloadLink } from "./PastPaperCompactDownloadLink";

type Props = {
  table: PastPaperCompactTableData;
};

function UnavailableCell() {
  return <span className="text-sm text-[#475569]">—</span>;
}

export function PastPaperCompactTable({ table }: Props) {
  const isSpecification = table.columns === "specification";

  return (
    <div className="overflow-hidden rounded-2xl bg-[#111827]/80">
      <div className="bg-white/[0.04] px-4 py-3">
        <h3 className="text-base font-semibold text-white">{table.heading}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[280px] text-left">
          <thead>
            <tr className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
              <th className="w-[38%] px-4 py-2.5">Year</th>
              {isSpecification ? (
                <th className="px-4 py-2.5">PDF</th>
              ) : (
                <>
                  <th className="px-4 py-2.5">Paper</th>
                  <th className="px-4 py-2.5">Answers</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, index) => (
              <tr
                key={row.id}
                className={
                  index % 2 === 0 ? "bg-white/[0.02]" : "bg-transparent"
                }
              >
                <td className="px-4 py-2.5 text-sm font-medium text-[#E2E8F0]">
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
                  <td className="px-4 py-2.5">
                    {row.specificationUrl ? (
                      <PastPaperCompactDownloadLink
                        href={row.specificationUrl}
                        label="Download"
                        ariaLabel={`Download ${row.label} specification PDF`}
                      />
                    ) : (
                      <UnavailableCell />
                    )}
                  </td>
                ) : (
                  <>
                    <td className="px-4 py-2.5">
                      {row.paperUrl ? (
                        <PastPaperCompactDownloadLink
                          href={row.paperUrl}
                          label="Download"
                          ariaLabel={`Download ${row.label} question paper PDF`}
                        />
                      ) : (
                        <UnavailableCell />
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {row.answersUrl ? (
                        <PastPaperCompactDownloadLink
                          href={row.answersUrl}
                          label="Download"
                          ariaLabel={`Download ${row.label} answer key PDF`}
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
