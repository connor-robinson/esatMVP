/**
 * Drill variants grid - Right column (styled like example3 drill cards)
 */

'use client';

import { Check, Plus, Home } from 'lucide-react';
import { getTopic } from '@/config/topics';
import { getArithmeticDisplayFolder } from '@/config/arithmeticFolders';
import {
  getArithmeticFolderSymbol,
  getArithmeticVariantPreview,
} from '@/config/arithmeticDrillPreviews';
import {
  ArithmeticDrillPreview,
  ArithmeticVariantExample,
} from '@/components/builder/ArithmeticDrillPreview';
import { cn } from '@/lib/utils';
import { primaryButtonLabelClasses } from '@/config/theme';
import { getDifficultyLabel } from '@/lib/drill-difficulty';

interface DrillVariantsGridProps {
  topicId: string | null;
  selectedTopicIds: string[];
  /** Arithmetic homepage experiment: compact drill cards, merged folders. */
  isArithmeticCategory?: boolean;
  onAddVariant: (
    topicVariantId: string,
    topicId: string,
    variantId: string,
  ) => void;
  onRemoveVariant: (topicVariantId: string) => void;
}

function ArithmeticDrillCard({
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
  const preview = getArithmeticVariantPreview(topicId, variantId);

  return (
    <div
      className={cn(
        'relative flex min-h-[8.5rem] flex-col rounded-organic-md p-3.5 transition-all',
        isSelected
          ? 'bg-folder-card-selected shadow-sm'
          : 'bg-surface-elevated hover:bg-surface-neutral',
      )}
    >
      <div className='mb-2 flex items-start justify-between gap-2'>
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
      <h4 className='mb-2 text-sm font-bold leading-snug text-text'>{name}</h4>
      {preview ? (
        <ArithmeticVariantExample
          preview={preview}
          selected={isSelected}
          className='mb-3'
        />
      ) : (
        <div className='mb-3 min-h-[2.75rem]' aria-hidden />
      )}
      <div className='mt-auto flex justify-end'>
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

export function DrillVariantsGrid({
  topicId,
  selectedTopicIds,
  isArithmeticCategory = false,
  onAddVariant,
  onRemoveVariant,
}: DrillVariantsGridProps) {
  const arithmeticFolder =
    isArithmeticCategory && topicId
      ? getArithmeticDisplayFolder(topicId)
      : undefined;
  const topic = topicId && !arithmeticFolder ? getTopic(topicId) : null;

  if (!topicId) {
    return (
      <div className='flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-organic-xl bg-background'>
        <div className='flex min-h-0 flex-1 items-center justify-center p-8 sm:p-12'>
          <div className='flex max-w-md flex-col items-center text-center'>
            <div
              className='relative mb-8 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-organic-xl bg-surface-elevated shadow-[0_8px_32px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)]'
              aria-hidden
            >
              <span className='absolute inset-0 rounded-organic-xl bg-primary/8 dark:bg-primary/12' />
              <Home
                className='relative h-9 w-9 text-primary'
                strokeWidth={1.75}
              />
            </div>

            <h2 className='font-heading text-2xl font-bold tracking-tight text-text sm:text-[1.65rem]'>
              Mental Maths
            </h2>
            <p className='mt-2 max-w-[18rem] text-sm leading-relaxed text-text-muted'>
              Build a custom practice session from the drills in the library.
            </p>

            <ol className='mt-10 w-full max-w-[15rem] space-y-2.5 text-left'>
              {[
                'Choose a category',
                'Pick a topic folder',
                'Add drills to your session',
              ].map((step, i) => (
                <li
                  key={step}
                  className='flex items-center gap-3 text-xs text-text-subtle'
                >
                  <span className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-mid font-mono text-[10px] font-semibold tabular-nums text-text-muted'>
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    );
  }

  if (arithmeticFolder) {
    if (arithmeticFolder.modules.length === 0) {
      return (
        <div className='flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-organic-xl bg-surface'>
          <div className='flex flex-1 items-center justify-center p-8 text-sm text-text-muted'>
            No drills in this folder
          </div>
        </div>
      );
    }

    const folderSymbol = getArithmeticFolderSymbol(arithmeticFolder.id);

    return (
      <div className='flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-organic-xl bg-surface'>
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
              {arithmeticFolder.name}
            </h2>
          </div>

          <div className='grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-4'>
            {arithmeticFolder.modules.map((mod) => {
              const compositeId = `${mod.topicId}-${mod.variantId}`;
              const isSelected = selectedTopicIds.includes(compositeId);
              return (
                <ArithmeticDrillCard
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
      </div>
    );
  }

  if (!topic || !topic.variants || topic.variants.length === 0) {
    return (
      <div className='flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-organic-xl bg-surface'>
        <div className='flex-1 overflow-y-auto p-8'>
          <div className='py-12 text-center text-text-subtle'>
            <p className='text-sm'>No variants available for this topic</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-organic-xl bg-surface'>
      <div className='flex min-h-0 flex-1 flex-col overflow-y-auto p-6'>
        <div className='mb-6 flex items-end justify-between'>
          <div>
            <h2 className='mb-2 text-2xl font-bold text-text'>
              {topic.name} Drills
            </h2>
            <p className='text-sm text-text-muted'>
              Select one or more drills to build your custom practice session.
            </p>
          </div>
        </div>

        <div className='grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-4'>
          {topic.variants.map((variant) => {
            const variantId = `${topic.id}-${variant.id}`;
            const isSelected = selectedTopicIds.includes(variantId);
            const difficulty = getDifficultyLabel(variant.difficulty || 1);

            return (
              <div
                key={variantId}
                className={cn(
                  'relative group rounded-organic-md transition-all',
                  isSelected
                    ? 'bg-folder-card-selected shadow-sm'
                    : 'bg-surface-elevated hover:bg-surface-neutral',
                )}
              >
                <div className='flex h-full flex-col p-4'>
                <div className='mb-4 flex items-start justify-between gap-2'>
                  <span
                    className={cn(
                      'text-[10px] font-bold uppercase tracking-wide',
                      difficulty.color,
                    )}
                  >
                    {difficulty.label}
                  </span>
                  {isSelected ? (
                    <Check
                      className='h-5 w-5 shrink-0 text-primary'
                      strokeWidth={2.5}
                    />
                  ) : null}
                </div>
                  <h4 className='mb-1 text-base font-bold text-text'>
                    {variant.name}
                  </h4>
                  <p className='mb-4 flex-1 text-sm text-text-muted'>
                    {variant.description || `${topic.name}: ${variant.name}`}
                  </p>
                  <div className='mt-auto flex items-center justify-end'>
                    {isSelected ? (
                      <button
                        type='button'
                        onClick={() => onRemoveVariant(variantId)}
                        className={cn(
                          'rounded-organic-sm bg-primary px-3.5 py-2.5 text-sm font-bold shadow-sm shadow-primary/20 transition-colors hover:bg-primary-hover',
                          primaryButtonLabelClasses,
                        )}
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        type='button'
                        onClick={() =>
                          onAddVariant(variantId, topic.id, variant.id)
                        }
                        className='flex items-center gap-1.5 rounded-organic-sm bg-surface-dark px-3.5 py-2.5 text-sm font-bold text-[#9a939f] shadow-sm transition-colors hover:bg-surface-mid hover:text-text dark:text-[#c4bec9]'
                      >
                        <Plus className='h-3.5 w-3.5 shrink-0' />
                        Add
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
