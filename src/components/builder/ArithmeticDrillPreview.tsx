'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { LUCIDE_ICON_MAP } from '@/config/drillDisplayFolders';
import { renderMath } from '@/hooks/useKaTeX';
import type { DrillPreview } from '@/config/drillPreviews';
import type { FolderSymbol } from '@/config/drillDisplayFolders';
import { cn } from '@/lib/utils';

const katexInherit =
  '[&_.katex]:!text-[inherit] [&_.katex-html]:!text-[inherit]';

/** ~5s per example; staggered start so cards do not flip in sync. */
function getSampleCycleTiming(seed: string): {
  intervalMs: number;
  initialDelayMs: number;
} {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return {
    intervalMs: 4800 + (h % 400),
    initialDelayMs: (h >>> 8) % 4800,
  };
}

type ArithmeticDrillPreviewProps = {
  preview: DrillPreview | FolderSymbol;
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
    const Icon = LUCIDE_ICON_MAP[preview.iconKey] ?? LUCIDE_ICON_MAP.Hash;
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

const SAMPLE_TRANSITION = {
  duration: 0.32,
  ease: [0.22, 1, 0.36, 1] as const,
};

/** One sample at a time; ~5s cycle with vertical slide (staggered per card). */
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

    const timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        setIndex((i) => (i + 1) % samples.length);
      }, intervalMs);
    }, initialDelayMs);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId !== undefined) {
        clearInterval(intervalId);
      }
    };
  }, [canCycle, samples.length, intervalMs, initialDelayMs]);

  if (samples.length === 0) return null;

  const activeSample = samples[index];

  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center py-0.5',
        className,
      )}
      aria-label='Sample question formats'
      aria-live={canCycle ? 'polite' : undefined}
    >
      <div className='relative flex h-8 w-full items-center justify-center overflow-hidden'>
        {canCycle ? (
          <AnimatePresence mode='wait' initial={false}>
            <motion.div
              key={sampleKey(activeSample, index)}
              className='flex items-center justify-center'
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={SAMPLE_TRANSITION}
            >
              <ArithmeticDrillPreview
                preview={activeSample}
                size='card'
                selected={selected}
              />
            </motion.div>
          </AnimatePresence>
        ) : (
          <ArithmeticDrillPreview
            preview={activeSample}
            size='card'
            selected={selected}
          />
        )}
      </div>
      {samples.length > 1 ? (
        <div
          className='mt-1.5 flex items-center justify-center gap-1'
          aria-hidden
        >
          {samples.map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-1 rounded-full bg-text-subtle/35 transition-all duration-300',
                i === index ? 'w-2.5 opacity-80' : 'w-1 opacity-35',
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
