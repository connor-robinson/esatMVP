/**
 * Topics detail view with sorting and expandable topic cards
 */

"use client";

import { useState, useMemo } from "react";
import { TopicDetailStats } from "@/types/analytics";
import { TopicDetailCard } from "./TopicDetailCard";
import { SortAsc } from "lucide-react";

interface TopicsDetailViewProps {
  topics: TopicDetailStats[];
}

export function TopicsDetailView({ topics }: TopicsDetailViewProps) {
  const [sortBy, setSortBy] = useState<"strength" | "weakness" | "time" | "questions">(
    "strength"
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Sort topics
  const sortedTopics = useMemo(() => {
    const sorted = [...topics];
    switch (sortBy) {
      case "strength":
        sorted.sort((a, b) => b.accuracy - a.accuracy);
        break;
      case "weakness":
        sorted.sort((a, b) => a.accuracy - b.accuracy);
        break;
      case "time":
        sorted.sort((a, b) => b.totalPracticeTime - a.totalPracticeTime);
        break;
      case "questions":
        sorted.sort((a, b) => b.questionsAnswered - a.questionsAnswered);
        break;
    }
    return sorted;
  }, [topics, sortBy]);

  const handleToggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getSortLabel = () => {
    switch (sortBy) {
      case "strength":
        return "Strongest First";
      case "weakness":
        return "Weakest First";
      case "time":
        return "Most Time";
      case "questions":
        return "Most Questions";
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Sort Dropdown */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white/70">Topics Detail</h3>
          <p className="text-sm text-white/40 mt-1">
            {topics.length} topic{topics.length !== 1 ? "s" : ""} tracked
          </p>
        </div>
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as "strength" | "weakness" | "time" | "questions")
            }
            className="appearance-none cursor-pointer bg-white/5 hover:bg-white/8 border border-white/10 hover:border-white/20 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-white/80 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200"
            style={{
              colorScheme: "dark",
            }}
          >
            <option value="strength" className="bg-neutral-800 text-white">
              Sort by Strength
            </option>
            <option value="weakness" className="bg-neutral-800 text-white">
              Sort by Weakness
            </option>
            <option value="time" className="bg-neutral-800 text-white">
              Sort by Practice Time
            </option>
            <option value="questions" className="bg-neutral-800 text-white">
              Sort by Questions
            </option>
          </select>
          <SortAsc className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
        </div>
      </div>

      {/* Topics List */}
      <div className="space-y-3">
        {sortedTopics.map((topic) => (
          <TopicDetailCard
            key={topic.topicId}
            topic={topic}
            isExpanded={expandedId === topic.topicId}
            onClick={() => handleToggleExpand(topic.topicId)}
          />
        ))}
      </div>
    </div>
  );
}

