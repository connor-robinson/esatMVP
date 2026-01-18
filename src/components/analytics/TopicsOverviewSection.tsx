/**
 * Unified topics overview section with search
 */

"use client";

import { useState, useMemo } from "react";
import { UserStats, TopicStats, WrongQuestionPattern } from "@/types/analytics";
import { TopicDetailCard } from "./TopicDetailCard";
import { generateTopicDetails } from "@/lib/analytics";
import { Search, ChevronDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface TopicsOverviewSectionProps {
  userStats: UserStats;
  strongest?: any;
  weakest?: any;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  commonMistakesMap?: Map<string, WrongQuestionPattern[]>;
}

export function TopicsOverviewSection({
  userStats,
  strongest,
  weakest,
  isCollapsed = false,
  onToggleCollapse,
  commonMistakesMap,
}: TopicsOverviewSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"strength" | "weakness" | "questions">("strength");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAllTopics, setShowAllTopics] = useState(false);

  // Generate all topics with details
  const allTopics = useMemo(() => generateTopicDetails(userStats, commonMistakesMap), [userStats, commonMistakesMap]);

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

  // Calculate visible topics: top 3 (green) and bottom 3 (red)
  // Sort by composite score (topic.rank) first to determine top/bottom
  const topicsSortedByPerformance = useMemo(() => {
    return [...allTopics].sort((a, b) => (a.rank || 999) - (b.rank || 999));
  }, [allTopics]);

  const visibleTopicsData = useMemo(() => {
    // First, filter by search query
    let sortedByPerformance = topicsSortedByPerformance.filter((topic) =>
      topic.topicName.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    // Then apply additional sorting if needed (for display order)
    switch (sortBy) {
      case "strength":
        sortedByPerformance.sort((a, b) => b.accuracy - a.accuracy);
        break;
      case "weakness":
        sortedByPerformance.sort((a, b) => a.accuracy - b.accuracy);
        break;
      case "questions":
        sortedByPerformance.sort((a, b) => b.questionsAnswered - a.questionsAnswered);
        break;
    }

    const totalTopics = sortedByPerformance.length;
    
    if (totalTopics === 0) {
      return { isEmpty: true };
    }
    
    // For top/bottom determination, use composite score rank (topic.rank)
    // Re-sort by rank to find true top 3 and bottom 3
    const byRank = [...sortedByPerformance].sort((a, b) => (a.rank || 999) - (b.rank || 999));
    const topCount = Math.min(3, Math.ceil(totalTopics / 2));
    const bottomCount = Math.min(3, Math.floor(totalTopics / 2));
    
    const topByRank = byRank.slice(0, topCount);
    const bottomByRank = totalTopics > topCount ? byRank.slice(-bottomCount) : [];
    
    // Map these back to the display order (sortedByPerformance)
    const topTopicIds = new Set(topByRank.map(t => t.topicId));
    const bottomTopicIds = new Set(bottomByRank.map(t => t.topicId));
    
    // Assign display ranks: top 3 get 1, 2, 3 based on composite score rank
    const topicsWithDisplayRank = sortedByPerformance.map((topic, displayIndex) => {
      const isTop = topTopicIds.has(topic.topicId);
      const isBottom = bottomTopicIds.has(topic.topicId);
      // For top 3, assign ranks 1, 2, 3 based on their composite rank
      let displayRank = topic.rank || displayIndex + 1;
      if (isTop) {
        const rankInTop = topByRank.findIndex(t => t.topicId === topic.topicId);
        if (rankInTop !== -1) {
          displayRank = rankInTop + 1;
        }
      }
      return { ...topic, displayRank, isTop, isBottom };
    });
    
    const topTopics = topicsWithDisplayRank.filter(t => t.isTop);
    const bottomTopics = topicsWithDisplayRank.filter(t => t.isBottom);
    
    // Check if we need "more data needed" message
    const needsMoreData = totalTopics < 6 && topCount + bottomCount < totalTopics;
    
    return {
      topTopics,
      bottomTopics,
      needsMoreData,
      totalTopics,
      allTopicsWithRank: topicsWithDisplayRank,
    };
  }, [topicsSortedByPerformance, searchQuery, sortBy]);

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
    <div className="relative rounded-organic-lg overflow-hidden bg-[#121418] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_20px_rgba(0,0,0,0.25)] border-0 p-6">
      {/* Section Header with Search and Sort */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="text-left flex-shrink-0">
          <h2 className="text-base font-bold uppercase tracking-wider text-white/90">
            Topic Performance & Overview
          </h2>
          <p className="text-sm text-white/60 mt-1">
            Analyze your performance across all topics
          </p>
        </div>
        
        {/* Search and Sort Controls */}
        <div className="flex gap-3 items-center flex-1 min-w-0 justify-end">
          {/* Search Input */}
          <div className="relative flex-1 sm:max-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              type="text"
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 rounded-organic-md text-sm text-white/90 placeholder:text-white/40 focus:outline-none border-0 transition-all duration-200 font-sans"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => {
                const newSort = e.target.value as "strength" | "weakness" | "questions";
                setSortBy(newSort);
              }}
              className="appearance-none cursor-pointer bg-white/5 hover:bg-white/10 rounded-organic-md px-4 py-2.5 pr-10 text-sm font-medium text-white/80 focus:outline-none border-0 transition-all duration-200 font-sans"
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

          {/* Collapse Button */}
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-organic-md hover:bg-white/5 transition-colors group flex-shrink-0"
          >
            <ChevronDown 
              className={cn(
                "h-6 w-6 text-white/50 group-hover:text-white/70 transition-all duration-200",
                isCollapsed && "rotate-180"
              )}
            />
          </button>
        </div>
      </div>

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

              {/* Column Headers */}
              <div className="grid grid-cols-12 gap-4 px-5 py-2 mb-2 text-xs font-semibold text-white/40 border-b border-white/10 font-mono">
                <div className="col-span-1 text-center">Rank</div>
                <div className="col-span-2 text-left">Topic</div>
                <div className="col-span-1 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span>Percentile</span>
                    <div className="relative group">
                      <Info className="h-3.5 w-3.5 text-white/30 hover:text-white/50 transition-colors cursor-help" />
                      <div className="absolute right-0 top-full mt-2 z-20 hidden group-hover:block bg-[#0f1114] text-[11px] text-white/80 p-3 rounded-md border border-white/10 w-72 shadow-lg">
                        <div className="font-semibold mb-2 text-white/90">How Ranking Works</div>
                        <div className="space-y-1.5 text-white/70">
                          <p>Topics are ranked using a composite score that combines:</p>
                          <ul className="list-disc list-inside space-y-0.5 ml-1">
                            <li><strong>Accuracy (50%):</strong> Your percentage of correct answers</li>
                            <li><strong>Practice Volume (30%):</strong> Number of questions practiced (with diminishing returns to prevent grinding)</li>
                            <li><strong>Speed (20%):</strong> Average time per question (faster is better)</li>
                          </ul>
                          <p className="mt-2 text-white/60">Minimum 10 questions required for a meaningful score. Percentile shows where you rank among your topics.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-span-2 text-center">Accuracy</div>
                <div className="col-span-2 text-center">Speed</div>
                <div className="col-span-2 text-center">Sessions</div>
                <div className="col-span-1 text-center">Questions</div>
                <div className="col-span-1"></div>
              </div>

              {/* All Topics List */}
              {"isEmpty" in visibleTopicsData ? (
                <div className="text-center py-12 text-white/40">
                  <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No topics found matching &quot;{searchQuery}&quot;</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {!showAllTopics ? (
                    <>
                      {/* Top Topics (Green) */}
                      {visibleTopicsData.topTopics && visibleTopicsData.topTopics.length > 0 && (
                        <div>
                          <div className="space-y-1">
                            {visibleTopicsData.topTopics.map((topic) => (
                              <div key={topic.topicId} id={`topic-${topic.topicId}`}>
                                <TopicDetailCard
                                  topic={{ ...topic, rank: topic.displayRank }}
                                  isExpanded={expandedId === topic.topicId}
                                  onClick={() => setExpandedId(expandedId === topic.topicId ? null : topic.topicId)}
                                  isTopTopic={true}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* More Data Needed Message */}
                      {visibleTopicsData.needsMoreData && (
                        <div className="text-center py-4 text-white/40 text-sm">
                          More data needed
                        </div>
                      )}

                      {/* Show All Button (Centered ...) */}
                      {visibleTopicsData.totalTopics > (visibleTopicsData.topTopics?.length || 0) + (visibleTopicsData.bottomTopics?.length || 0) && (
                        <div className="flex justify-center pt-2 pb-2">
                          <button
                            onClick={() => setShowAllTopics(true)}
                            className="text-4xl text-white/40 hover:text-white/60 transition-colors font-light leading-none"
                          >
                            ...
                          </button>
                        </div>
                      )}

                      {/* Bottom Topics (Red) */}
                      {visibleTopicsData.bottomTopics && visibleTopicsData.bottomTopics.length > 0 && (
                        <div>
                          <div className="space-y-1">
                            {visibleTopicsData.bottomTopics.map((topic) => (
                              <div key={topic.topicId} id={`topic-${topic.topicId}`}>
                                <TopicDetailCard
                                  topic={{ ...topic, rank: topic.displayRank }}
                                  isExpanded={expandedId === topic.topicId}
                                  onClick={() => setExpandedId(expandedId === topic.topicId ? null : topic.topicId)}
                                  isTopTopic={false}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    /* All Topics (when showAllTopics is true) */
                    <div className="space-y-1">
                      {visibleTopicsData.allTopicsWithRank?.map((topic, index) => {
                        const isTopTopic = topic.isTop ? true : topic.isBottom ? false : undefined;
                        // Use sequential rank based on current sort order (already sorted by sortBy in visibleTopicsData)
                        const displayRank = index + 1;
                        
                        return (
                          <div key={topic.topicId} id={`topic-${topic.topicId}`}>
                            <TopicDetailCard
                              topic={{ ...topic, rank: displayRank }}
                              isExpanded={expandedId === topic.topicId}
                              onClick={() => setExpandedId(expandedId === topic.topicId ? null : topic.topicId)}
                              isTopTopic={isTopTopic}
                            />
                          </div>
                        );
                      })}
                      
                      {/* Hide All Button */}
                      <div className="flex justify-center pt-2">
                        <button
                          onClick={() => setShowAllTopics(false)}
                          className="text-sm text-white/60 hover:text-white/80 transition-colors"
                        >
                          Show Less
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

