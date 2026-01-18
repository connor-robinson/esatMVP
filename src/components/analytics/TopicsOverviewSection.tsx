/**
 * Unified topics overview section with search
 */

"use client";

import { useState, useMemo } from "react";
import { UserStats, TopicStats } from "@/types/analytics";
import { TopicDetailCard } from "./TopicDetailCard";
import { generateTopicDetails } from "@/lib/analytics";
import { Search, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface TopicsOverviewSectionProps {
  userStats: UserStats;
  strongest?: any;
  weakest?: any;
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
  const [sortBy, setSortBy] = useState<"strength" | "weakness" | "questions">("strength");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAllTopics, setShowAllTopics] = useState(false);

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
      case "questions":
        // Sort by number of questions answered (most practiced)
        topics.sort((a, b) => b.questionsAnswered - a.questionsAnswered);
        break;
    }

    return topics;
  }, [allTopics, searchQuery, sortBy]);

  // Calculate visible topics based on showAllTopics state
  const visibleTopicsData = useMemo(() => {
    if (showAllTopics || filteredTopics.length <= 6) {
      return { all: filteredTopics, isExpanded: showAllTopics };
    }

    // Show top 4 and bottom 2
    const top4 = filteredTopics.slice(0, 4);
    const bottom2 = filteredTopics.slice(-2);
    return { top4, bottom2, hasMore: true, isExpanded: false };
  }, [filteredTopics, showAllTopics]);

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

  const handleStrongestWeakestClick = (topicId: string, topicName: string) => {
    handleTopicClick(topicId, topicName);
  };

  return (
    <div className="relative rounded-organic-lg overflow-hidden bg-white/[0.03] p-6">
      {/* Section Header */}
      <button
        onClick={onToggleCollapse}
        className="w-full flex items-center justify-between mb-6 group"
      >
        <div className="text-left">
          <h2 className="text-base font-bold uppercase tracking-wider text-white/90 group-hover:text-white transition-colors">
            Topic Performance & Overview
          </h2>
          <p className="text-sm text-white/60 mt-1">
            Analyze your performance across all topics
          </p>
        </div>
        <ChevronDown 
          className={cn(
            "h-6 w-6 text-white/50 group-hover:text-white/70 transition-all duration-200",
            isCollapsed && "rotate-180"
          )}
        />
      </button>

      {/* Collapsible Content */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden space-y-6"
          >
            {/* All Topics Section */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-white/70">
                  All Topics
                </h3>
                
                {/* Search and Sort Controls */}
                <div className="flex flex-col sm:flex-row gap-3 flex-1 sm:justify-end">
                  {/* Search Input */}
                  <div className="relative flex-1 sm:max-w-[280px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <input
                      type="text"
                      placeholder="Search topics..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white/5 rounded-organic-md text-sm text-white/90 placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-interview/30 transition-all duration-200"
                    />
                  </div>

                  {/* Sort Dropdown */}
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => {
                        const newSort = e.target.value as "strength" | "weakness" | "questions";
                        setSortBy(newSort);
                        setShowAllTopics(false); // Reset expand state when sort changes
                      }}
                      className="appearance-none cursor-pointer bg-white/5 hover:bg-white/10 rounded-organic-md px-4 py-2.5 pr-10 text-sm font-medium text-white/80 focus:outline-none focus:ring-2 focus:ring-interview/30 transition-all duration-200"
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
                      <option value="questions" className="bg-neutral-800 text-white">
                        Most Practiced
                      </option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Column Headers */}
              <div className="grid grid-cols-12 gap-4 px-5 py-2 mb-2 text-xs font-semibold text-white/40 border-b border-white/10">
                <div className="col-span-1">Rank</div>
                <div className="col-span-3">Topic</div>
                <div className="col-span-2">Accuracy</div>
                <div className="col-span-2">Speed</div>
                <div className="col-span-2">Sessions</div>
                <div className="col-span-1">Questions</div>
                <div className="col-span-1"></div>
              </div>

              {/* All Topics List (Expandable Cards) */}
              {filteredTopics.length === 0 ? (
                <div className="text-center py-12 text-white/40">
                  <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No topics found matching &quot;{searchQuery}&quot;</p>
                </div>
              ) : "all" in visibleTopicsData && visibleTopicsData.all ? (
                // Show all topics (expanded state)
                <div className={cn(
                  "space-y-1",
                  visibleTopicsData.isExpanded && "max-h-[600px] overflow-y-auto"
                )}>
                  {visibleTopicsData.all.map((topic) => (
                    <div key={topic.topicId} id={`topic-${topic.topicId}`}>
                      <TopicDetailCard
                        topic={topic}
                        isExpanded={expandedId === topic.topicId}
                        onClick={() => setExpandedId(expandedId === topic.topicId ? null : topic.topicId)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                // Show top 4, ..., bottom 2 (collapsed state)
                "top4" in visibleTopicsData && "bottom2" in visibleTopicsData ? (
                  <div className="space-y-1">
                    {/* Top 4 */}
                    {visibleTopicsData.top4.map((topic) => (
                      <div key={topic.topicId} id={`topic-${topic.topicId}`}>
                        <TopicDetailCard
                          topic={topic}
                          isExpanded={expandedId === topic.topicId}
                          onClick={() => setExpandedId(expandedId === topic.topicId ? null : topic.topicId)}
                        />
                      </div>
                    ))}

                    {/* Expand Button */}
                    {visibleTopicsData.hasMore && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAllTopics(true);
                        }}
                        className="w-full py-3 flex items-center justify-center text-white/60 hover:text-white/80 transition-colors"
                      >
                        <span className="text-2xl font-bold">...</span>
                      </button>
                    )}

                    {/* Bottom 2 */}
                    {visibleTopicsData.bottom2.map((topic) => (
                      <div key={topic.topicId} id={`topic-${topic.topicId}`}>
                        <TopicDetailCard
                          topic={topic}
                          isExpanded={expandedId === topic.topicId}
                          onClick={() => setExpandedId(expandedId === topic.topicId ? null : topic.topicId)}
                        />
                      </div>
                    ))}
                  </div>
                ) : null
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

