import { cn } from "@/lib/utils";
import {
  groupQuestions,
  type PastPaperDuplicateGroup,
} from "@/content/pastPaperDuplicateGroups";
import type { QuestionRelevanceStatus } from "@/content/pastPaperQuestionMap";
import { RelevanceBadge } from "./RelevanceBadge";

const LEGEND: { status: QuestionRelevanceStatus; meaning: string }[] = [
  { status: "use", meaning: "Solve this copy. It is the one we treat as canonical." },
  {
    status: "duplicate",
    meaning:
      "The same question in the other exam's paper for that year. Skip it, or you are marking your own recall.",
  },
  {
    status: "supplementary",
    meaning: "Useful practice, but not shaped like a current ESAT question.",
  },
  {
    status: "skip",
    meaning: "Outside the current ESAT specification, so it costs time and teaches nothing new.",
  },
  {
    status: "unverified",
    meaning: "We have not checked this question yet. Assume nothing either way.",
  },
];

function ref(question: { paper: string; section: string; questionNumber: number }) {
  return `${question.paper} · ${question.section} Q${question.questionNumber}`;
}

/**
 * Preview of the duplicate map. Deliberately a preview: it shows the pairs we
 * have actually checked rather than implying the whole archive is mapped.
 */
export function QuestionMapPreview({
  groups,
  limit,
  caption,
  showLegend = false,
  className,
}: {
  groups: readonly PastPaperDuplicateGroup[];
  limit?: number;
  caption?: string;
  showLegend?: boolean;
  className?: string;
}) {
  const rows = (limit ? groups.slice(0, limit) : groups)
    .map((group) => {
      const [canonical, ...duplicates] = groupQuestions(group);
      if (!canonical || !duplicates.length) return null;
      return { group, canonical, duplicate: duplicates[0] };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  return (
    <div className={cn("space-y-5", className)}>
      <figure className="m-0">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="min-w-[42rem] overflow-hidden rounded-2xl bg-white/[0.04]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-white/[0.04]">
                  {["Year", "Solve this", "Skip this", "Module", "Confidence"].map(
                    (column) => (
                      <th
                        key={column}
                        scope="col"
                        className="px-4 py-3.5 text-xs font-bold uppercase tracking-[0.12em] text-[#93C5FD]"
                      >
                        {column}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ group, canonical, duplicate }, index) => (
                  <tr
                    key={group.id}
                    className={index % 2 === 1 ? "bg-white/[0.02]" : undefined}
                  >
                    <th
                      scope="row"
                      className="px-4 py-3.5 text-left align-top font-semibold tabular-nums text-white"
                    >
                      {canonical.year}
                    </th>
                    <td className="px-4 py-3.5 align-top">
                      <a
                        href={canonical.sourcePdfUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="text-white underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-[#3B82F6]"
                      >
                        {ref(canonical)}
                      </a>
                    </td>
                    <td className="px-4 py-3.5 align-top text-[#94A3B8]">
                      {ref(duplicate)}
                    </td>
                    <td className="px-4 py-3.5 align-top text-[#94A3B8]">
                      {canonical.esatModules.join(", ")}
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <RelevanceBadge
                        relevance={group.verified ? "use" : "unverified"}
                        className={group.verified ? undefined : "opacity-90"}
                      />
                      <span className="mt-1.5 block text-xs text-[#94A3B8]">
                        {group.verified ? "Identical text" : "Very close text"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {caption ? (
          <figcaption className="mt-3 text-sm leading-relaxed text-[#94A3B8]">
            {caption}
          </figcaption>
        ) : null}
      </figure>

      {showLegend ? (
        <div className="rounded-2xl bg-white/[0.04] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#3B82F6]">
            What the labels mean
          </p>
          <dl className="mt-4 space-y-3">
            {LEGEND.map((entry) => (
              <div
                key={entry.status}
                className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:gap-4"
              >
                <dt className="shrink-0 sm:w-40">
                  <RelevanceBadge relevance={entry.status} />
                </dt>
                <dd className="text-sm leading-relaxed text-[#94A3B8]">
                  {entry.meaning}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </div>
  );
}
