'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Plus,
  Minus,
  X,
  Divide,
  Hash,
  type LucideIcon,
} from 'lucide-react';
import { renderMath } from '@/hooks/useKaTeX';
import type { DrillPreview } from '@/config/arithmeticDrillPreviews';
import { cn } from '@/lib/utils';

const LUCIDE_MAP: Record<string, LucideIcon> = {
  Plus,
  Minus,
  X,
  Divide,
  Hash,
};

const katexInherit =
  '[&_.katex]:!text-[inherit] [&_.katex-html]:!text-[inherit]';

/** Per-card interval (7–11s) and start offset so tiles drift out of sync. */
function getSampleCycleTiming(seed: string): {
  intervalMs: number;
  initialDelayMs: number;
} {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return {
    intervalMs: 7000 + (h % 4000),
    initialDelayMs: ((h >>> 8) % 5000) + 800,
  };
}

type ArithmeticDrillPreviewProps = {
  preview: DrillPreview | { kind: 'lucide'; iconKey: string };
  size?: 'folder' | 'card';
  className?: string;
  selected?: boolean;
};

function KatexGlyph({
  latex,
  className,
  nowrap = false,
}: {
  latex: string;
  className?: string;
  nowrap?: boolean;
}) {
  const html = useMemo(() => renderMath(latex, false), [latex]);
  if (!html) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center',
        nowrap && 'whitespace-nowrap',
        katexInherit,
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
      aria-hidden
    />
  );
}

function sampleKey(sample: DrillPreview, index: number): string {
  if (sample.kind === 'latex') return `latex-${index}-${sample.latex}`;
  return `plain-${index}-${sample.text}`;
}

export function ArithmeticDrillPreview({
  preview,
  size = 'card',
  className,
  selected = false,
}: ArithmeticDrillPreviewProps) {
  if (preview.kind === 'lucide') {
    const Icon = LUCIDE_MAP[preview.iconKey] ?? Hash;
    const iconClass =
      size === 'folder'
        ? cn('h-8 w-8', selected ? 'text-primary' : 'text-primary/85')
        : 'h-6 w-6 text-primary/85';
    return (
      <Icon
        className={cn(iconClass, className)}
        strokeWidth={1.75}
        aria-hidden
      />
    );
  }

  if (preview.kind === 'latex') {
    const textClass =
      size === 'folder'
        ? cn(
            'max-w-full text-[1.2rem] font-normal leading-none',
            selected ? 'text-primary' : 'text-primary/90',
          )
        : cn(
            'text-[1.05rem] font-normal leading-tight',
            selected ? 'text-text' : 'text-text-muted',
          );

    return (
      <KatexGlyph
        latex={preview.latex}
        nowrap={size === 'folder'}
        className={cn(textClass, className)}
      />
    );
  }

  const plainClass =
    size === 'folder'
      ? cn(
          'whitespace-nowrap font-mono text-xl font-semibold tabular-nums tracking-tight',
          selected ? 'text-primary' : 'text-text',
        )
      : cn(
          'font-mono text-[1.05rem] font-medium tabular-nums tracking-tight',
          selected ? 'text-text' : 'text-text-muted',
        );

  return (
    <span className={cn(plainClass, className)} aria-hidden>
      {preview.text}
    </span>
  );
}

const CROSSFADE = { duration: 1.35, ease: [0.4, 0, 0.2, 1] as const };

/** Centered samples with slow, staggered crossfade between examples. */
export function ArithmeticVariantExample({
  samples,
  cycleSeed,
  selected = false,
  className,
}: {
  samples: readonly DrillPreview[];
  /** Stable id (e.g. topic-variant) for out-of-sync timing. */
  cycleSeed: string;
  selected?: boolean;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const canCycle = samples.length > 1 && !reduceMotion;
  const { intervalMs, initialDelayMs } = useMemo(
    () => getSampleCycleTiming(cycleSeed),
    [cycleSeed],
  );

  useEffect(() => {
    setIndex(0);
  }, [samples, cycleSeed]);

  useEffect(() => {
    if (!canCycle) return;

    let intervalId: ReturnType<typeof setInterval> | undefined;

    const timeoutId = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        setIndex((i) => (i + 1) % samples.length);
      }, intervalMs);
    }, initialDelayMs);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [canCycle, samples.length, intervalMs, initialDelayMs]);

  if (samples.length === 0) return null;

  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center py-1',
        className,
      )}
      aria-label='Sample question formats'
      aria-live={canCycle ? 'polite' : undefined}
    >
      <div className='relative flex h-9 w-full items-center justify-center'>
        {samples.map((sample, i) => (
          <motion.div
            key={sampleKey(sample, i)}
            className='absolute inset-0 flex items-center justify-center'
            initial={false}
            animate={{ opacity: i === index ? 1 : 0 }}
            transition={CROSSFADE}
            style={{ pointerEvents: 'none' }}
          >
            <ArithmeticDrillPreview
              preview={sample}
              size='card'
              selected={selected}
            />
          </motion.div>
        ))}
      </div>
      {samples.length > 1 ? (
        <div
          className='mt-2 flex items-center justify-center gap-1'
          aria-hidden
        >
          {samples.map((_, i) => (
            <motion.span
              key={i}
              className='h-1 rounded-full bg-text-subtle/35'
              animate={{
                width: i === index ? 12 : 4,
                opacity: i === index ? 0.75 : 0.35,
              }}
              transition={{ duration: 1.35, ease: [0.4, 0, 0.2, 1] }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
