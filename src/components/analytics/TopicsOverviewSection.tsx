/**
 * Unified topics overview section with search
 */

"use client";

import { useState, useMemo } from "react";
import { UserStats, TopicStats } from "@/types/analytics";
import { TopicDetailCard } from "./TopicDetailCard";
import { generateTopicDetails } from "@/lib/analytics";
import { Search, BarChart3, Trophy, AlertTriangle, ChevronDown } from "lucide-react";
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
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-organic-md bg-interview/20 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-interview/80" />
          </div>
          <div className="text-left">
            <h2 className="text-base font-bold uppercase tracking-wider text-white/90 group-hover:text-white transition-colors">
              Topic Performance & Overview
            </h2>
            <p className="text-sm text-white/60 mt-1">
              Your strongest and weakest topics, plus detailed breakdowns
            </p>
          </div>
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
            {/* Topic Performance - Strongest & Weakest */}
            {(strongest || weakest) && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-white/70">
                  Quick Highlights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Strongest Topic */}
                  {strongest && strongest.topicId && strongest.topicName && typeof strongest.accuracy === 'number' && (
                    <button
                      onClick={() => handleStrongestWeakestClick(strongest.topicId, strongest.topicName)}
                      className="relative rounded-organic-md overflow-hidden bg-white/[0.02] p-4 hover:bg-white/5 transition-all duration-200 text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-organic-md bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                          <Trophy className="h-5 w-5 text-white/60" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-1">Strongest</div>
                          <div className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors truncate">
                            {strongest.topicName}
                          </div>
                          <div className="text-xs text-white/60 mt-1">
                            {strongest.accuracy.toFixed(1)}% accuracy
                          </div>
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Weakest Topic */}
                  {weakest && weakest.topicId && weakest.topicName && typeof weakest.accuracy === 'number' && (
                    <button
                      onClick={() => handleStrongestWeakestClick(weakest.topicId, weakest.topicName)}
                      className="relative rounded-organic-md overflow-hidden bg-white/[0.02] p-4 hover:bg-white/5 transition-all duration-200 text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-organic-md bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                          <AlertTriangle className="h-5 w-5 text-white/60" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-1">Needs Work</div>
                          <div className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors truncate">
                            {weakest.topicName}
                          </div>
                          <div className="text-xs text-white/60 mt-1">
                            {weakest.accuracy.toFixed(1)}% accuracy
                          </div>
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Divider */}
            {(strongest || weakest) && (
              <div className="h-px bg-white/10" />
            )}

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
                      onChange={(e) =>
                        setSortBy(e.target.value as "strength" | "weakness" | "time" | "questions")
                      }
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
                      <option value="time" className="bg-neutral-800 text-white">
                        Most Practiced (Time)
                      </option>
                      <option value="questions" className="bg-neutral-800 text-white">
                        Most Practiced (Questions)
                      </option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Column Headers */}
              <div className="grid grid-cols-12 gap-4 px-4 py-2 mb-2 text-xs font-semibold text-white/40 border-b border-white/10">
                <div className="col-span-3">Topic</div>
                <div className="col-span-2 text-right">Accuracy</div>
                <div className="col-span-2 text-right">Speed</div>
                <div className="col-span-2 text-right">Sessions</div>
                <div className="col-span-2 text-right">Questions</div>
                <div className="col-span-1"></div>
              </div>

              {/* All Topics List (Expandable Cards) */}
              {filteredTopics.length > 0 ? (
                <div className="space-y-1">
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
              ) : (
                <div className="text-center py-12 text-white/40">
                  <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No topics found matching &quot;{searchQuery}&quot;</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

