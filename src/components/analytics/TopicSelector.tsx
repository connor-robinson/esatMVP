/**
 * Topic dropdown selector for global view
 */

"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, BookOpen, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopicSelectorProps {
  availableTopics: { id: string; name: string }[];
  value: string;
  onChange: (topicId: string) => void;
}

export function TopicSelector({
  availableTopics,
  value,
  onChange,
}: TopicSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedTopic = availableTopics.find((t) => t.id === value);

  // Filter topics based on search query
  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) return availableTopics;
    const query = searchQuery.toLowerCase();
    return availableTopics.filter((topic) =>
      topic.name.toLowerCase().includes(query)
    );
  }, [availableTopics, searchQuery]);

  const handleTopicSelect = (topicId: string) => {
    onChange(topicId);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-organic-md text-sm font-medium transition-all duration-200 bg-interview/20 text-interview hover:bg-interview/30"
      >
        <BookOpen className="h-4 w-4" />
        <span>
          {value === "all" ? "All Topics" : selectedTopic?.name || "Select Topic"}
        </span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full mt-2 right-0 w-64 bg-background/95 backdrop-blur-xl rounded-organic-lg shadow-2xl z-50 overflow-hidden"
            >
              {/* Search Bar */}
              <div className="p-3 border-b border-white/10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <input
                    type="text"
                    placeholder="Search topics..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-white/5 rounded-organic-md text-sm text-white/90 placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-interview/40 transition-all"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>

              {/* Options */}
              <div className="p-2 max-h-[320px] overflow-y-auto">
                {/* All Topics option */}
                <button
                  onClick={() => handleTopicSelect("all")}
                  className={cn(
                    "w-full text-left px-4 py-2.5 rounded-organic-md text-sm transition-colors",
                    value === "all"
                      ? "bg-interview/20 text-interview font-medium"
                      : "text-white/70 hover:bg-white/5"
                  )}
                >
                  All Topics
                </button>

                {/* Separator */}
                {filteredTopics.length > 0 && (
                  <div className="my-2 h-px bg-white/10" />
                )}

                {/* Filtered Topics */}
                {filteredTopics.length > 0 ? (
                  filteredTopics.map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => handleTopicSelect(topic.id)}
                      className={cn(
                        "w-full text-left px-4 py-2.5 rounded-organic-md text-sm transition-colors",
                        value === topic.id
                          ? "bg-interview/20 text-interview font-medium"
                          : "text-white/70 hover:bg-white/5"
                      )}
                    >
                      {topic.name}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-white/40 text-center">
                    No topics found
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

