/**
 * Topic selector component with search and categories
 */

"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Topic, TopicCategory } from "@/types/core";
import { TopicCard } from "./TopicCard";
import { cn } from "@/lib/utils";

interface TopicSelectorProps {
  topics: Topic[];
  selectedTopicIds: string[];
  onAddTopic: (topicId: string) => void;
}

export function TopicSelector({ topics, selectedTopicIds, onAddTopic }: TopicSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<TopicCategory>>(new Set());

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
    <Card className="p-5 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold uppercase tracking-wider text-white/90">
          Choose Topics
        </h2>
        <span className="text-sm text-white/50 font-medium">
          {selectedTopicIds.length} selected
        </span>
      </div>

      {/* Search */}
      <div className="mb-5">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search topics..."
          className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 placeholder:text-white/40 text-white/90 text-sm transition-all"
        />
      </div>

      {/* Topics by category */}
      <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto overflow-x-hidden pr-1 scrollbar-thin">
        {Object.entries(filteredByCategory).map(([category, categoryTopics]) => {
          if (!categoryTopics || categoryTopics.length === 0) return null;
          const isExpanded = expandedCategories.has(category as TopicCategory);

          return (
            <div key={category} className="rounded-xl bg-white/[0.02] border border-white/5">
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
                  {categoryTopics.map((topic) => (
                    <TopicCard
                      key={topic.id}
                      topic={topic}
                      onAdd={() => onAddTopic(topic.id)}
                      isSelected={selectedTopicIds.includes(topic.id)}
                    />
                  ))}
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



