'use client';

import { useMemo } from 'react';
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

type ArithmeticDrillPreviewProps = {
  preview: DrillPreview | { kind: 'lucide'; iconKey: string };
  /** Folder tile (large) vs module card (compact glyph). */
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
            'text-[1.125rem] font-normal leading-tight',
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
          'font-mono text-[1.125rem] font-medium tabular-nums tracking-tight',
          selected ? 'text-text' : 'text-text-muted',
        );

  return (
    <span className={cn(plainClass, className)} aria-hidden>
      {preview.text}
    </span>
  );
}

/** Abstract example glyph on drill cards — not a real question. */
export function ArithmeticVariantExample({
  preview,
  selected = false,
  className,
}: {
  preview: DrillPreview;
  selected?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn('space-y-1', className)}
      aria-label='Example question format'
    >
      <span className='block text-[9px] font-semibold uppercase tracking-[0.14em] text-text-subtle'>
        e.g.
      </span>
      <ArithmeticDrillPreview
        preview={preview}
        size='card'
        selected={selected}
      />
    </div>
  );
}
