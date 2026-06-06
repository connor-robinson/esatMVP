/**
 * Drill variants grid - Right column (compact module cards)
 */

'use client';

import { useState } from 'react';
import { Check, Plus, Home, Info, X } from 'lucide-react';
import type { HighLevelCategory } from '@/components/builder/TopicFolders';
import { getDisplayFolder } from '@/config/drillDisplayFolders';
import { getFolderSymbol, getVariantSamples } from '@/config/drillPreviews';
import {
  ArithmeticDrillPreview,
  ArithmeticVariantExample,
} from '@/components/builder/ArithmeticDrillPreview';
import { DrillPanelTransition } from '@/components/builder/DrillPanelTransition';
import { cn } from '@/lib/utils';
import { primaryButtonLabelClasses } from '@/config/theme';
import { getDifficultyLabel } from '@/lib/drill-difficulty';

interface DrillVariantsGridProps {
  topicId: string | null;
  selectedTopicIds: string[];
  drillCategory: HighLevelCategory | null;
  onAddVariant: (
    topicVariantId: string,
    topicId: string,
    variantId: string,
  ) => void;
  onRemoveVariant: (topicVariantId: string) => void;
}

function DrillModuleCard({
  topicId,
  variantId,
  name,
  difficulty,
  isSelected,
  onAdd,
  onRemove,
}: {
  topicId: string;
  variantId: string;
  name: string;
  difficulty: number;
  isSelected: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const diff = getDifficultyLabel(difficulty);
  const samples = getVariantSamples(topicId, variantId);

  return (
    <div
      className={cn(
        'relative flex min-h-[7.5rem] flex-col rounded-organic-md p-3.5 transition-all',
        isSelected
          ? 'bg-folder-card-selected shadow-sm'
          : 'bg-surface-elevated hover:bg-surface-neutral',
      )}
    >
      <div className='mb-2.5 flex items-start justify-between gap-2'>
        <span
          className={cn(
            'text-[10px] font-bold uppercase tracking-wide',
            diff.color,
          )}
        >
          {diff.label}
        </span>
        {isSelected ? (
          <Check className='h-4 w-4 shrink-0 text-primary' strokeWidth={2.5} />
        ) : null}
      </div>
      <h4 className='mb-1 text-center text-sm font-bold leading-snug text-text'>
        {name}
      </h4>
      <ArithmeticVariantExample
        samples={samples}
        cycleSeed={`${topicId}-${variantId}`}
        selected={isSelected}
      />
      <div className='mt-3 flex justify-end'>
        {isSelected ? (
          <button
            type='button'
            onClick={onRemove}
            className={cn(
              'rounded-organic-sm bg-primary px-3 py-2 text-xs font-bold shadow-sm shadow-primary/20 transition-colors hover:bg-primary-hover',
              primaryButtonLabelClasses,
            )}
          >
            Remove
          </button>
        ) : (
          <button
            type='button'
            onClick={onAdd}
            className='flex items-center gap-1 rounded-organic-sm bg-surface-dark px-3 py-2 text-xs font-bold text-[#9a939f] transition-colors hover:bg-surface-mid hover:text-text dark:text-[#c4bec9]'
          >
            <Plus className='h-3.5 w-3.5 shrink-0' />
            Add
          </button>
        )}
      </div>
    </div>
  );
}

function DrillBuilderHelpModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-background/75 p-4 backdrop-blur-sm'
      onClick={onClose}
    >
      <div
        className='relative w-full max-w-sm rounded-organic-xl bg-surface-elevated p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.55)]'
        onClick={(e) => e.stopPropagation()}
        role='dialog'
        aria-labelledby='drill-builder-help-title'
      >
        <button
          type='button'
          onClick={onClose}
          className='absolute right-3 top-3 rounded-full p-2 text-text-muted transition-colors hover:bg-surface-mid hover:text-text'
          aria-label='Close'
        >
          <X className='h-4 w-4' />
        </button>

        <h3
          id='drill-builder-help-title'
          className='pr-8 font-heading text-lg font-bold text-text'
        >
          How to build a session
        </h3>

        <div className='mt-4 space-y-3 text-sm leading-relaxed text-text-muted'>
          <p>
            Pick a subject from the icons on the left, then open a folder in
            the middle column.
          </p>
          <p>
            Hit <span className='font-medium text-text'>Add</span> on any drill
            you want. Set the length on the bar at the bottom, then{' '}
            <span className='font-medium text-text'>Review selection</span> to
            start.
          </p>
        </div>
      </div>
    </div>
  );
}

