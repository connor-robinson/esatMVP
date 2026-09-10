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
    <div className={cn("statement-items-list space-y-2 sm:space-y-2.5", className)}>
      {items.map((item) => (
        <div
          key={item.number}
          className="grid grid-cols-[2rem_1fr] items-start gap-x-2 gap-y-0"
        >
          <span className="statement-item-num pt-0.5 tabular-nums text-inherit">
            {item.number}.
          </span>
          <StemContent
            content={item.textMarkdown}
            className="text-inherit leading-[inherit]"
          />
        </div>
      ))}
    </div>
  );
}
