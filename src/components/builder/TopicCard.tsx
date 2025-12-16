/**
 * Draggable topic card component
 */

"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus } from "lucide-react";
import { Topic } from "@/types/core";
import { cn } from "@/lib/utils";

interface TopicCardProps {
  topic: Topic;
  onAdd: () => void;
  isSelected?: boolean;
}

export function TopicCard({ topic, onAdd, isSelected = false }: TopicCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `topic-${topic.id}`,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between w-full rounded-xl px-3.5 py-3.5 text-white/90 border transition-all",
        isDragging && "opacity-50",
        isSelected 
          ? "bg-primary/10 border-primary/30" 
          : "bg-white/5 border-white/10 hover:bg-white/[0.07] hover:border-white/15"
      )}
    >
      {/* Drag handle + label + description */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          className="p-1 rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 cursor-grab active:cursor-grabbing flex-shrink-0 transition-colors"
          {...attributes}
          {...listeners}
          aria-label={`Drag ${topic.name}`}
          type="button"
        >
          <GripVertical size={18} strokeWidth={2} />
        </button>
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span className="truncate text-base font-semibold">{topic.name}</span>
          <span className="truncate text-xs text-white/40">{topic.description}</span>
        </div>
      </div>

      {/* Add button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
        disabled={isSelected}
        className={cn(
          "h-8 w-8 inline-flex items-center justify-center rounded-lg border flex-shrink-0 transition-all",
          isSelected
            ? "bg-primary/20 border-primary/30 text-primary cursor-default"
            : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20 interaction-scale"
        )}
        aria-label={`Add ${topic.name}`}
        title={isSelected ? "Already added" : "Add to session"}
      >
        {isSelected ? <span className="text-xs">✓</span> : <Plus size={18} strokeWidth={2} />}
      </button>
    </div>
  );
}