function DrillBuilderHome({ onShowHelp }: { onShowHelp: () => void }) {
  return (
    <div className='flex min-h-0 flex-1 items-center justify-center p-8 sm:p-12'>
      <div className='flex max-w-md flex-col items-center text-center'>
        <button
          type='button'
          onClick={onShowHelp}
          className='group relative mb-8 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-organic-xl bg-surface-elevated shadow-[0_8px_32px_rgba(0,0,0,0.06)] transition-colors hover:bg-surface-neutral dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)]'
          aria-label='How to build a session'
        >
          <span className='absolute inset-0 rounded-organic-xl bg-primary/8 transition-colors group-hover:bg-primary/12 dark:bg-primary/12' />
          <Home
            className='relative h-9 w-9 text-primary'
            strokeWidth={1.75}
          />
        </button>

        <h2 className='font-heading text-2xl font-bold tracking-tight text-text sm:text-[1.65rem]'>
          Mental Maths
        </h2>
        <p className='mt-2 max-w-[18rem] text-sm leading-relaxed text-text-muted'>
          Build a custom practice session from the drills in the library.
        </p>
      </div>
    </div>
  );
}

export function DrillVariantsGrid({
  topicId,
  selectedTopicIds,
  drillCategory,
  onAddVariant,
  onRemoveVariant,
}: DrillVariantsGridProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const displayFolder =
    drillCategory && topicId
      ? getDisplayFolder(drillCategory, topicId)
      : undefined;

  const panelKey = `${drillCategory ?? 'none'}-${topicId ?? 'home'}`;
  const isHome = !topicId || !drillCategory;
  const shellClass = isHome
    ? 'bg-background'
    : 'bg-surface';

  let panelBody: React.ReactNode;

  if (isHome) {
    panelBody = <DrillBuilderHome onShowHelp={() => setHelpOpen(true)} />;
  } else if (!displayFolder || displayFolder.modules.length === 0) {
    panelBody = (
      <div className='flex flex-1 items-center justify-center p-8 text-sm text-text-muted'>
        No drills in this folder
      </div>
    );
  } else {
    const folderSymbol = getFolderSymbol(drillCategory, displayFolder.id);
    panelBody = (
      <div className='flex min-h-0 flex-1 flex-col overflow-y-auto p-6'>
        <div className='mb-6 flex items-center gap-4'>
          <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-organic-lg bg-primary/12'>
            <ArithmeticDrillPreview
              preview={folderSymbol}
              size='folder'
              selected
            />
          </div>
          <h2 className='font-heading text-2xl font-bold tracking-tight text-text'>
            {displayFolder.name}
          </h2>
        </div>

        <div className='grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-4'>
          {displayFolder.modules.map((mod) => {
            const compositeId = `${mod.topicId}-${mod.variantId}`;
            const isSelected = selectedTopicIds.includes(compositeId);
            return (
              <DrillModuleCard
                key={compositeId}
                topicId={mod.topicId}
                variantId={mod.variantId}
                name={mod.name}
                difficulty={mod.difficulty}
                isSelected={isSelected}
                onAdd={() =>
                  onAddVariant(compositeId, mod.topicId, mod.variantId)
                }
                onRemove={() => onRemoveVariant(compositeId)}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          'relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-organic-xl',
          shellClass,
        )}
      >
        <button
          type='button'
          onClick={() => setHelpOpen(true)}
          className='absolute right-3 top-3 z-10 rounded-full p-2 text-text-muted transition-colors hover:bg-surface-mid hover:text-text'
          aria-label='How to build a session'
        >
          <Info className='h-4 w-4' strokeWidth={2} />
        </button>

        <DrillPanelTransition
          panelKey={panelKey}
          className='flex min-h-0 flex-1 flex-col'
        >
          {panelBody}
        </DrillPanelTransition>
      </div>

      <DrillBuilderHelpModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      />
    </>
  );
}
