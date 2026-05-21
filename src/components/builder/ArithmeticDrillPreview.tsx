'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
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

const SAMPLE_CYCLE_MS = 3200;

type ArithmeticDrillPreviewProps = {
  preview: DrillPreview | { kind: 'lucide'; iconKey: string };
  size?: 'folder' | 'card';
  className?: string;
  selected?: boolean;
};

function KatexGlyph({
  latex,
  className,
}: {
  latex: string;
  className?: string;
}) {
  const html = useMemo(() => renderMath(latex, false), [latex]);
  if (!html) return null;
  return (
    <span
      className={cn('inline-flex items-center justify-center', katexInherit, className)}
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
            'text-[1.35rem] font-normal leading-none',
            selected ? 'text-primary' : 'text-primary/90',
          )
        : cn(
            'text-[1.05rem] font-normal leading-tight',
            selected ? 'text-text' : 'text-text-muted',
          );

    return (
      <KatexGlyph latex={preview.latex} className={cn(textClass, className)} />
    );
  }

  const plainClass =
    size === 'folder'
      ? cn(
          'font-mono text-xl font-semibold tabular-nums tracking-tight',
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

/** Centered samples that gently cycle — implies illustrative, not a fixed question. */
export function ArithmeticVariantExample({
  samples,
  selected = false,
  className,
}: {
  samples: readonly DrillPreview[];
  selected?: boolean;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const canCycle = samples.length > 1 && !reduceMotion;

  useEffect(() => {
    setIndex(0);
  }, [samples]);

  useEffect(() => {
    if (!canCycle) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % samples.length);
    }, SAMPLE_CYCLE_MS);
    return () => window.clearInterval(id);
  }, [canCycle, samples.length]);

  const active = samples[index] ?? samples[0];
  if (!active) return null;

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
        <AnimatePresence mode='wait' initial={false}>
          <motion.div
            key={sampleKey(active, index)}
            className='absolute inset-0 flex items-center justify-center'
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
          >
            <ArithmeticDrillPreview
              preview={active}
              size='card'
              selected={selected}
            />
          </motion.div>
        </AnimatePresence>
      </div>
      {samples.length > 1 ? (
        <div
          className='mt-2 flex items-center justify-center gap-1'
          aria-hidden
        >
          {samples.map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-1 rounded-full transition-all duration-300',
                i === index
                  ? 'w-3 bg-text-muted/70'
                  : 'w-1 bg-text-subtle/35',
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
