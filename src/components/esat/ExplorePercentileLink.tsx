import Link from "next/link";
import {
  buildExplorerHref,
  moduleIdFromTableKey,
  type EsatExplorerModuleId,
} from "@/lib/esat/percentileCatalog";

type ExplorePercentileLinkProps = {
  score: number;
  tableKey?: string | null;
  moduleLabel?: string | null;
  className?: string;
};

function moduleIdFromLabel(label: string | null | undefined): EsatExplorerModuleId | null {
  if (!label) return null;
  const lower = label.toLowerCase();
  if (lower.includes("mathematics 1") || lower.includes("math 1") || lower.includes("maths 1")) {
    return "math1";
  }
  if (lower.includes("mathematics 2") || lower.includes("math 2") || lower.includes("advanced")) {
    return "math2";
  }
  if (lower.includes("physics")) return "physics";
  if (lower.includes("chem")) return "chemistry";
  if (lower.includes("bio")) return "biology";
  return null;
}

export function ExplorePercentileLink({
  score,
  tableKey,
  moduleLabel,
  className,
}: ExplorePercentileLinkProps) {
  const moduleId = moduleIdFromTableKey(tableKey) ?? moduleIdFromLabel(moduleLabel);
  const href = buildExplorerHref({
    score,
    moduleId,
  });

  return (
    <p className={className}>
      <Link
        href={href}
        className="inline-flex min-h-11 items-center text-sm font-medium text-[#93C5FD] transition-colors hover:text-white"
      >
        Explore ESAT scores across every module and test cycle →
      </Link>
      {moduleLabel ? (
        <span className="sr-only">{` Opens the percentile explorer for ${moduleLabel} at ${score.toFixed(1)}.`}</span>
      ) : null}
    </p>
  );
}
