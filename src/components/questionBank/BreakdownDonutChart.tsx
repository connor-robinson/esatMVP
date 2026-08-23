'use client';

import type { CSSProperties } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

export type DonutSlice = {
  name: string;
  value: number;
  fill: string;
};

interface BreakdownDonutChartProps {
  data: DonutSlice[];
  centerLabel?: string;
  centerValue: string | number;
  className?: string;
  tooltipStyle?: CSSProperties;
  tooltipItemStyle?: CSSProperties;
  tooltipLabelStyle?: CSSProperties;
}

export function BreakdownDonutChart({
  data,
  centerLabel = 'Total',
  centerValue,
  className,
  tooltipStyle,
  tooltipItemStyle,
  tooltipLabelStyle,
}: BreakdownDonutChartProps) {
  const total = data.reduce((sum, slice) => sum + slice.value, 0);

  if (total === 0) {
    return (
      <div
        className={`flex h-[180px] items-center justify-center text-sm text-text-muted ${className ?? ''}`}
      >
        No data
      </div>
    );
  }

  return (
    <div className={`relative mx-auto h-[180px] w-full max-w-[220px] ${className ?? ''}`}>
      <ResponsiveContainer width='100%' height='100%'>
        <PieChart>
          <Pie
            data={data}
            cx='50%'
            cy='50%'
            innerRadius={48}
            outerRadius={72}
            paddingAngle={2}
            dataKey='value'
            stroke='var(--color-border-subtle)'
            strokeWidth={1}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v?: number | string, name?: string) => {
              const n = typeof v === 'number' ? v : Number(v ?? 0);
              return [
                `${n.toLocaleString()} (${((n / total) * 100).toFixed(0)}%)`,
                name ?? '',
              ];
            }}
            contentStyle={{
              borderRadius: 10,
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface-elevated)',
              color: 'var(--color-text)',
              fontSize: 12,
              ...tooltipStyle,
            }}
            itemStyle={{ color: 'var(--color-text)', ...tooltipItemStyle }}
            labelStyle={{ color: 'var(--color-text-muted)', ...tooltipLabelStyle }}
            wrapperStyle={{ zIndex: 40, outline: 'none' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center'>
        <span className='donut-center-label text-[10px] font-semibold uppercase tracking-wide text-text-subtle'>
          {centerLabel}
        </span>
        <span className='donut-center-value text-2xl font-bold tabular-nums text-text'>
          {centerValue}
        </span>
      </div>
    </div>
  );
}
