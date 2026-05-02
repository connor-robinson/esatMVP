/**
 * Drill variants grid - Right column (styled like example3 drill cards)
 */

'use client';

import { Check, Star, Plus, ListOrdered, Clock, LayoutGrid } from 'lucide-react';
import { Topic, TopicVariant } from '@/types/core';
import { getTopic } from '@/config/topics';
import { cn } from '@/lib/utils';
import { getDifficultyLabel } from '@/lib/drill-difficulty';

interface DrillVariantsGridProps {
  topicId: string | null;
  selectedTopicIds: string[];
  onAddVariant: (
    topicVariantId: string,
    topicId: string,
    variantId: string,
  ) => void;
  onRemoveVariant: (topicVariantId: string) => void;
}

export function DrillVariantsGrid({
  topicId,
  selectedTopicIds,
  onAddVariant,
  onRemoveVariant,
}: DrillVariantsGridProps) {
  const topic = topicId ? getTopic(topicId) : null;

  if (!topicId) {
    return (
      <div className='flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-organic-xl border border-border-subtle bg-surface-mid'>
        <div className='flex min-h-0 flex-1 items-center justify-center p-6'>
          <div className='rounded-organic-lg border border-border-subtle bg-surface-elevated px-6 py-6 text-center shadow-sm'>
            <div className='mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-organic-md border border-border-subtle bg-surface-mid text-text-muted'>
              <LayoutGrid className='h-4 w-4' />
            </div>
            <p className='max-w-[300px] text-sm leading-relaxed text-text-muted'>
              Select a topic from the left panel to view drill variants.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!topic || !topic.variants || topic.variants.length === 0) {
    return (
      <div className='flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-organic-xl border border-border-subtle bg-surface-mid'>
        <div className='flex-1 overflow-y-auto p-8'>
          <div className='py-12 text-center text-text-subtle'>
            <p className='text-sm'>
              No variants available for this topic
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-organic-xl border border-border-subtle bg-surface-mid'>
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

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'>
        {topic.variants.map((variant) => {
          const variantId = `${topic.id}-${variant.id}`;
          const isSelected = selectedTopicIds.includes(variantId);
          const difficulty = getDifficultyLabel(variant.difficulty || 1);

          return (
            <div
              key={variantId}
              className={cn(
                'relative group rounded-organic-lg border transition-all',
                isSelected
                  ? 'border-primary/55 bg-surface-elevated shadow-sm ring-1 ring-primary/25'
                  : 'border-border-subtle bg-surface-elevated hover:border-border hover:bg-surface-neutral',
              )}
            >
              {isSelected && (
                <div className='absolute inset-0 bg-primary/5 rounded-organic-lg z-0 pointer-events-none' />
              )}
              <div className='relative z-10 flex h-full flex-col p-4'>
                <div className='flex justify-between items-start mb-4'>
                  <span
                    className={cn(
                      'text-[10px] font-bold uppercase tracking-wide',
                      difficulty.color,
                    )}
                  >
                    {difficulty.label}
                  </span>
                  {isSelected ? (
                    <Check className='text-primary w-5 h-5 shrink-0' strokeWidth={2.5} />
                  ) : (
                    <Star className='text-text-muted/45 w-5 h-5 shrink-0' strokeWidth={1.5} />
                  )}
                </div>
                <h4 className='mb-1 text-base font-bold text-text'>
                  {variant.name}
                </h4>
                <p className='mb-4 flex-1 text-sm text-text-muted'>
                  {variant.description || `${topic.name}: ${variant.name}`}
                </p>
                <div className='flex items-center justify-between mt-auto'>
                  <div className='flex items-center gap-3 text-xs text-text-muted font-medium'>
                    <span className='flex items-center gap-1'>
                      <ListOrdered className='w-3 h-3' />
                      10 Qs
                    </span>
                    <span className='flex items-center gap-1'>
                      <Clock className='w-3 h-3' />
                      5m
                    </span>
                  </div>
                  {isSelected ? (
                    <button
                      type='button'
                      onClick={() => onRemoveVariant(variantId)}
                      className='rounded-organic-md border border-border-subtle bg-surface-mid px-3 py-1.5 text-xs font-bold text-text-muted transition-colors hover:bg-surface-neutral hover:text-text'
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type='button'
                      onClick={() =>
                        onAddVariant(variantId, topic.id, variant.id)
                      }
                      className='flex items-center gap-1 rounded-organic-md bg-primary px-3 py-1.5 text-xs font-bold text-background shadow-sm shadow-primary/20 transition-colors hover:bg-primary-hover hover:text-background'
                    >
                      <Plus className='w-3 h-3' />
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
