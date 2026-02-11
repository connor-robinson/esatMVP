/**
 * Topic folders component - Middle column (Operations-style)
 */

"use client";

import { useState } from "react";
import { Folder, FolderOpen } from "lucide-react";
import { Topic, TopicCategory } from "@/types/core";
import { cn } from "@/lib/utils";

type HighLevelCategory =
  | "arithmetic"
  | "algebra"
  | "geometry"
  | "number_theory"
  | "shortcuts"
  | "trigonometry"
  | "physics"
  | "other";

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

interface TopicFoldersProps {
  topics: Topic[];
  selectedCategory: HighLevelCategory | null;
  selectedTopicId: string | null;
  onSelectTopic: (topicId: string) => void;
  selectedTopicIds: string[];
}

export function TopicFolders({
  topics,
  selectedCategory,
  selectedTopicId,
  onSelectTopic,
  selectedTopicIds,
}: TopicFoldersProps) {
  // Filter topics by selected category
  const filteredTopics = selectedCategory
    ? topics.filter((topic) => {
        const highLevel = CATEGORY_MAP[topic.category] ?? "other";
        return highLevel === selectedCategory;
      })
    : [];

  // Count selected variants per topic
  const getSelectedCount = (topic: Topic) => {
    if (!topic.variants) return 0;
    return topic.variants.filter((variant) =>
      selectedTopicIds.includes(`${topic.id}-${variant.id}`)
    ).length;
  };

  return (
    <div className="w-full md:w-80 lg:w-72 xl:w-80 flex-shrink-0 flex flex-col min-h-0 bg-surface-mid rounded-2xl p-6 overflow-y-auto shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-text-muted">
          {selectedCategory ? categoryLabels[selectedCategory] || "Operations" : "Operations"}
        </h2>
        <span className="text-xs bg-primary/15 text-primary/80 px-2 py-1 rounded font-bold">
          {filteredTopics.length} Total
        </span>
      </div>

      <div className="space-y-3">
        {filteredTopics.length === 0 ? (
          <div className="text-center text-text-subtle py-8 text-sm">
            {selectedCategory ? "No topics in this category" : "Select a category"}
          </div>
        ) : (
          filteredTopics.map((topic) => {
            const isSelected = selectedTopicId === topic.id;
            const selectedCount = getSelectedCount(topic);
            const variantCount = topic.variants?.length || 0;

            return (
              <button
                key={topic.id}
                onClick={() => onSelectTopic(topic.id)}
                className={cn(
                  "w-full text-left p-4 rounded-xl transition-all relative overflow-hidden group",
                  isSelected
                    ? "bg-surface-elevated shadow-md ring-1 ring-primary/30"
                    : "bg-surface-elevated hover:bg-surface-neutral hover:shadow-sm"
                )}
              >
                {isSelected && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary/70" />
                )}
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-text mb-1">{topic.name}</h3>
                    <p className="text-xs text-text-subtle truncate">{topic.description}</p>
                  </div>
                  {isSelected ? (
                    <FolderOpen className="text-primary/80 text-xl flex-shrink-0 ml-2" />
                  ) : (
                    <Folder className="text-text-muted/60 text-xl flex-shrink-0 ml-2 group-hover:text-primary/60 transition-colors" />
                  )}
                </div>
                <div className="flex items-center gap-3 mt-4">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-subtle/60 text-text-muted">
                    {variantCount} {variantCount === 1 ? "Drill" : "Drills"}
                  </span>
                  {selectedCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary/80">
                      {selectedCount} Selected
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

const categoryLabels: Record<HighLevelCategory, string> = {
  arithmetic: "Arithmetic",
  algebra: "Algebra",
  geometry: "Geometry",
  number_theory: "Number Theory",
  shortcuts: "Shortcuts",
  trigonometry: "Trigonometry",
  physics: "Physics",
  other: "Other",
};
