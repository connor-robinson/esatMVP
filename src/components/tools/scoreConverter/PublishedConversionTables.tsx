import type { ConverterExam } from "@/lib/scoreConverter/esatModules";
import { fetchPublishedTableCatalog } from "@/lib/scoreConverter/publishedTables.server";
import { PublishedConversionTablesClient } from "@/components/tools/scoreConverter/PublishedConversionTablesClient";

type Props = {
  examFilter?: ConverterExam;
};

/**
 * Official conversion tables. Catalog is loaded on the server so crawlers and
 * logged-out visitors get real rows in the initial HTML (robots.txt blocks /api/).
 */
export async function PublishedConversionTables({ examFilter }: Props) {
  const exam =
    examFilter && examFilter !== "TMUA" ? examFilter : undefined;
  const rows = await fetchPublishedTableCatalog(exam);

  return (
    <PublishedConversionTablesClient
      rows={rows}
      defaultExam={exam ?? "all"}
      examFilter={exam}
      defaultOpen
    />
  );
}
