/**
 * Timer display component for countdown
 */

import { cn } from "@/lib/utils";

interface TimerDisplayProps {
  remainingSeconds: number;
  totalMinutes: number;
  className?: string;
  variant?: "default" | "warning" | "critical";
}

export function TimerDisplay({ 
  remainingSeconds, 
  totalMinutes, 
  className,
  variant = "default" 
}: TimerDisplayProps) {
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSecs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "critical":
        return "text-error bg-error/10 ring-error/30";
      case "warning":
        return "text-warning bg-warning/10 ring-warning/30";
      default:
        return "text-neutral-100 bg-white/5 ring-white/10";
    }
  };

  const isWarning = remainingSeconds <= totalMinutes * 30; // Warning at 50% time left
  const isCritical = remainingSeconds <= totalMinutes * 6; // Critical at 10% time left

  const currentVariant = isCritical ? "critical" : isWarning ? "warning" : "default";

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-organic-lg px-6 py-4 ring-1",
        getVariantStyles(),
        className
      )}
    >
      <div className="text-sm text-neutral-400">Time remaining</div>
      <div className="text-4xl font-bold tabular-nums tracking-tight">
        {formatTime(remainingSeconds)}
      </div>
    </div>
  );
}


