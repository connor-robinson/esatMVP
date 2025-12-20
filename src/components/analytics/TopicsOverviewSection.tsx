/**
 * Unified topics overview section with search
 */

"use client";

import { useState, useMemo } from "react";
import { UserStats, TopicStats } from "@/types/analytics";
import { TopicDetailCard } from "./TopicDetailCard";
import { generateTopicDetails } from "@/lib/analytics";
import { Search, SortAsc, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface TopicsOverviewSectionProps {
  userStats: UserStats;
  strongest?: TopicStats[];
  weakest?: TopicStats[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function TopicsOverviewSection({
  userStats,
  strongest,
  weakest,
  isCollapsed = false,
  onToggleCollapse,
}: TopicsOverviewSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"strength" | "weakness" | "time" | "questions">("strength");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Generate all topics with details
  const allTopics = useMemo(() => generateTopicDetails(userStats), [userStats]);

  // Filter by search
  const filteredTopics = useMemo(() => {
    let topics = allTopics.filter((topic) =>
      topic.topicName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort topics
    switch (sortBy) {
      case "strength":
        topics.sort((a, b) => b.accuracy - a.accuracy);
        break;
      case "weakness":
        topics.sort((a, b) => a.accuracy - b.accuracy);
        break;
      case "time":
        topics.sort((a, b) => b.totalPracticeTime - a.totalPracticeTime);
        break;
      case "questions":
        topics.sort((a, b) => b.questionsAnswered - a.questionsAnswered);
        break;
    }

    return topics;
  }, [allTopics, searchQuery, sortBy]);

  const handleTopicClick = (topicId: string, topicName: string) => {
    setExpandedId(topicId);
    setSearchQuery(topicName);
    // Scroll to topic if needed
    setTimeout(() => {
      const element = document.getElementById(`topic-${topicId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-6">
      {/* Section Header */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">
            Topics Overview
          </h2>
          <p className="text-sm text-white/40 mt-1">
            Analyze your performance across all topics
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              type="text"
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/30 w-64"
            />
          </div>

          {/* Sort Dropdown */}
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
                Strongest First
              </option>
              <option value="weakness" className="bg-neutral-800 text-white">
                Weakest First
              </option>
              <option value="time" className="bg-neutral-800 text-white">
                Most Practiced (Time)
              </option>
              <option value="questions" className="bg-neutral-800 text-white">
                Most Practiced (Questions)
              </option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
          </div>
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-xl hover:bg-white/5 transition-colors group"
        >
          <ChevronDown 
            className={cn(
              "h-6 w-6 text-white/40 group-hover:text-white/60 transition-all duration-200",
              isCollapsed && "rotate-180"
            )}
          />
        </button>
      </div>

      {/* Collapsible Content */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ maxHeight: 0, opacity: 0 }}
            animate={{ maxHeight: 3000, opacity: 1 }}
            exit={{ maxHeight: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            {/* All Topics List (Expandable Cards) */}
            <div className="space-y-3">
        {filteredTopics.map((topic) => (
          <div key={topic.topicId} id={`topic-${topic.topicId}`}>
            <TopicDetailCard
              topic={topic}
              isExpanded={expandedId === topic.topicId}
              onClick={() => setExpandedId(expandedId === topic.topicId ? null : topic.topicId)}
            />
          </div>
        ))}
      </div>

      {filteredTopics.length === 0 && (
        <div className="text-center py-12 text-white/40">
          <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No topics found matching &quot;{searchQuery}&quot;</p>
        </div>
      )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

