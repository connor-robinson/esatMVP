/**
 * StepCard component for the papers wizard
 */

import { ReactNode } from "react";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface StepCardProps {
  number: number;
  title: string;
  completed: boolean;
  disabled?: boolean;
  children: ReactNode;
}

export function StepCard({ number, title, completed, disabled = false, children }: StepCardProps) {
  return (
    <Card className={cn(
      "p-6 transition-all duration-fast border-0",
      disabled ? "opacity-50 pointer-events-none" : ""
    )}>
      <div className="space-y-4">
        {/* Step Header */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
              completed ? "bg-primary text-background" : "bg-surface-subtle text-text-muted"
            )}
          >
            {completed ? <Check className="h-4 w-4" strokeWidth={3} /> : number}
          </div>
          <h3 className="text-lg font-semibold text-text">{title}</h3>
          {completed && (
            <div className="ml-auto text-xs font-medium text-primary">Completed</div>
          )}
        </div>
        
        {/* Step Content */}
        <div className={cn(
          "transition-all duration-fast",
          completed ? "opacity-100" : "opacity-100"
        )}>
          {children}
        </div>
      </div>
    </Card>
  );
}
