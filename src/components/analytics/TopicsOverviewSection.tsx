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
        // Sort by percentile (descending) - higher percentile = stronger
        topics.sort((a, b) => (b.percentile || 0) - (a.percentile || 0));
        break;
      case "weakness":
        // Sort by percentile (ascending) - lower percentile = weaker
        topics.sort((a, b) => (a.percentile || 0) - (b.percentile || 0));
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
        // Sort by percentile (descending) - higher percentile = stronger
        sortedByPerformance.sort((a, b) => (b.percentile || 0) - (a.percentile || 0));
        break;
      case "weakness":
        // Sort by percentile (ascending) - lower percentile = weaker
        sortedByPerformance.sort((a, b) => (a.percentile || 0) - (b.percentile || 0));
        break;
      case "questions":
        sortedByPerformance.sort((a, b) => b.questionsAnswered - a.questionsAnswered);
        break;
    }

    const totalTopics = sortedByPerformance.length;
    
    if (totalTopics === 0) {
      return { isEmpty: true };
    }
    
    // For top/bottom color determination, use CURRENT display order (after sortBy is applied)
    // Top 3 items in the current sorted list = green, bottom 3 = red
    const topCount = Math.min(3, Math.ceil(totalTopics / 2));
    const bottomCount = Math.min(3, Math.floor(totalTopics / 2));
    
    // Determine top and bottom based on display order (sortedByPerformance)
    const topByDisplayOrder = sortedByPerformance.slice(0, topCount);
    const bottomByDisplayOrder = totalTopics > topCount ? sortedByPerformance.slice(-bottomCount) : [];
    
    const topTopicIds = new Set(topByDisplayOrder.map(t => t.topicId));
    const bottomTopicIds = new Set(bottomByDisplayOrder.map(t => t.topicId));
    
    // Assign ranks and colors based on display order
    // Rank numbers stay as topic.rank (composite score based), but colors change based on display order
    const topicsWithDisplayRank = sortedByPerformance.map((topic, displayIndex) => {
      const isTop = topTopicIds.has(topic.topicId);
      const isBottom = bottomTopicIds.has(topic.topicId);
      // Keep rank as topic.rank (composite score based), don't change it based on display order
      const displayRank = topic.rank || displayIndex + 1;
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
    <div className="relative overflow-hidden rounded-organic-xl border border-border bg-surface-elevated p-6 ring-1 ring-text/[0.06] sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 shrink-0 text-left">
          <h2 className="font-heading text-xl font-bold tracking-tight text-text sm:text-2xl">
            Topic Performance
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Rankings and practice volume by topic
          </p>
        </div>
        
        {/* Search and Sort Controls */}
        <div className="flex gap-3 items-center flex-1 min-w-0 justify-end">
          {/* Search Input */}
          <div className="relative flex-1 sm:max-w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="search"
              placeholder="Search topics…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-organic-md border border-border bg-surface-mid py-2.5 pl-10 pr-4 font-sans text-sm text-text caret-primary placeholder:text-text-disabled transition-colors focus:border-primary/35 focus:outline-none focus:ring-2 focus:ring-primary/20"
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
              className="w-full cursor-pointer appearance-none rounded-organic-md border border-border bg-surface-mid px-4 py-2.5 pr-10 font-sans text-sm font-medium text-text transition-colors hover:bg-surface-neutral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
              style={{
                colorScheme: "dark",
              }}
            >
              <option value="strength" className="bg-surface-elevated text-text">
                Strongest First
              </option>
              <option value="weakness" className="bg-surface-elevated text-text">
                Weakest First
              </option>
              <option value="questions" className="bg-surface-elevated text-text">
                Most Practiced
              </option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          </div>

          {/* Collapse Button */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="group flex shrink-0 rounded-organic-md p-2 transition-colors hover:bg-surface-subtle"
          >
            <ChevronDown
              className={cn(
                "h-6 w-6 text-text-muted transition-all duration-200 group-hover:text-text",
                isCollapsed && "rotate-180",
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
              <div className="mb-2 grid grid-cols-12 gap-4 border-b border-border-subtle px-5 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-text-muted">
                <div className="col-span-1 text-center">Rank</div>
                <div className="col-span-2 text-left">Topic</div>
                <div className="col-span-1 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span>Percentile</span>
                    <div className="relative group">
                      <Info className="h-3.5 w-3.5 cursor-help text-text-subtle transition-colors hover:text-text-muted" />
                      <div className="absolute right-0 top-full z-20 mt-2 hidden w-72 rounded-organic-md border border-border bg-surface-elevated p-3 text-[11px] text-text shadow-lg group-hover:block">
                        <div className="mb-2 font-semibold text-text">How ranking works</div>
                        <div className="space-y-1.5 text-text-muted">
                          <p>Topics are ranked using a composite score that combines:</p>
                          <ul className="list-disc list-inside space-y-0.5 ml-1">
                            <li><strong>Accuracy (50%):</strong> Your percentage of correct answers</li>
                            <li><strong>Practice Volume (30%):</strong> Number of questions practiced (with diminishing returns to prevent grinding)</li>
                            <li><strong>Speed (20%):</strong> Average time per question (faster is better)</li>
                          </ul>
                          <p className="mt-2 text-text-subtle">
                            Minimum 10 questions required for a meaningful score. Percentile shows where you rank among your topics.
                          </p>
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
                <div className="py-12 text-center text-text-muted">
                  <Search className="mx-auto mb-3 h-12 w-12 opacity-40" />
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
                        <div className="py-4 text-center text-sm text-text-muted">More data needed</div>
                      )}

                      {/* Show All Button (Centered ...) */}
                      {visibleTopicsData.totalTopics > (visibleTopicsData.topTopics?.length || 0) + (visibleTopicsData.bottomTopics?.length || 0) && (
                        <div className="flex justify-center pt-2 pb-2">
                          <button
                            type="button"
                            onClick={() => setShowAllTopics(true)}
                            className="text-4xl font-light leading-none text-text-disabled transition-colors hover:text-text-muted"
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
                        // Colors based on display order (top 3 = green, bottom 3 = red)
                        // This is already set correctly in visibleTopicsData based on sortedByPerformance
                        const isTopTopic = topic.isTop ? true : topic.isBottom ? false : undefined;
                        // Rank stays as topic.rank (composite score based), don't change it based on display order
                        
                        return (
                          <div key={topic.topicId} id={`topic-${topic.topicId}`}>
                            <TopicDetailCard
                              topic={{ ...topic, rank: topic.rank }}
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
                          type="button"
                          onClick={() => setShowAllTopics(false)}
                          className="text-sm text-text-muted transition-colors hover:text-text"
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

