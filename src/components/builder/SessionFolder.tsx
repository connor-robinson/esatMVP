/**
 * Session folder component - drop zone for selected topics
 */

"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X, Play, Save, Trash2, Clock, GripVertical, FolderDown } from "lucide-react";
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
  onClear: () => void;
  onSave: () => void;
  onStart: () => void;
  canStart: boolean;
  presets?: SessionPreset[];
  onLoadPreset?: (preset: SessionPreset) => void;
}

function SortableVariantChip({ 
  topicVariant,
  onRemove 
}: { 
  topicVariant: TopicVariantSelection;
  onRemove: (topicVariantId: string) => void;
}) {
  const topic = getTopic(topicVariant.topicId);
  if (!topic) return null;

  const variant = topic.variants?.find(v => v.id === topicVariant.variantId);
  const variantName = variant?.name || topicVariant.variantId;
  const displayText = `${topic.name}: ${variantName}`;
  const topicVariantId = `${topicVariant.topicId}-${topicVariant.variantId}`;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: topicVariantId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={cn(
        "transition-opacity duration-200",
        isDragging && "opacity-30"
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 text-white/90 hover:bg-white/[0.07] transition-colors shadow-sm">
        {/* Drag handle */}
        <button
          className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white cursor-grab active:cursor-grabbing transition-colors flex-shrink-0"
          {...attributes}
          {...listeners}
          aria-label={`Drag ${displayText}`}
          type="button"
        >
          <GripVertical size={18} strokeWidth={2} />
        </button>

        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span className="truncate font-semibold text-base">{displayText}</span>
          {topic.description && (
            <span className="truncate text-xs text-white/40">{topic.description}</span>
          )}
        </div>

        {/* Remove button */}
        <button
          onClick={() => onRemove(topicVariantId)}
          className="p-1 rounded-lg hover:bg-red-500/20 text-white/60 hover:text-red-400 transition-all flex-shrink-0"
          aria-label={`Remove ${displayText}`}
          type="button"
        >
          <X size={18} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

function DropZone({ isOver }: { isOver: boolean }) {
  return (
    <div className="col-span-full w-full h-full min-h-[240px]">
      <div className={cn(
        "rounded-2xl text-white/60 p-12 flex flex-col items-center justify-center gap-3 transition-all duration-200 h-full",
        isOver 
          ? "bg-primary/10 text-primary/80 scale-[1.02]" 
          : "bg-white/[0.02] hover:bg-white/[0.03]"
      )}>
        <div className="flex items-center gap-3 text-lg">
          <GripVertical size={20} strokeWidth={2} className="opacity-70" />
          <span className="font-semibold">Drag topics here</span>
        </div>
        <div className="text-sm text-white/40">Or click the + button on a topic</div>
      </div>
    </div>
  );
}

export function SessionFolder({
  selectedTopicVariants,
  questionCount,
  onQuestionCountChange,
  onRemoveTopicVariant,
  onClear,
  onSave,
  onStart,
  canStart,
  presets = [],
  onLoadPreset,
}: SessionFolderProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: "session-folder",
  });

  const totalItems = selectedTopicVariants.length;
  
  // Generate sortable IDs for each variant
  const sortableIds = selectedTopicVariants.map(tv => `${tv.topicId}-${tv.variantId}`);

  return (
    <Card
      variant="flat"
      className={cn(
        "p-5 transition-all duration-200 shadow-sm",
        isOver && "ring-2 ring-primary/50 shadow-[0_0_20px_rgba(74,140,111,0.4)]"
      )}
    >
      {/* Entire card is droppable */}
      <div ref={setNodeRef} className="h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold uppercase tracking-wider text-white/90">
            Session Folder
          </h2>
          <span className="text-sm text-white/50 font-medium">
            {totalItems} {totalItems === 1 ? 'item' : 'items'}
          </span>
        </div>

        {/* Drop zone / Topics - Fixed height to prevent resizing */}
        <div
          className={cn(
            "min-h-[260px] rounded-2xl p-5 mb-5 transition-all duration-200 relative shadow-sm",
            isOver 
              ? "bg-primary/15 ring-2 ring-primary/60 shadow-[0_0_20px_rgba(74,140,111,0.3)] scale-[1.01]" 
              : "bg-white/[0.03]"
          )}
        >
          {selectedTopicVariants.length === 0 ? (
            <DropZone isOver={isOver} />
          ) : (
            <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-3 pb-12">
                {selectedTopicVariants.map((topicVariant) => (
                  <SortableVariantChip
                    key={`${topicVariant.topicId}-${topicVariant.variantId}`}
                    topicVariant={topicVariant}
                    onRemove={onRemoveTopicVariant}
                  />
                ))}
              </div>
            </SortableContext>
          )}
        </div>

      {/* Controls - Single Row */}
      <div className="space-y-4">
        {/* Question count on left, Save and Clear on right */}
        <div className="flex items-stretch gap-3">
          {/* Question count input - bubble style, expanded */}
          <div className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/[0.07] transition-colors flex-1 shadow-sm">
            <span className="text-white/60 text-sm whitespace-nowrap">#</span>
            <input
              type="number"
              value={questionCount}
              onChange={(e) => onQuestionCountChange(Number(e.target.value) || 1)}
              min="1"
              max="100"
              className="bg-transparent border-0 outline-none focus:outline-none focus:ring-0 w-14 text-white text-sm text-center font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0 m-0"
              style={{ boxShadow: 'none' }}
            />
            <span className="text-white/60 text-sm whitespace-nowrap">questions</span>
          </div>

          {/* Load Preset button */}
          <button
            onClick={() => {
              if (presets.length > 0 && onLoadPreset) {
                const presetNumber = prompt(`Available presets:\n${presets.map((p, i) => `${i + 1}. ${p.name}`).join('\n')}\n\nEnter preset number:`);
                if (presetNumber && parseInt(presetNumber) > 0 && parseInt(presetNumber) <= presets.length) {
                  onLoadPreset(presets[parseInt(presetNumber) - 1]);
                }
              }
            }}
            disabled={presets.length === 0}
            className={cn(
              "flex items-center gap-2.5 px-5 py-3 rounded-2xl transition-all duration-200 text-sm font-medium whitespace-nowrap shadow-sm",
              presets.length === 0
                ? "bg-white/[0.02] text-white/30 cursor-not-allowed"
                : "bg-white/5 text-white/80 hover:bg-white/10 hover:text-white interaction-scale"
            )}
            title={presets.length === 0 ? "No saved presets" : "Load a saved preset"}
          >
            <FolderDown className="h-5 w-5" strokeWidth={2} />
            <span>Load</span>
          </button>

          {/* Save and Clear buttons - grouped with text */}
          <button
            onClick={onSave}
            disabled={totalItems === 0}
            className={cn(
              "flex items-center gap-2.5 px-5 py-3 rounded-2xl transition-all duration-200 text-sm font-medium whitespace-nowrap shadow-sm",
              totalItems === 0
                ? "bg-white/[0.02] text-white/30 cursor-not-allowed"
                : "bg-white/5 text-white/80 hover:bg-white/10 hover:text-white interaction-scale"
            )}
          >
            <Save className="h-5 w-5" strokeWidth={2} />
            <span>Save</span>
          </button>
          
          <button
            onClick={onClear}
            disabled={totalItems === 0}
            className={cn(
              "flex items-center gap-2.5 px-5 py-3 rounded-2xl transition-all duration-200 text-sm font-medium whitespace-nowrap shadow-sm",
              totalItems === 0
                ? "bg-white/[0.02] text-white/30 cursor-not-allowed"
                : "bg-white/5 text-red-400/80 hover:bg-red-500/10 hover:text-red-400 interaction-scale"
            )}
          >
            <Trash2 className="h-5 w-5" strokeWidth={2} />
            <span>Clear</span>
          </button>
        </div>

        {/* Start button - modern ghost style with green outline */}
        <button
          onClick={onStart}
          disabled={!canStart}
            className={cn(
            "w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-bold text-base uppercase tracking-wider transition-all duration-200 relative overflow-hidden group shadow-sm",
            !canStart
              ? "bg-white/5 text-white/30 cursor-not-allowed"
              : "bg-primary/10 ring-2 ring-primary text-primary-light hover:bg-primary/20 hover:ring-primary-light hover:text-white/95 hover:shadow-[0_4px_20px_rgba(74,140,111,0.3)] hover:scale-[1.02] active:scale-[0.98]"
          )}
        >
          <Play className="h-5 w-5" fill="currentColor" strokeWidth={0} />
          <span>Start Session</span>
          {canStart && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent group-hover:translate-x-full transition-transform duration-700 -translate-x-full" />
          )}
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



