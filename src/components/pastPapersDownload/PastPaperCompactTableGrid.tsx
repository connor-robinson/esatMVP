import type { PastPaperCompactTable as PastPaperCompactTableData } from "@/data/pastPapersDownload";
import { PastPaperCompactTable } from "./PastPaperCompactTable";

type Props = {
  tables: PastPaperCompactTableData[];
  title?: string;
};

export function PastPaperCompactTableGrid({ tables, title }: Props) {
  if (tables.length === 0) return null;

  return (
    <section className="space-y-4">
      {title ? (
        <h2 className="text-2xl font-display font-bold tracking-tight text-white sm:text-3xl">
          {title}
        </h2>
      ) : null}
      <div className="grid gap-5 lg:grid-cols-2 lg:gap-6 xl:grid-cols-2">
        {tables.map((table) => (
          <PastPaperCompactTable key={table.id} table={table} />
        ))}
      </div>
    </section>
  );
}
