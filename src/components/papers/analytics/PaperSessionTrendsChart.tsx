'use client';

import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ChevronDown } from 'lucide-react';
import type { EnrichedPaperSession } from '@/lib/papers/analytics';
import { buildSmoothedTrendSeries } from '@/lib/analytics/sessionTrendSmoothing';
import { extractYearFromVariant } from '@/lib/papers/analytics';
import { cn } from '@/lib/utils';
import { analyticsSelectClass } from './styles';

export type PaperTrendXAxisMode = 'time' | 'session';

interface PaperSessionTrendsChartProps {
  sessions: EnrichedPaperSession[];
}

function formatTimeAxisLabel(ts: number): string {
  return new Date(ts).toLocaleString('en-GB', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTooltipDate(ts: number): string {
  return new Date(ts).toLocaleString('en-GB', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sessionPaperLabel(s: EnrichedPaperSession): string {
  const year = extractYearFromVariant(s.paperVariant);
  return year ? `${s.paperName} ${year}` : `${s.paperName} ${s.paperVariant}`;
}

type ChartRow = {
  sessionNumber: number;
  dateTs: number;
  tooltipLabel: string;
  scorePct: number | null;
  percentile: number | null;
  scoreTrend: number | null;
  percentileTrend: number | null;
  showSmoothedTrend: boolean;
};

function PaperTrendTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: ChartRow }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div className="rounded-organic-md border border-border bg-surface-elevated px-3 py-2.5 text-xs shadow-lg">
      <p className="mb-2 font-medium text-text-muted">{row.tooltipLabel}</p>
      <div className="space-y-1 text-text">
        {row.scorePct != null && (
          <p>
            <span className="text-text-muted">Score: </span>
            <span className="font-semibold text-[var(--color-maths)]">
              {row.scorePct.toFixed(1)}%
            </span>
            {row.showSmoothedTrend && row.scoreTrend != null && (
              <span className="text-text-muted">
                {' '}
                (trend {row.scoreTrend.toFixed(1)}%)
              </span>
            )}
          </p>
        )}
        {row.percentile != null && (
          <p>
            <span className="text-text-muted">Percentile: </span>
            <span className="font-semibold text-[var(--color-accent)]">
              {row.percentile.toFixed(1)}th
            </span>
            {row.showSmoothedTrend && row.percentileTrend != null && (
              <span className="text-text-muted">
                {' '}
                (trend {row.percentileTrend.toFixed(1)}th)
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

export function PaperSessionTrendsChart({ sessions }: PaperSessionTrendsChartProps) {
  const [xAxisMode, setXAxisMode] = useState<PaperTrendXAxisMode>('session');

  const chartData = useMemo((): ChartRow[] => {
    const list = sessions
      .filter((s) => s.startedAt && s.scorePercentage != null)
      .sort((a, b) => (a.startedAt ?? 0) - (b.startedAt ?? 0));

    const scorePct = list.map((s) => s.scorePercentage);
    const percentile = list.map((s) => s.percentile);
    const { accuracyTrend: scoreTrend, speedTrend: percentileTrend } =
      buildSmoothedTrendSeries(scorePct, percentile);

    const showSmoothedTrend = list.length >= 3;

    return list.map((s, index) => {
      const sessionNumber = index + 1;
      const dateTs = s.startedAt!;
      const paper = sessionPaperLabel(s);
      return {
        sessionNumber,
        dateTs,
        tooltipLabel:
          xAxisMode === 'session'
            ? `Session #${sessionNumber} · ${paper} · ${formatTooltipDate(dateTs)}`
            : `${paper} · ${formatTooltipDate(dateTs)}`,
        scorePct: scorePct[index],
        percentile: percentile[index],
        scoreTrend: scoreTrend[index],
        percentileTrend: percentileTrend[index],
        showSmoothedTrend,
      };
    });
  }, [sessions, xAxisMode]);

  const percentileDomain = useMemo((): [number, number] => {
    const values = chartData.flatMap((d) =>
      [d.percentileTrend, d.percentile].filter(
        (v): v is number => v != null,
      ),
    );
    if (values.length === 0) return [0, 100];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = Math.max((max - min) * 0.15, 5);
    return [
      Math.max(0, Math.floor(min - padding)),
      Math.min(100, Math.ceil(max + padding)),
    ];
  }, [chartData]);

  const useSmoothedTrend = chartData.length >= 3;

  if (chartData.length === 0) {
    return (
      <p className="rounded-organic-lg bg-surface-mid px-4 py-12 text-center text-sm text-text-muted">
        Complete scored sessions to see performance trends.
      </p>
    );
  }

  return (
    <div className="rounded-organic-lg bg-surface-mid p-4 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
        <div className="relative shrink-0">
          <select
            value={xAxisMode}
            onChange={(e) =>
              setXAxisMode(e.target.value as PaperTrendXAxisMode)
            }
            className={cn(analyticsSelectClass, 'min-w-[130px]')}
            aria-label="X-axis mode"
          >
            <option value="time">X-axis: Time</option>
            <option value="session">X-axis: Session #</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        </div>
        {useSmoothedTrend && (
          <p className="text-xs text-text-muted sm:ml-auto">
            Dots are session scores; lines show smoothed trend.
          </p>
        )}
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart
          data={chartData}
          margin={{ top: 8, right: 12, left: -4, bottom: 4 }}
        >
          <CartesianGrid
            strokeDasharray="4 6"
            stroke="var(--color-border-subtle)"
            vertical={false}
          />
          {xAxisMode === 'time' ? (
            <XAxis
              dataKey="dateTs"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border-subtle)' }}
              tickFormatter={(ts) => formatTimeAxisLabel(ts)}
              minTickGap={48}
              angle={chartData.length > 6 ? -32 : 0}
              textAnchor={chartData.length > 6 ? 'end' : 'middle'}
              height={chartData.length > 6 ? 56 : 32}
            />
          ) : (
            <XAxis
              dataKey="sessionNumber"
              type="number"
              domain={['dataMin', 'dataMax']}
              allowDecimals={false}
              tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border-subtle)' }}
              tickFormatter={(n) => `#${n}`}
              label={{
                value: 'Session',
                position: 'insideBottom',
                offset: -2,
                fill: 'var(--color-text-subtle)',
                fontSize: 10,
              }}
            />
          )}
          <YAxis
            yAxisId="score"
            domain={[0, 100]}
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border-subtle)' }}
            tickFormatter={(v) => `${v}%`}
            width={44}
          />
          <YAxis
            yAxisId="percentile"
            orientation="right"
            domain={percentileDomain}
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border-subtle)' }}
            tickFormatter={(v) => `${v}`}
            width={44}
            label={{
              value: 'pctile',
              angle: -90,
              position: 'insideRight',
              fill: 'var(--color-text-subtle)',
              fontSize: 10,
              dx: 12,
            }}
          />
          <Tooltip content={<PaperTrendTooltip />} />
          <Legend
            wrapperStyle={{ color: 'var(--color-text-muted)', fontSize: 12 }}
          />
          {useSmoothedTrend ? (
            <>
              <Line
                yAxisId="score"
                type="basis"
                dataKey="scoreTrend"
                stroke="var(--color-maths)"
                strokeWidth={2.5}
                dot={false}
                activeDot={false}
                connectNulls
                name="Score trend"
                legendType="line"
              />
              <Line
                yAxisId="percentile"
                type="basis"
                dataKey="percentileTrend"
                stroke="var(--color-accent)"
                strokeWidth={2.5}
                dot={false}
                activeDot={false}
                connectNulls
                name="Percentile trend"
                legendType="line"
              />
              <Line
                yAxisId="score"
                type="monotone"
                dataKey="scorePct"
                stroke="var(--color-maths)"
                strokeWidth={0}
                dot={{ r: 3, fill: 'var(--color-maths)' }}
                activeDot={{ r: 5, fill: 'var(--color-maths)' }}
                connectNulls
                name="Score %"
                legendType="circle"
              />
              <Line
                yAxisId="percentile"
                type="monotone"
                dataKey="percentile"
                stroke="var(--color-accent)"
                strokeWidth={0}
                dot={{ r: 3, fill: 'var(--color-accent)' }}
                activeDot={{ r: 5, fill: 'var(--color-accent)' }}
                connectNulls
                name="Percentile"
                legendType="circle"
              />
            </>
          ) : (
            <>
              <Line
                yAxisId="score"
                type="monotone"
                dataKey="scorePct"
                stroke="var(--color-maths)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'var(--color-maths)' }}
                activeDot={{ r: 5 }}
                connectNulls
                name="Score %"
              />
              <Line
                yAxisId="percentile"
                type="monotone"
                dataKey="percentile"
                stroke="var(--color-accent)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'var(--color-accent)' }}
                activeDot={{ r: 5 }}
                connectNulls
                name="Percentile"
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
