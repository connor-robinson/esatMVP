/**
 * Topic selector component with search and categories
 */

"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/Card";
import { Topic, TopicCategory } from "@/types/core";
import { TopicCard } from "./TopicCard";
import { cn } from "@/lib/utils";

interface TopicSelectorProps {
  topics: Topic[];
  selectedTopicIds: string[]; // Array of "topicId-variantId" or just "topicId" for topics without variants
  onAddTopic: (topicVariantId: string, topicId: string, variantId?: string) => void;
}

function DraggableTopicHeader({
  topic,
  isExpanded,
  isAnyVariantSelected,
  selectedVariantCount,
  onToggle,
  selectedTopicIds,
  onAddVariant,
}: {
  topic: Topic;
  isExpanded: boolean;
  isAnyVariantSelected: boolean;
  selectedVariantCount: number;
  onToggle: () => void;
  selectedTopicIds: string[];
  onAddVariant: (variantId: string, topicId: string, variantIdOnly: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `topic-${topic.id}`,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div key={topic.id} className="space-y-1">
      {/* Topic header - expandable and draggable */}
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "w-full flex items-center justify-between px-3.5 py-3.5 rounded-xl text-white/90 transition-all shadow-sm",
          isDragging && "opacity-50",
          isAnyVariantSelected
            ? "bg-primary/10"
            : "bg-white/5 hover:bg-white/[0.07]"
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Drag handle */}
          <button
            className="p-1 rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 cursor-grab active:cursor-grabbing flex-shrink-0 transition-colors"
            {...attributes}
            {...listeners}
            aria-label={`Drag ${topic.name}`}
            type="button"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical size={16} strokeWidth={2} />
          </button>

          {/* Expand/collapse button */}
          <button
            onClick={onToggle}
            className="p-0.5 rounded hover:bg-white/5 transition-colors flex-shrink-0"
            aria-label={isExpanded ? "Collapse" : "Expand"}
            type="button"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-white/60" />
            ) : (
              <ChevronRight className="h-4 w-4 text-white/60" />
            )}
          </button>

          <div className="flex flex-col gap-0.5 flex-1 min-w-0 text-left">
            <span className="truncate text-base font-semibold">{topic.name}</span>
            <span className="truncate text-xs text-white/40">{topic.description}</span>
          </div>
        </div>
        {isAnyVariantSelected && (
          <span className="text-xs text-primary/80 font-medium flex-shrink-0 ml-2">
            {selectedVariantCount} selected
          </span>
        )}
      </div>

      {/* Variants - expandable */}
      {isExpanded && (
        <div className="pl-6 space-y-1.5">
          {topic.variants?.map((variant) => {
            const variantId = `${topic.id}-${variant.id}`;
            const isSelected = selectedTopicIds.includes(variantId);
            
            return (
              <TopicCard
                key={variantId}
                topic={{
                  ...topic,
                  id: variantId,
                  name: variant.name,
                  description: variant.description || `${topic.name}: ${variant.name}`,
                }}
                onAdd={() => onAddVariant(variantId, topic.id, variant.id)}
                isSelected={isSelected}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function TopicSelector({ topics, selectedTopicIds, onAddTopic }: TopicSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<TopicCategory>>(new Set());
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  // Toggle category expansion
  const toggleCategory = (category: TopicCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Toggle topic expansion (for topics with variants)
  const toggleTopic = (topicId: string) => {
    setExpandedTopics(prev => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  };

  // Group topics by category
  const topicsByCategory = useMemo(() => {
    const grouped: Partial<Record<TopicCategory, Topic[]>> = {};
    
    topics.forEach((topic) => {
      if (!grouped[topic.category]) {
        grouped[topic.category] = [];
      }
      grouped[topic.category]!.push(topic);
    });
    
    return grouped;
  }, [topics]);

  // Filter topics by search query
  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) return topics;
    
    const query = searchQuery.toLowerCase();
    return topics.filter(
      (topic) =>
        topic.name.toLowerCase().includes(query) ||
        topic.description.toLowerCase().includes(query)
    );
  }, [topics, searchQuery]);

  const filteredByCategory = useMemo(() => {
    const grouped: Partial<Record<TopicCategory, Topic[]>> = {};
    
    filteredTopics.forEach((topic) => {
      if (!grouped[topic.category]) {
        grouped[topic.category] = [];
      }
      grouped[topic.category]!.push(topic);
    });
    
    return grouped;
  }, [filteredTopics]);

  const categoryLabels: Record<TopicCategory, string> = {
    arithmetic: "Arithmetic",
    algebra: "Algebra",
    geometry: "Geometry",
    number_theory: "Number Theory",
    shortcuts: "Shortcuts",
    mechanics: "Mechanics",
    optics: "Optics",
    electricity: "Electricity",
    thermodynamics: "Thermodynamics",
    atomic_structure: "Atomic Structure",
    reactions: "Reactions",
    organic: "Organic",
    analytical: "Analytical",
    cell_biology: "Cell Biology",
    genetics: "Genetics",
    evolution: "Evolution",
    ecology: "Ecology",
  };

  return (
    <Card variant="flat" className="p-5 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold uppercase tracking-wider text-white/90">
          Choose Topics
        </h2>
        <span className="text-sm text-white/50 font-medium">
          {selectedTopicIds.length} {selectedTopicIds.length === 1 ? 'item' : 'items'} selected
        </span>
      </div>

      {/* Search */}
      <div className="mb-5">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search topics..."
          className="w-full h-11 px-4 rounded-xl bg-white/5 outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-0 placeholder:text-white/40 text-white/90 text-sm transition-all shadow-sm"
        />
      </div>

      {/* Topics by category */}
      <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto overflow-x-hidden pr-1 pb-4 scrollbar-thin">
        {Object.entries(filteredByCategory).map(([category, categoryTopics]) => {
          if (!categoryTopics || categoryTopics.length === 0) return null;
          const isExpanded = expandedCategories.has(category as TopicCategory);

          return (
            <div key={category} className="rounded-xl bg-white/[0.02] shadow-sm">
              {/* Category Header - Clickable */}
              <button
                onClick={() => toggleCategory(category as TopicCategory)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors rounded-t-xl"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-white/60" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-white/60" />
                  )}
                  <span className="text-sm font-semibold uppercase tracking-wider text-white/70">
                    {categoryLabels[category as TopicCategory] || category}
                  </span>
                </div>
                <span className="text-xs text-white/40">
                  {categoryTopics.length} {categoryTopics.length === 1 ? 'topic' : 'topics'}
                </span>
              </button>

              {/* Category Topics - Collapsible */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-3 space-y-2">
                  {categoryTopics.map((topic) => {
                    const hasVariants = topic.variants && topic.variants.length > 1;
                    const isTopicExpanded = expandedTopics.has(topic.id);

                    // Check if any variants are selected
                    const selectedVariantIds = topic.variants
                      ?.filter(v => selectedTopicIds.includes(`${topic.id}-${v.id}`))
                      .map(v => v.id) || [];
                    const isAnyVariantSelected = selectedVariantIds.length > 0;

                    if (hasVariants) {
                      // Topic with variants - show expandable topic header
                      return (
                        <DraggableTopicHeader
                          key={topic.id}
                          topic={topic}
                          isExpanded={isTopicExpanded}
                          isAnyVariantSelected={isAnyVariantSelected}
                          selectedVariantCount={selectedVariantIds.length}
                          onToggle={() => toggleTopic(topic.id)}
                          selectedTopicIds={selectedTopicIds}
                          onAddVariant={onAddTopic}
                        />
                      );
                    } else {
                      // Topic without variants or single variant - show as regular topic card
                      const variantId = topic.variants?.[0]?.id;
                      const topicVariantId = variantId ? `${topic.id}-${variantId}` : topic.id;
                      const isSelected = selectedTopicIds.includes(topicVariantId);
                      
                      return (
                        <TopicCard
                          key={topic.id}
                          topic={topic}
                          onAdd={() => onAddTopic(topicVariantId, topic.id, variantId)}
                          isSelected={isSelected}
                        />
                      );
                    }
                  })}
                </div>
              )}
            </div>
          );
        })}

        {filteredTopics.length === 0 && (
          <div className="text-center text-white/40 py-12 text-sm">
            No topics found matching &quot;{searchQuery}&quot;
          </div>
        )}
      </div>
    </Card>
  );
}



