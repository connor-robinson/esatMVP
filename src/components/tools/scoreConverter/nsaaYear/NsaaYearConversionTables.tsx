import {
  formatTableScore,
  type NsaaSectionTable,
  type NsaaSubjectColumn,
  type NsaaYearPageData,
} from "@/lib/scoreConverter/nsaaYearConversion.shared";
import { NsaaYearTablesFilter } from "@/components/tools/scoreConverter/nsaaYear/NsaaYearTablesFilter";

function SectionConversionTable({
  section,
  subjects,
}: {
  section: NsaaSectionTable;
  subjects: NsaaSubjectColumn[];
}) {
  const sectionId = section.paperName.replace(/\s+/g, "-").toLowerCase();

  return (
    <section className="space-y-2" aria-labelledby={`nsaa-section-${sectionId}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id={`nsaa-section-${sectionId}`}
          className="text-base font-semibold text-text"
        >
          {section.paperName}
        </h2>
        <p className="text-xs text-text-muted">
          Raw marks 0–{section.rawMarks[section.rawMarks.length - 1] ?? 0}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[18rem] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-bg">
            <tr className="bg-surface-mid/90 text-left">
              <th
                scope="col"
                className="sticky left-0 z-20 bg-surface-mid/95 px-2.5 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted"
              >
                Raw
              </th>
              {subjects.map((subject) => (
                <th
                  key={subject.id}
                  scope="col"
                  data-nsaa-subject={subject.id}
                  className="px-2.5 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-text-muted"
                  title={subject.filterLabel}
                >
                  <span className="block sm:hidden">{subject.shortLabel}</span>
                  <span className="hidden sm:block">{subject.subject}</span>
                  <span className="mt-0.5 block text-[10px] font-medium normal-case tracking-normal text-text-subtle">
                    {subject.partName}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {section.rawMarks.map((raw, rowIndex) => (
              <tr
                key={raw}
                className={
                  rowIndex % 2 === 0 ? "bg-surface-subtle/40" : "bg-transparent"
                }
              >
                <th
                  scope="row"
                  className={`sticky left-0 z-[1] px-2.5 py-1 text-left font-semibold tabular-nums text-text ${
                    rowIndex % 2 === 0 ? "bg-surface-subtle/40" : "bg-bg"
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
                      data-nsaa-subject={subject.id}
                      className={`px-2.5 py-1 tabular-nums ${
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

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
        {subjects.map((subject) => (
          <li
            key={subject.id}
            data-nsaa-subject={subject.id}
            className="flex flex-wrap items-center gap-2"
          >
            <span className="font-medium text-text">{subject.subject}</span>
            <a
              href={subject.pdfHref}
              className="font-semibold text-secondary hover:underline"
              download
            >
              PDF
            </a>
            <a
              href={subject.csvHref}
              className="font-semibold text-secondary hover:underline"
              download
            >
              CSV
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

type Props = {
  data: NsaaYearPageData;
};

/** Server-rendered conversion tables; subject filtering is progressive enhancement. */
export function NsaaYearConversionTables({ data }: Props) {
  return (
    <NsaaYearTablesFilter subjects={data.subjects}>
      <div className="space-y-6">
        {data.sections.map((section) => (
          <SectionConversionTable
            key={section.paperName}
            section={section}
            subjects={section.subjects}
          />
        ))}
      </div>
    </NsaaYearTablesFilter>
  );
}
