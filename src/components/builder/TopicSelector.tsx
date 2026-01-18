/**
 * Topic selector component with search and categories
 */

"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Folder, Square, FunctionSquare, Calculator, Zap, Atom, FlaskConical, Infinity, Target } from "lucide-react";
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

// High-level categories for UI grouping (max 8)
type HighLevelCategory =
  | "arithmetic"
  | "algebra"
  | "geometry"
  | "number_theory"
  | "shortcuts"
  | "trigonometry"
  | "physics"
  | "other";

// Map fine-grained TopicCategory → high-level category
const CATEGORY_MAP: Record<TopicCategory, HighLevelCategory> = {
  arithmetic: "arithmetic",
  algebra: "algebra",
  geometry: "geometry",
  number_theory: "number_theory",
  shortcuts: "shortcuts",
  patterns: "number_theory",
  transform: "arithmetic",
  test: "number_theory",
  estimation: "arithmetic",
  identities: "algebra",
  trigonometry: "trigonometry",
  mechanics: "physics",
  optics: "physics",
  electricity: "physics",
  thermodynamics: "physics",
  atomic_structure: "physics",
  reactions: "other",
  organic: "other",
  analytical: "other",
  cell_biology: "other",
  genetics: "other",
  evolution: "other",
  ecology: "other",
};

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
        {...attributes}
        {...listeners}
        className={cn(
          "w-full flex items-center justify-between px-3.5 py-3.5 rounded-organic-md text-white/90 transition-all cursor-grab active:cursor-grabbing",
          isDragging && "opacity-50",
          isAnyVariantSelected
            ? "bg-primary/10"
            : "bg-white/5 hover:bg-white/[0.07]"
        )}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Folder icon for topics with variants */}
          <Folder className="h-5 w-5 text-white/50 flex-shrink-0" strokeWidth={2} />

          {/* Expand/collapse button */}
          <button
            onClick={onToggle}
            className="p-0.5 rounded hover:bg-white/5 transition-colors flex-shrink-0"
            aria-label={isExpanded ? "Collapse" : "Expand"}
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
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
  const [expandedCategories, setExpandedCategories] = useState<Set<HighLevelCategory>>(new Set());
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  // Toggle category expansion
  const toggleCategory = (category: HighLevelCategory) => {
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
    const grouped: Partial<Record<HighLevelCategory, Topic[]>> = {};
    
    filteredTopics.forEach((topic) => {
      const highLevel = CATEGORY_MAP[topic.category] ?? "other";
      if (!grouped[highLevel]) {
        grouped[highLevel] = [];
      }
      grouped[highLevel]!.push(topic);
    });
    
    return grouped;
  }, [filteredTopics]);

  const categoryLabels: Record<HighLevelCategory, string> = {
    arithmetic: "Arithmetic",
    algebra: "Algebra & Identities",
    geometry: "Geometry & Shapes",
    number_theory: "Number Theory & Patterns",
    shortcuts: "Shortcuts",
    trigonometry: "Trigonometry",
    physics: "Physics",
    other: "Other",
  };

  const categoryIcons: Record<HighLevelCategory, JSX.Element> = {
    arithmetic: <Calculator className="h-5 w-5 text-white/60" strokeWidth={2} />,
    algebra: <FunctionSquare className="h-5 w-5 text-white/60" strokeWidth={2} />,
    geometry: <Square className="h-5 w-5 text-white/60" strokeWidth={2} />,
    number_theory: <Infinity className="h-5 w-5 text-white/60" strokeWidth={2} />,
    shortcuts: <Zap className="h-5 w-5 text-white/60" strokeWidth={2} />,
    trigonometry: <Target className="h-5 w-5 text-white/60" strokeWidth={2} />,
    physics: <Atom className="h-5 w-5 text-white/60" strokeWidth={2} />,
    other: <FlaskConical className="h-5 w-5 text-white/60" strokeWidth={2} />,
  };

  return (
    <Card variant="flat" className="p-5 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold uppercase tracking-wider text-white/90">
            Choose Topics
          </h2>
          <p className="text-sm font-mono text-white/50 mt-1">
            Select topics to practice. Drag or click + to add.
          </p>
        </div>
        <span className="text-xs text-white/50">
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
          className="w-full h-11 px-4 rounded-organic-md bg-white/5 outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-0 placeholder:text-white/40 text-white/90 text-sm transition-all"
        />
      </div>

      {/* Topics by category */}
      <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto overflow-x-hidden pr-1 pb-4 scrollbar-thin">
        {Object.entries(filteredByCategory).map(([category, categoryTopics]) => {
          if (!categoryTopics || categoryTopics.length === 0) return null;
          const highLevelCategory = category as HighLevelCategory;
          const isExpanded = expandedCategories.has(highLevelCategory);

          return (
            <div key={category} className="rounded-organic-md bg-white/[0.02]">
              {/* Category Header - Clickable */}
              <button
                onClick={() => toggleCategory(highLevelCategory)}
                className="w-full flex items-center justify-between px-5 py-5 hover:bg-white/5 transition-colors rounded-t-organic-md"
              >
                <div className="flex items-center gap-3">
                  {categoryIcons[highLevelCategory]}
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-white/60" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-white/60" />
                  )}
                  <span className="text-sm font-semibold uppercase tracking-wider text-white/70">
                    {categoryLabels[highLevelCategory] || category}
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



