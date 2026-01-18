/**
 * Topic selector component with search and categories
 */

"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Hexagon, FunctionSquare, Calculator, Zap, Atom, FlaskConical, Infinity, Triangle, Plus, Check, BookOpen, Clock, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Topic, TopicCategory, SessionPreset } from "@/types/core";
import { TopicCard } from "./TopicCard";
import { cn } from "@/lib/utils";
import { getTopic } from "@/config/topics";

interface TopicSelectorProps {
  topics: Topic[];
  selectedTopicIds: string[]; // Array of "topicId-variantId" or just "topicId" for topics without variants
  onAddTopic: (topicVariantId: string, topicId: string, variantId?: string) => void;
  presets?: SessionPreset[];
  onLoadPreset?: (preset: SessionPreset) => void;
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

function TopicHeaderWithVariants({
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
  return (
    <div key={topic.id} className="space-y-1">
      {/* Topic header - expandable */}
      <div
        className={cn(
          "w-full flex items-center justify-between px-3.5 py-3.5 rounded-organic-md text-white/90 transition-all",
          isAnyVariantSelected
            ? "bg-primary/10"
            : "bg-white/[0.03] hover:bg-white/[0.06]"
        )}
      >
        {/* Left side - Expand/collapse button with chevron */}
        <button
          onClick={onToggle}
          className="flex items-center flex-shrink-0 transition-colors mr-4"
          aria-label={isExpanded ? "Collapse" : "Expand"}
          type="button"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-white/60" />
          ) : (
            <ChevronRight className="h-4 w-4 text-white/60" />
          )}
        </button>

        {/* Middle - Content */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex flex-col gap-0.5 flex-1 min-w-0 text-left">
            <span className="truncate text-base font-semibold">{topic.name}</span>
            <span className="truncate text-xs text-white/40">{topic.description}</span>
          </div>
        </div>

        {/* Right side - Plus button or selected count */}
        {isAnyVariantSelected ? (
          <span className="text-xs text-primary/80 font-medium flex-shrink-0 ml-2">
            {selectedVariantCount} selected
          </span>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Add all variants
              topic.variants?.forEach((variant) => {
                const variantId = `${topic.id}-${variant.id}`;
                onAddVariant(variantId, topic.id, variant.id);
              });
            }}
            className="h-8 w-8 inline-flex items-center justify-center rounded-organic-md flex-shrink-0 transition-all bg-white/5 text-white/70 hover:bg-white/10 interaction-scale"
            aria-label={`Add all ${topic.name} variants`}
            type="button"
          >
            <Plus size={18} strokeWidth={2} />
          </button>
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

export function TopicSelector({ topics, selectedTopicIds, onAddTopic, presets = [], onLoadPreset }: TopicSelectorProps) {
  const [view, setView] = useState<"library" | "presets">("library");
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

  // Calculate total number of modes (variants) - don't count folders themselves
  const totalModes = useMemo(() => {
    return filteredTopics.reduce((count, topic) => {
      if (topic.variants && topic.variants.length > 0) {
        // Count each variant (mode) inside the folder
        return count + topic.variants.length;
      } else {
        // Topic without variants counts as 1 mode
        return count + 1;
      }
    }, 0);
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
    geometry: <Hexagon className="h-5 w-5 text-white/60" strokeWidth={2} />,
    number_theory: <Infinity className="h-5 w-5 text-white/60" strokeWidth={2} />,
    shortcuts: <Zap className="h-5 w-5 text-white/60" strokeWidth={2} />,
    trigonometry: <Triangle className="h-5 w-5 text-white/60" strokeWidth={2} />,
    physics: <Atom className="h-5 w-5 text-white/60" strokeWidth={2} />,
    other: <FlaskConical className="h-5 w-5 text-white/60" strokeWidth={2} />,
  };

  return (
    <Card variant="flat" className="p-5 h-full">
      {/* Header with toggle */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex-1">
          <h2 className="text-lg font-semibold uppercase tracking-wider text-white/90">
            Choose Topics
          </h2>
          <p className="text-sm font-mono text-white/50 mt-1">
            {view === "library" ? "Select topics to practice. Click + to add." : "Load a saved preset to quickly start practicing."}
          </p>
        </div>
        <div className="flex items-center gap-3 ml-4">
          {view === "library" && (
            <span className="text-xs text-white/50">
              {totalModes} {totalModes === 1 ? 'mode' : 'modes'} total
            </span>
          )}
          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-organic-md bg-white/[0.03]">
            <button
              onClick={() => setView("library")}
              className={cn(
                "px-3 py-1.5 rounded-organic-md text-xs font-medium transition-all",
                view === "library"
                  ? "bg-white/10 text-white/90"
                  : "text-white/50 hover:text-white/70"
              )}
            >
              Library
            </button>
            <button
              onClick={() => setView("presets")}
              className={cn(
                "px-3 py-1.5 rounded-organic-md text-xs font-medium transition-all",
                view === "presets"
                  ? "bg-white/10 text-white/90"
                  : "text-white/50 hover:text-white/70"
              )}
            >
              Presets
            </button>
          </div>
        </div>
      </div>

      {/* Preset View */}
      {view === "presets" ? (
        <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto overflow-x-hidden pr-1 pb-4 scrollbar-thin">
          {presets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="h-12 w-12 text-white/20 mb-4" strokeWidth={1.5} />
              <p className="text-sm text-white/50 mb-1">No presets saved yet</p>
              <p className="text-xs text-white/40">Create a session and save it as a preset to get started</p>
            </div>
          ) : (
            presets.map((preset) => (
              <div
                key={preset.id}
                className="p-4 rounded-organic-md bg-white/5 hover:bg-white/[0.07] transition-colors cursor-pointer"
                onClick={() => onLoadPreset?.(preset)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white/90 truncate mb-1.5">
                      {preset.name}
                    </div>
                    <div className="text-xs text-white/50 line-clamp-2 mb-2">
                      {preset.topicVariantSelections && preset.topicVariantSelections.length > 0
                        ? preset.topicVariantSelections
                            .map((tv) => {
                              const topic = getTopic(tv.topicId);
                              if (!topic) return tv.topicId;
                              const variant = topic.variants?.find(v => v.id === tv.variantId);
                              return variant ? `${topic.name}: ${variant.name}` : topic.name;
                            })
                            .join(", ")
                        : preset.topicIds
                            .map((id) => getTopic(id)?.name || id)
                            .join(", ")}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/40">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} />
                        <span>{preset.durationMin} min</span>
                      </div>
                      <span>•</span>
                      <span>{preset.topicVariantSelections?.length || preset.topicIds.length} {preset.topicVariantSelections?.length === 1 || preset.topicIds.length === 1 ? 'topic' : 'topics'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLoadPreset?.(preset);
                      }}
                      className="px-3 py-1.5 rounded-organic-md bg-primary/10 text-primary hover:bg-primary/15 transition-colors text-xs font-medium"
                    >
                      Load
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <>
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
                className="w-full flex items-center justify-between px-5 py-5 hover:bg-white/[0.04] transition-colors rounded-t-organic-md bg-white/[0.015]"
              >
                <div className="flex items-center gap-3">
                  {categoryIcons[highLevelCategory]}
                  <span className="text-sm font-semibold uppercase tracking-wider text-white/70">
                    {categoryLabels[highLevelCategory] || category}
                  </span>
                  <span className="text-xs text-white/40">
                    {categoryTopics.length} {categoryTopics.length === 1 ? 'topic' : 'topics'}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-white/60 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-white/60 flex-shrink-0" />
                )}
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
                        <TopicHeaderWithVariants
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
        </>
      )}
    </Card>
  );
}



