import { fetchPublishedTableCatalog } from "@/lib/scoreConverter/publishedTables.server";
import type { ConverterExam } from "@/lib/scoreConverter/esatModules";
import { PublishedConversionTablesClient } from "@/components/tools/scoreConverter/PublishedConversionTablesClient";

type Props = {
  examFilter?: ConverterExam;
};

/** Server-rendered catalog with client-side filters and actions. */
export async function PublishedConversionTables({ examFilter }: Props) {
  const rows = await fetchPublishedTableCatalog(examFilter);

  return (
    <PublishedConversionTablesClient
      rows={rows}
      defaultExam={examFilter ?? "all"}
    />
  );
}
