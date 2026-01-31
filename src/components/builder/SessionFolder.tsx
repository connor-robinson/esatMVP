/**
 * Session folder component - drop zone for selected topics
 */

"use client";

import { useState } from "react";
import { X, Play, Save, Trash2, Clock, ChevronDown, ChevronRight, ArrowRight, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Topic, SessionPreset, TopicVariantSelection } from "@/types/core";
import { getTopic } from "@/config/topics";
import { cn } from "@/lib/utils";

interface SessionFolderProps {
  selectedTopicVariants: TopicVariantSelection[]; // Array of topic-variant pairs
  questionCount: number;
  onQuestionCountChange: (count: number) => void;
  onRemoveTopicVariant: (topicVariantId: string) => void; // Remove by "topicId-variantId" or "topicId"
  onRemoveAllTopicVariants?: (topicId: string) => void; // Remove all variants of a topic
  onClear: () => void;
  onSave: () => void;
  onStart: () => void;
  canStart: boolean;
  presets?: SessionPreset[];
  onLoadPreset?: (preset: SessionPreset) => void;
}

// Grouped topic chip for topics with multiple variants
function GroupedTopicChip({
  topicId,
  variants,
  onRemoveVariant,
  onRemoveAll,
}: {
  topicId: string;
  variants: TopicVariantSelection[];
  onRemoveVariant: (topicVariantId: string) => void;
  onRemoveAll?: (topicId: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const topic = getTopic(topicId);
  
  if (!topic) return null;

  const variantCount = variants.length;
  const allVariantsCount = topic.variants?.length || 0;
  const hasAllVariants = variantCount === allVariantsCount;

  return (
    <div className="space-y-1">
      {/* Parent topic header */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-organic-md bg-surface-mid text-text transition-colors">
        {/* Expand/collapse button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text transition-colors flex-shrink-0"
          aria-label={isExpanded ? "Collapse" : "Expand"}
          type="button"
        >
          {isExpanded ? (
            <ChevronDown size={18} strokeWidth={2} />
          ) : (
            <ChevronRight size={18} strokeWidth={2} />
          )}
        </button>

        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span className="truncate font-semibold text-base">{topic.name}</span>
          <span className="truncate text-xs text-text-subtle">
            {variantCount} of {allVariantsCount} variants
          </span>
        </div>

        {/* Remove all button */}
        <button
          onClick={() => onRemoveAll?.(topicId)}
          className="p-1 rounded-lg hover:bg-error/20 text-text-muted hover:text-error transition-all flex-shrink-0"
          aria-label={`Remove all ${topic.name} variants`}
          type="button"
          title="Remove all variants"
        >
          <X size={18} strokeWidth={2} />
        </button>
      </div>

      {/* Variants list - collapsible */}
      {isExpanded && (
        <div className="pl-8 space-y-1">
          {variants.map((variant) => (
            <VariantChip
              key={`${variant.topicId}-${variant.variantId}`}
              topicVariant={variant}
              onRemove={onRemoveVariant}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Single variant chip
function VariantChip({ 
  topicVariant,
  onRemove 
}: { 
  topicVariant: TopicVariantSelection;
  onRemove: (topicVariantId: string) => void;
}) {
  const topic = getTopic(topicVariant.topicId);
  const topicVariantId = `${topicVariant.topicId}-${topicVariant.variantId}`;
  
  if (!topic) return null;

  const variant = topic.variants?.find(v => v.id === topicVariant.variantId);
  const variantName = variant?.name || topicVariant.variantId;
  const displayText = `${variantName}`;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-organic-md bg-surface-mid text-text hover:bg-surface transition-colors">
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className="truncate font-medium text-sm">{displayText}</span>
      </div>

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(topicVariantId);
        }}
        className="p-0.5 rounded hover:bg-error/20 text-text-muted hover:text-error transition-all flex-shrink-0"
        aria-label={`Remove ${displayText}`}
        type="button"
      >
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="w-full h-full min-h-[240px] rounded-lg flex flex-col items-center justify-center gap-4 py-12">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-surface-elevated mb-2">
        <BookOpen className="w-8 h-8 text-text-muted" strokeWidth={1.5} />
      </div>
      <div className="text-center space-y-1.5">
        <div className="text-base font-mono font-semibold text-text-muted">
          No topics added yet
        </div>
        <div className="text-sm font-mono text-text-subtle max-w-xs">
          Click the + button to add topics to your practice session
        </div>
      </div>
    </div>
  );
}

export function SessionFolder({
  selectedTopicVariants,
  questionCount,
  onQuestionCountChange,
  onRemoveTopicVariant,
  onRemoveAllTopicVariants,
  onClear,
  onSave,
  onStart,
  canStart,
  presets = [],
  onLoadPreset,
}: SessionFolderProps) {
  const totalItems = selectedTopicVariants.length;
  
  // Group variants by topic
  const groupedByTopic = selectedTopicVariants.reduce((acc, tv) => {
    if (!acc[tv.topicId]) {
      acc[tv.topicId] = [];
    }
    acc[tv.topicId].push(tv);
    return acc;
  }, {} as Record<string, TopicVariantSelection[]>);

  return (
    <Card variant="flat" className="p-5 h-full flex flex-col">
      <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <div>
          <h2 className="text-lg font-semibold uppercase tracking-wider text-text">
            Session Folder
          </h2>
          <p className="text-sm font-mono text-text-subtle mt-1">
            Click the + button to add topics.
          </p>
        </div>
        <span className="text-xs text-text-subtle">
          {totalItems} {totalItems === 1 ? 'item' : 'items'}
        </span>
      </div>

        {/* Topics list */}
        <div className="flex-1 min-h-[260px] rounded-organic-lg p-4 mb-5 bg-surface-subtle overflow-y-auto">
          {selectedTopicVariants.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="flex flex-col gap-2">
              {Object.entries(groupedByTopic).map(([topicId, variants]) => {
                // If topic has multiple variants, show as grouped
                if (variants.length > 1) {
                  return (
                    <GroupedTopicChip
                      key={topicId}
                      topicId={topicId}
                      variants={variants}
                      onRemoveVariant={onRemoveTopicVariant}
                      onRemoveAll={onRemoveAllTopicVariants}
                    />
                  );
                } else {
                  // Single variant, show as regular chip
                  return (
                    <VariantChip
                      key={`${variants[0].topicId}-${variants[0].variantId}`}
                      topicVariant={variants[0]}
                      onRemove={onRemoveTopicVariant}
                    />
                  );
                }
              })}
            </div>
          )}
        </div>

      {/* Controls - Single Row */}
      <div className="space-y-4 flex-shrink-0">
        {/* Question count on left, Save and Clear on right */}
        <div className="flex items-stretch gap-3">
          {/* Question count input - bubble style, expanded */}
          <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-organic-md bg-surface-elevated hover:bg-surface transition-colors flex-1">
            <span className="text-text-subtle text-sm font-mono whitespace-nowrap">Questions:</span>
            <input
              type="number"
              value={questionCount}
              onChange={(e) => onQuestionCountChange(Number(e.target.value) || 1)}
              min="1"
              max="100"
              className="bg-transparent border-0 outline-none focus:outline-none focus:ring-0 w-16 text-text text-sm text-center font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0 m-0"
              style={{ boxShadow: 'none' }}
            />
          </div>

          {/* Save and Clear buttons - grouped with text */}
          <Button
            onClick={onSave}
            disabled={totalItems === 0}
            variant="secondary"
            size="sm"
            className="flex items-center gap-2 border-0 whitespace-nowrap"
          >
            <Save className="h-4 w-4" strokeWidth={2} />
            <span className="whitespace-nowrap">Save as preset</span>
          </Button>
          
          <Button
            onClick={onClear}
            disabled={totalItems === 0}
            variant="secondary"
            size="sm"
            className="flex items-center gap-2 border-0 text-text-muted hover:text-text hover:bg-surface-elevated"
          >
            <Trash2 className="h-4 w-4" strokeWidth={2} />
            <span>Clear</span>
          </Button>
        </div>

        {/* Start button - matching submit answer style but green */}
        <button
          onClick={onStart}
          disabled={!canStart}
          className={cn(
            "w-full px-6 py-3 rounded-organic-md transition-all duration-fast ease-signature flex items-center justify-center gap-2 font-mono text-sm font-medium",
            canStart
              ? "bg-primary/40 hover:bg-primary/50 text-text cursor-pointer border border-primary/50"
              : "bg-surface-elevated text-text-disabled cursor-not-allowed"
          )}
          style={
            canStart
              ? {
                  boxShadow: 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 6px 0 rgba(0, 0, 0, 0.6)'
                }
              : undefined
          }
          onMouseEnter={(e) => {
            if (canStart) {
              e.currentTarget.style.boxShadow = 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 8px 0 rgba(0, 0, 0, 0.7)';
            }
          }}
          onMouseLeave={(e) => {
            if (canStart) {
              e.currentTarget.style.boxShadow = 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 6px 0 rgba(0, 0, 0, 0.6)';
            }
          }}
        >
          <span>Start Session</span>
          <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
        </button>

          {!canStart && totalItems === 0 && (
            <div className="text-sm text-text-subtle text-center">
              Add at least one topic to start
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}



