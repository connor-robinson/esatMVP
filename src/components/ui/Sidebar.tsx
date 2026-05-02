import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  header?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Sidebar({ header, children, footer, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full w-full flex-col rounded-organic-lg border border-border-subtle bg-surface-subtle/95 backdrop-blur-sm",
        className,
      )}
    >
      {header ? <div className="border-b border-border-subtle px-4 py-3">{header}</div> : null}
      <div className="flex-1 overflow-auto p-4">{children}</div>
      {footer ? <div className="border-t border-border-subtle px-4 py-3">{footer}</div> : null}
    </aside>
  );
}
