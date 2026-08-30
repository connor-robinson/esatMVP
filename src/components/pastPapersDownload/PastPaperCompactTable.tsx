import Link from "next/link";
import type { PastPaperCompactTable as PastPaperCompactTableData } from "@/data/pastPapersDownload";
import { PastPaperCompactDownloadLink } from "./PastPaperCompactDownloadLink";

type Props = {
  table: PastPaperCompactTableData;
};

function UnavailableCell() {
  return <span className="text-[#475569]">—</span>;
}

export function PastPaperCompactTable({ table }: Props) {
  const isSpecification = table.columns === "specification";

  return (
    <div className="overflow-hidden rounded-2xl bg-white/[0.03]">
      <h3 className="px-3 py-2.5 text-sm font-semibold leading-snug text-white">
        {table.heading}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[220px] text-left text-sm">
          <thead>
            <tr className="text-xs text-[#64748B]">
              <th className="px-3 py-1.5 font-medium">Year</th>
              {isSpecification ? (
                <th className="px-3 py-1.5 font-medium">PDF</th>
              ) : (
                <>
                  <th className="px-3 py-1.5 font-medium">Paper</th>
                  <th className="px-3 py-1.5 text-right font-medium">Answers</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {table.rows.map((row) => (
              <tr key={row.id} className="text-white">
                <td className="px-3 py-1.5 font-medium text-[#CBD5E1]">
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
                  <td className="px-3 py-1.5">
                    {row.specificationUrl ? (
                      <PastPaperCompactDownloadLink
                        href={row.specificationUrl}
                        label="PDF"
                        ariaLabel={`Download ${row.label} NSAA specification PDF`}
                      />
                    ) : (
                      <UnavailableCell />
                    )}
                  </td>
                ) : (
                  <>
                    <td className="px-3 py-1.5">
                      {row.paperUrl ? (
                        <PastPaperCompactDownloadLink
                          href={row.paperUrl}
                          label="PDF"
                          ariaLabel={`Download ${row.label} question paper PDF`}
                        />
                      ) : (
                        <UnavailableCell />
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {row.answersUrl ? (
                        <PastPaperCompactDownloadLink
                          href={row.answersUrl}
                          label="PDF"
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
