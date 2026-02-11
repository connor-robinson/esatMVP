/**
 * Drill variants grid - Right column (styled like example3 drill cards)
 */

"use client";

import { Check, Star, Plus, ListOrdered, Clock } from "lucide-react";
import { Topic, TopicVariant } from "@/types/core";
import { getTopic } from "@/config/topics";
import { cn } from "@/lib/utils";

interface DrillVariantsGridProps {
  topicId: string | null;
  selectedTopicIds: string[];
  onAddVariant: (topicVariantId: string, topicId: string, variantId: string) => void;
  onRemoveVariant: (topicVariantId: string) => void;
}

const getDifficultyLabel = (difficulty: number) => {
  if (difficulty <= 2) return { label: "Easy", color: "bg-success/15 text-success/80" };
  if (difficulty <= 4) return { label: "Medium", color: "bg-warning/15 text-warning/80" };
  return { label: "Hard", color: "bg-error/15 text-error/80" };
};

export function DrillVariantsGrid({
  topicId,
  selectedTopicIds,
  onAddVariant,
  onRemoveVariant,
}: DrillVariantsGridProps) {
  const topic = topicId ? getTopic(topicId) : null;

  if (!topic || !topic.variants || topic.variants.length === 0) {
    return (
      <div className="flex-1 flex flex-col bg-surface-mid rounded-2xl p-8 overflow-y-auto shadow-lg">
        <div className="text-center text-text-subtle py-12">
          <p className="text-sm">
            {topicId ? "No variants available for this topic" : "Select a topic to view drills"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-surface-mid rounded-2xl p-8 overflow-y-auto shadow-lg">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-text mb-2">{topic.name} Drills</h2>
          <p className="text-text-muted">
            Select one or more drills to build your custom practice session.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {topic.variants.map((variant) => {
          const variantId = `${topic.id}-${variant.id}`;
          const isSelected = selectedTopicIds.includes(variantId);
          const difficulty = getDifficultyLabel(variant.difficulty || 1);

          return (
            <div
              key={variantId}
              className={cn(
                "relative group rounded-xl transition-all",
                isSelected
                  ? "bg-surface-elevated ring-2 ring-primary/40 shadow-md"
                  : "bg-surface-elevated hover:bg-surface-neutral hover:shadow-sm"
              )}
            >
              {isSelected && (
                <div className="absolute inset-0 bg-primary/8 rounded-xl z-0" />
              )}
              <div className="relative z-10 p-6 flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                      difficulty.color
                    )}
                  >
                    {difficulty.label}
                  </span>
                  {isSelected ? (
                    <Check className="text-primary/80 w-5 h-5" />
                  ) : (
                    <Star className="text-text-muted/50 w-5 h-5" />
                  )}
                </div>
                <h4 className="text-lg font-bold text-text mb-1">{variant.name}</h4>
                <p className="text-sm text-text-muted mb-6 flex-1">
                  {variant.description || `${topic.name}: ${variant.name}`}
                </p>
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-3 text-xs text-text-muted font-medium">
                    <span className="flex items-center gap-1">
                      <ListOrdered className="w-3 h-3" />
                      10 Qs
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      5m
                    </span>
                  </div>
                  {isSelected ? (
                    <button
                      onClick={() => onRemoveVariant(variantId)}
                      className="bg-primary/25 text-primary/90 hover:bg-primary/35 text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      onClick={() => onAddVariant(variantId, topic.id, variant.id)}
                      className="bg-primary hover:bg-primary-hover text-background text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-lg shadow-primary/20 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
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
  );
}
