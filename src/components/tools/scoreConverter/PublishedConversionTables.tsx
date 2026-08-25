import type { ConverterExam } from "@/lib/scoreConverter/esatModules";
import { PublishedConversionTablesClient } from "@/components/tools/scoreConverter/PublishedConversionTablesClient";

type Props = {
  examFilter?: ConverterExam;
};

/**
 * Official conversion tables. Collapsed by default; catalog loads on expand
 * so the score-converter page stays fast.
 */
export function PublishedConversionTables({ examFilter }: Props) {
  return (
    <PublishedConversionTablesClient
      defaultExam={examFilter && examFilter !== "TMUA" ? examFilter : "all"}
      examFilter={examFilter === "TMUA" ? undefined : examFilter}
      defaultOpen={false}
    />
  );
}
