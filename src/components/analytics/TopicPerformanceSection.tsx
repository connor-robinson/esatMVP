/**
 * Merged topic performance and overview section
 * Combines performance charts with topic breakdowns
 */

"use client";

import { useState, useMemo } from "react";
import { UserStats, PerformanceDataPoint, TopicStats } from "@/types/analytics";
import { TopicDetailCard } from "./TopicDetailCard";
import { AccuracyChart } from "./AccuracyChart";
import { SpeedChart } from "./SpeedChart";
import { generateTopicDetails } from "@/lib/analytics";
import { Search, BarChart3, BookOpen, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface TopicPerformanceSectionProps {
  userStats: UserStats;
  performanceData: PerformanceDataPoint[];
  strongest?: TopicStats[];
  weakest?: TopicStats[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function TopicPerformanceSection({
  userStats,
  performanceData,
  strongest,
  weakest,
  isCollapsed = false,
  onToggleCollapse,
}: TopicPerformanceSectionProps) {
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
              Topic Performance & Analysis
            </h2>
            <p className="text-sm text-white/60 mt-1">
              Performance trends and detailed topic breakdowns
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
            className="overflow-hidden space-y-8"
          >
            {/* Performance Charts Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-organic-md bg-white/5 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-white/60" />
                </div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-white/70">
                  Performance Trends
                </h3>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AccuracyChart data={performanceData} />
                <SpeedChart data={performanceData} />
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/10" />

            {/* Topic Breakdown Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-organic-md bg-white/5 flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-white/60" />
                </div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-white/70">
                  Topic Breakdown
                </h3>
              </div>

              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
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

              {/* Topics List */}
              {filteredTopics.length > 0 ? (
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

