/**
 * Session folder component - drop zone for selected topics
 */

"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X, Play, Save, Trash2, Clock, GripVertical, FolderDown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Topic, SessionPreset } from "@/types/core";
import { cn } from "@/lib/utils";

interface SessionFolderProps {
  selectedTopics: Topic[];
  questionCount: number;
  onQuestionCountChange: (count: number) => void;
  onRemoveTopic: (topicId: string) => void;
  onClear: () => void;
  onSave: () => void;
  onStart: () => void;
  canStart: boolean;
  presets?: SessionPreset[];
  onLoadPreset?: (preset: SessionPreset) => void;
  topicLevels?: Record<string, number>;
  onTopicLevelChange?: (topicId: string, level: number) => void;
}

function SortableTopicChip({ 
  topic, 
  onRemove, 
  level = 1,
  onLevelChange 
}: { 
  topic: Topic; 
  onRemove: () => void;
  level?: number;
  onLevelChange?: (level: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: topic.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const maxLevel = topic.levels || 1;
  const hasMultipleLevels = maxLevel > 1;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={cn(
        "transition-opacity duration-200",
        isDragging && "opacity-30"
      )}
    >
      <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/90 hover:bg-white/[0.07] hover:border-white/20 transition-colors">
        {/* Drag handle */}
        <button
          className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white cursor-grab active:cursor-grabbing transition-colors"
          {...attributes}
          {...listeners}
          aria-label={`Drag ${topic.name}`}
          type="button"
        >
          <GripVertical size={18} strokeWidth={2} />
        </button>

        <span className="truncate font-semibold text-base">{topic.name}</span>

        {/* Level selector - circular knob with fixed width */}
        <div className="w-[120px] flex items-center justify-end gap-1.5">
          {hasMultipleLevels && onLevelChange ? (
            <>
              <span className="text-xs text-white/40 uppercase tracking-wider">Lvl</span>
              <div className="flex gap-1">
                {Array.from({ length: maxLevel }, (_, i) => i + 1).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => onLevelChange(lvl)}
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                      level === lvl
                        ? "bg-primary text-neutral-900 shadow-md scale-110"
                        : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70"
                    )}
                    title={`Level ${lvl}`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>

        {/* Remove button */}
        <button
          onClick={onRemove}
          className="p-1 rounded-lg hover:bg-red-500/20 text-white/60 hover:text-red-400 transition-all"
          aria-label={`Remove ${topic.name}`}
          type="button"
        >
          <X size={18} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

function DropZone() {
  return (
    <div className="col-span-full w-full h-full min-h-[240px]">
      <div className="rounded-2xl border-2 border-dashed border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.03] text-white/60 p-12 flex flex-col items-center justify-center gap-3 transition-all duration-200 h-full">
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
  selectedTopics,
  questionCount,
  onQuestionCountChange,
  onRemoveTopic,
  onClear,
  onSave,
  onStart,
  canStart,
  presets = [],
  onLoadPreset,
  topicLevels = {},
  onTopicLevelChange,
}: SessionFolderProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: "session-folder",
  });

  return (
    <Card
      className={cn(
        "p-5 transition-all duration-200",
        isOver && "ring-2 ring-primary/50 shadow-glow"
      )}
    >
      {/* Entire card is droppable */}
      <div ref={setNodeRef}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold uppercase tracking-wider text-white/90">
            Session Folder
          </h2>
          <span className="text-sm text-white/50 font-medium">
            {selectedTopics.length} topics
          </span>
        </div>

        {/* Drop zone / Topics - Fixed height to prevent resizing */}
        <div
          className={cn(
            "min-h-[260px] rounded-2xl p-5 mb-5 transition-colors duration-200 relative",
            isOver 
              ? "bg-primary/10 border-2 border-primary/40 shadow-[0_0_16px_rgba(74,140,111,0.2)]" 
              : "bg-white/[0.03] border-2 border-white/5 hover:border-white/10"
          )}
        >
          {selectedTopics.length === 0 ? (
            <DropZone />
          ) : (
            <SortableContext items={selectedTopics.map(t => t.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-3 pb-12">
                {selectedTopics.map((topic) => (
                  <SortableTopicChip
                    key={topic.id}
                    topic={topic}
                    onRemove={() => onRemoveTopic(topic.id)}
                    level={topicLevels[topic.id] || 1}
                    onLevelChange={onTopicLevelChange ? (level) => onTopicLevelChange(topic.id, level) : undefined}
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
          <div className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-colors flex-1">
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
              "flex items-center gap-2.5 px-5 py-3 rounded-2xl transition-all duration-200 text-sm font-medium whitespace-nowrap",
              presets.length === 0
                ? "bg-white/[0.02] border border-white/5 text-white/30 cursor-not-allowed"
                : "bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:text-white interaction-scale"
            )}
            title={presets.length === 0 ? "No saved presets" : "Load a saved preset"}
          >
            <FolderDown className="h-5 w-5" strokeWidth={2} />
            <span>Load</span>
          </button>

          {/* Save and Clear buttons - grouped with text */}
          <button
            onClick={onSave}
            disabled={selectedTopics.length === 0}
            className={cn(
              "flex items-center gap-2.5 px-5 py-3 rounded-2xl transition-all duration-200 text-sm font-medium whitespace-nowrap",
              selectedTopics.length === 0
                ? "bg-white/[0.02] border border-white/5 text-white/30 cursor-not-allowed"
                : "bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:text-white interaction-scale"
            )}
          >
            <Save className="h-5 w-5" strokeWidth={2} />
            <span>Save</span>
          </button>
          
          <button
            onClick={onClear}
            disabled={selectedTopics.length === 0}
            className={cn(
              "flex items-center gap-2.5 px-5 py-3 rounded-2xl transition-all duration-200 text-sm font-medium whitespace-nowrap",
              selectedTopics.length === 0
                ? "bg-white/[0.02] border border-white/5 text-white/30 cursor-not-allowed"
                : "bg-white/5 border border-white/10 text-red-400/80 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 interaction-scale"
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
            "w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-bold text-base uppercase tracking-wider transition-all duration-200 relative overflow-hidden group",
            !canStart
              ? "bg-white/5 border border-white/10 text-white/30 cursor-not-allowed"
              : "bg-primary/10 border-2 border-primary text-primary-light hover:bg-primary/20 hover:border-primary-light hover:text-white/95 hover:shadow-[0_4px_20px_rgba(74,140,111,0.3)] hover:scale-[1.02] active:scale-[0.98]"
          )}
        >
          <Play className="h-5 w-5" fill="currentColor" strokeWidth={0} />
          <span>Start Session</span>
          {canStart && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent group-hover:translate-x-full transition-transform duration-700 -translate-x-full" />
          )}
        </button>

          {!canStart && selectedTopics.length === 0 && (
            <div className="text-sm text-white/40 text-center">
              Add at least one topic to start
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}



