"use client";

import { StemContent } from "@/components/shared/StemContent";
import type { StatementItem } from "@/lib/questionBank/statementItems";
import { cn } from "@/lib/utils";

interface StatementItemsListProps {
  items: StatementItem[];
  className?: string;
}

/** Vertical numbered statement list for ESAT three-statement questions. */
export function StatementItemsList({ items, className }: StatementItemsListProps) {
  return (
    <div className={cn("space-y-3 sm:space-y-4", className)}>
      {items.map((item) => (
        <div
          key={item.number}
          className="grid grid-cols-[2rem_1fr] items-start gap-x-2 gap-y-0"
        >
          <span className="pt-0.5 text-sm font-semibold tabular-nums text-text">
            {item.number}.
          </span>
          <StemContent
            content={item.textMarkdown}
            className="text-inherit text-[0.98rem] leading-relaxed sm:text-[1.02rem]"
          />
        </div>
      ))}
    </div>
  );
}
