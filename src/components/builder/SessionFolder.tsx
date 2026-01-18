/**
 * Session folder component - drop zone for selected topics
 */

"use client";

import { useState } from "react";
import { X, Play, Save, Trash2, Clock, ChevronDown, ChevronRight } from "lucide-react";
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
      <div className="flex items-center gap-3 px-4 py-3 rounded-organic-md bg-primary/10 text-white/90 transition-colors">
        {/* Expand/collapse button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors flex-shrink-0"
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
          <span className="truncate text-xs text-white/40">
            {variantCount} of {allVariantsCount} variants
          </span>
        </div>

        {/* Remove all button */}
        <button
          onClick={() => onRemoveAll?.(topicId)}
          className="p-1 rounded-lg hover:bg-red-500/20 text-white/60 hover:text-red-400 transition-all flex-shrink-0"
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
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-organic-md bg-white/5 text-white/80 hover:bg-white/[0.07] transition-colors">
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className="truncate font-medium text-sm">{displayText}</span>
      </div>

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(topicVariantId);
        }}
        className="p-0.5 rounded hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-all flex-shrink-0"
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
    <div className="w-full h-full min-h-[240px] rounded-organic-lg text-white/60 p-12 flex flex-col items-center justify-center gap-3">
      <div className="text-base text-white/40">
        <span className="font-semibold">No topics added yet</span>
      </div>
      <div className="text-sm text-white/40">Click the + button to add topics</div>
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
    <Card variant="flat" className="p-5">
      <div className="h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold uppercase tracking-wider text-white/90">
            Session Folder
          </h2>
          <p className="text-sm font-mono text-white/50 mt-1">
            Click the + button to add topics.
          </p>
        </div>
        <span className="text-xs text-white/50">
          {totalItems} {totalItems === 1 ? 'item' : 'items'}
        </span>
      </div>

        {/* Topics list */}
        <div className="min-h-[260px] rounded-organic-lg p-5 mb-5 bg-white/[0.03]">
          {selectedTopicVariants.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="flex flex-col gap-3">
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
      <div className="space-y-4">
        {/* Question count on left, Save and Clear on right */}
        <div className="flex items-stretch gap-3">
          {/* Question count input - bubble style, expanded */}
          <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-organic-md bg-white/5 hover:bg-white/[0.07] transition-colors flex-1">
            <span className="text-white/50 text-sm font-mono whitespace-nowrap">Questions:</span>
            <input
              type="number"
              value={questionCount}
              onChange={(e) => onQuestionCountChange(Number(e.target.value) || 1)}
              min="1"
              max="100"
              className="bg-transparent border-0 outline-none focus:outline-none focus:ring-0 w-16 text-white text-sm text-center font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0 m-0"
              style={{ boxShadow: 'none' }}
            />
          </div>

          {/* Save and Clear buttons - grouped with text */}
          <Button
            onClick={onSave}
            disabled={totalItems === 0}
            variant="secondary"
            size="sm"
            className="flex items-center gap-2 border-0"
          >
            <Save className="h-4 w-4" strokeWidth={2} />
            <span>Save as preset</span>
          </Button>
          
          <Button
            onClick={onClear}
            disabled={totalItems === 0}
            variant="secondary"
            size="sm"
            className="flex items-center gap-2 border-0 text-white/60 hover:text-white/80 hover:bg-white/10"
          >
            <Trash2 className="h-4 w-4" strokeWidth={2} />
            <span>Clear</span>
          </Button>
        </div>

        {/* Start button - enhanced style */}
        <button
          onClick={onStart}
          disabled={!canStart}
          className={cn(
            "w-full flex items-center justify-center gap-3 px-6 py-4 rounded-organic-lg font-semibold text-base transition-all duration-fast ease-signature",
            canStart
              ? "bg-primary text-neutral-900 hover:bg-primary-hover hover:shadow-glow interaction-scale"
              : "bg-white/5 text-white/30 cursor-not-allowed"
          )}
        >
          <Play className="h-5 w-5" strokeWidth={2.5} />
          <span>Start Session</span>
        </button>

          {!canStart && totalItems === 0 && (
            <div className="text-sm text-white/40 text-center">
              Add at least one topic to start
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}



