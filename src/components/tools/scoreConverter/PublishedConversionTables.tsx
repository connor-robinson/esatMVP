import type { ConverterExam } from "@/lib/scoreConverter/esatModules";
import { PublishedConversionTablesClient } from "@/components/tools/scoreConverter/PublishedConversionTablesClient";

type Props = {
  examFilter?: ConverterExam;
};

/**
 * Official conversion tables. Header sits outside any card; catalog loads on
 * first expand so the score-converter page stays fast. Lists ~10 rows with a
 * “… more” control for the rest.
 */
export function PublishedConversionTables({ examFilter }: Props) {
  return (
    <PublishedConversionTablesClient
      defaultExam={examFilter && examFilter !== "TMUA" ? examFilter : "all"}
      examFilter={examFilter === "TMUA" ? undefined : examFilter}
      defaultOpen
    />
  );
}
