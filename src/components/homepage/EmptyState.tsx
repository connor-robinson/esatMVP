"use client";

import { Card } from "@/components/ui/Card";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card variant="subtle" className="p-8 text-center">
      <h3 className="text-lg font-semibold text-text">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </Card>
  );
}
