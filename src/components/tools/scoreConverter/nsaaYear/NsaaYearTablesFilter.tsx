"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  nsaaSubjectPillClass,
  type NsaaSubjectColumn,
} from "@/lib/scoreConverter/nsaaYearConversion.shared";

const controlBase =
  "border-0 shadow-none outline-none focus:outline-none focus:ring-0 focus:border-0";

type Props = {
  subjects: NsaaSubjectColumn[];
  children: ReactNode;
  /** Optional trailing action (e.g. year PDF download). */
  trailing?: ReactNode;
};

/**
 * Progressive enhancement: all table columns stay in the HTML. Filtering only
 * toggles visibility client-side so crawlers and no-JS users still see every score.
 */
export function NsaaYearTablesFilter({ subjects, children, trailing }: Props) {
  const rootId = useId();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(subjects.map((s) => s.id)),
  );

  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root) return;
    const nodes = root.querySelectorAll<HTMLElement>("[data-nsaa-subject]");
    nodes.forEach((node) => {
      const id = node.dataset.nsaaSubject;
      if (!id) return;
      const show = selectedIds.has(id);
      node.hidden = !show;
      node.style.display = show ? "" : "none";
    });
  }, [rootId, selectedIds]);

  const allSelected = selectedIds.size === subjects.length;

  return (
    <div id={rootId} className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
            Subjects
          </span>
          <button
            type="button"
            onClick={() =>
              setSelectedIds(
                allSelected
                  ? new Set()
                  : new Set(subjects.map((s) => s.id)),
              )
            }
            className={cn(
              "rounded-organic-md px-2.5 py-1 text-xs font-semibold text-secondary transition-colors hover:bg-surface-mid",
              controlBase,
            )}
          >
            {allSelected ? "Deselect all" : "Select all"}
          </button>
        </div>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Filter subjects"
        >
          {subjects.map((subject) => {
            const checked = selectedIds.has(subject.id);
            return (
              <label
                key={subject.id}
                className={cn(
                  "inline-flex cursor-pointer items-center rounded-organic-md px-3 py-1.5 text-sm font-semibold transition-colors",
                  nsaaSubjectPillClass(subject.subject, checked),
                  controlBase,
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(subject.id)) next.delete(subject.id);
                      else next.add(subject.id);
                      return next;
                    });
                  }}
                  className="sr-only"
                />
                <span>{subject.subject}</span>
              </label>
            );
          })}
        </div>
      </div>

      {children}

      {selectedIds.size === 0 ? (
        <p className="text-sm text-text-muted">
          Select at least one subject to show a conversion table.
        </p>
      ) : null}

      {trailing ? (
        <div className="flex justify-end pt-1">{trailing}</div>
      ) : null}
    </div>
  );
}
