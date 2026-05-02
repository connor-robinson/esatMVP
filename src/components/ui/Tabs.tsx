import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
}

interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  /** `segmented` = pill group (default). `underline` = PDF inventory D nav tabs (surface-mid track, primary underline). */
  variant?: "segmented" | "underline";
}

export function Tabs({ items, activeId, onChange, className, variant = "segmented" }: TabsProps) {
  if (variant === "underline") {
    return (
      <div
        className={cn(
          "inline-flex gap-0 border-b border-border bg-surface-mid/40 rounded-t-organic-lg px-1",
          className,
        )}
      >
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={cn(
                "relative px-4 py-2.5 text-sm font-medium transition-colors duration-fast ease-signature",
                active ? "text-text" : "text-text-muted hover:text-text",
                active &&
                  "after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-primary",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("inline-flex rounded-organic-lg border border-border bg-surface-subtle p-1", className)}>
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              "rounded-organic-md px-4 py-2 text-sm font-medium transition-all duration-fast ease-signature",
              active
                ? "bg-surface-elevated text-text shadow-sm ring-1 ring-border-subtle"
                : "text-text-muted hover:text-text",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
