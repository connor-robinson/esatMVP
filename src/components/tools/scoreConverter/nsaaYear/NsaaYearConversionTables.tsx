import {
  formatTableScore,
  nsaaYearCombinedPdfHref,
  type NsaaSectionTable,
  type NsaaSubjectColumn,
  type NsaaYearPageData,
} from "@/lib/scoreConverter/nsaaYearConversion.shared";

function SectionConversionTable({
  section,
  subjects,
}: {
  section: NsaaSectionTable;
  subjects: NsaaSubjectColumn[];
}) {
  const sectionId = section.paperName.replace(/\s+/g, "-").toLowerCase();

  return (
    <section className="space-y-2.5" aria-labelledby={`nsaa-section-${sectionId}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id={`nsaa-section-${sectionId}`}
          className="text-lg font-semibold text-text"
        >
          {section.paperName} Table
        </h2>
        <p className="text-sm text-text-muted">
          Raw marks 0–{section.rawMarks[section.rawMarks.length - 1] ?? 0}
        </p>
      </div>

      <div className="overflow-x-auto rounded-organic-lg bg-surface-elevated">
        <table className="w-full min-w-[20rem] border-collapse text-base">
          <thead className="sticky top-0 z-10">
            <tr className="bg-surface-mid text-left">
              <th
                scope="col"
                className="sticky left-0 z-20 bg-surface-mid px-3.5 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-text-muted"
              >
                Raw
              </th>
              {subjects.map((subject) => (
                <th
                  key={subject.id}
                  scope="col"
                  className="px-3.5 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-text-muted"
                  title={subject.filterLabel}
                >
                  <span className="block sm:hidden">{subject.shortLabel}</span>
                  <span className="hidden sm:block">{subject.subject}</span>
                  <span className="mt-0.5 block text-[11px] font-medium normal-case tracking-normal text-text-subtle">
                    {subject.partName}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/70">
            {section.rawMarks.map((raw, rowIndex) => (
              <tr
                key={raw}
                className={
                  rowIndex % 2 === 0
                    ? "bg-surface-subtle/45"
                    : "bg-surface-elevated"
                }
              >
                <th
                  scope="row"
                  className={`sticky left-0 z-[1] px-3.5 py-2 text-left text-base font-semibold tabular-nums text-text ${
                    rowIndex % 2 === 0
                      ? "bg-surface-subtle/45"
                      : "bg-surface-elevated"
                  }`}
                >
                  {raw}
                </th>
                {subjects.map((subject) => {
                  const { text, missing } = formatTableScore(
                    subject.scoresByRaw[raw],
                  );
                  return (
                    <td
                      key={subject.id}
                      className={`px-3.5 py-2 text-base tabular-nums ${
                        missing ? "text-text-subtle" : "font-medium text-text"
                      }`}
                      title={
                        missing
                          ? "No published score for this raw mark"
                          : undefined
                      }
                    >
                      {text}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type Props = {
  data: NsaaYearPageData;
};

export function NsaaYearConversionTables({ data }: Props) {
  const pdfHref = nsaaYearCombinedPdfHref(data.year);

  return (
    <div className="space-y-4">
      <div className="space-y-6">
        {data.sections.map((section) => (
          <SectionConversionTable
            key={section.paperName}
            section={section}
            subjects={section.subjects}
          />
        ))}
      </div>

      <div className="flex justify-end pt-1">
        <a
          href={pdfHref}
          download
          className="inline-flex items-center rounded-organic-md bg-secondary px-3.5 py-2 text-sm font-semibold text-background transition-colors hover:brightness-110"
        >
          Download PDF
        </a>
      </div>
    </div>
  );
}
