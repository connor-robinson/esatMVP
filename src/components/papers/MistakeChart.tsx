/**
 * Mistake breakdown donut chart component
 */

import { useMemo } from "react";
import type { MistakeTag } from "@/types/papers";
import { PAPER_COLORS } from "@/config/colors";

interface MistakeChartProps {
  mistakeTags: MistakeTag[];
  className?: string;
}

export function MistakeChart({ mistakeTags, className }: MistakeChartProps) {
  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};
    const add = (label: string) => {
      const key = label.trim();
      if (!key) return; // ignore empties
      if (/^none$/i.test(key)) return; // ignore explicit none
      counts[key] = (counts[key] ?? 0) + 1;
    };

    mistakeTags.forEach((tag: any) => {
      if (Array.isArray(tag)) {
        tag.forEach((t) => {
          if (typeof t === 'string') {
            t.split(',').forEach(add);
          }
        });
      } else if (typeof tag === 'string') {
        tag.split(',').forEach(add);
      }
      // else ignore null/undefined
    });

    const entries = Object.entries(counts)
      .filter(([, c]) => c > 0)
      .sort((a, b) => b[1] - a[1]);

    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    return { entries, total };
  }, [mistakeTags]);

  if (chartData.total === 0) {
    return (
      <div className={`p-6 text-center ${className}`}>
        <div className="text-sm text-neutral-500">No mistakes yet — scroll down to "Mistake Analysis & Drill Setup" to tag mistakes and build your drill.</div>
      </div>
    );
  }

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const centerX = 48;
  const centerY = 48;
  const strokeWidth = 16;

  let currentOffset = 0;

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-sm font-medium text-neutral-200">Mistake Breakdown</div>
      
      <div className="flex items-center gap-6">
        {/* Donut Chart */}
        <div className="flex-shrink-0">
          <svg width="96" height="96" viewBox="0 0 96 96">
            {/* Background circle */}
            <circle
              cx={centerX}
              cy={centerY}
              r={radius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth={strokeWidth}
            />
            
            {/* Data segments */}
            {chartData.entries.map(([key, count], index) => {
              const percentage = count / chartData.total;
              const strokeDasharray = `${percentage * circumference} ${circumference}`;
              const strokeDashoffset = -currentOffset;
              
              currentOffset += percentage * circumference;
              
              const colors = [
                PAPER_COLORS.biology,
                PAPER_COLORS.chemistry,
                PAPER_COLORS.mathematics,
                PAPER_COLORS.physics,
                PAPER_COLORS.advanced
              ];
              const color = colors[index % colors.length];
              
              return (
                <circle
                  key={key}
                  cx={centerX}
                  cy={centerY}
                  r={radius}
                  fill="none"
                  stroke={color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-300 ease-signature"
                />
              );
            })}
            
            {/* Center hole - transparent so parent background shows through */}
            <circle
              cx={centerX}
              cy={centerY}
              r={radius - strokeWidth / 2}
              fill="transparent"
            />
          </svg>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2">
          {chartData.entries.map(([key, count], index) => {
            const percentage = Math.round((count / chartData.total) * 100);
            const colors = [
              PAPER_COLORS.biology,
              PAPER_COLORS.chemistry,
              PAPER_COLORS.mathematics,
              PAPER_COLORS.physics,
              PAPER_COLORS.advanced
            ];
            const color = colors[index % colors.length];
            
            return (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm text-neutral-300">{key}</span>
                </div>
                <div className="text-sm text-neutral-400">
                  {count} ({percentage}%)
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


