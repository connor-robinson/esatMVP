"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import type { SubjectFilter, DifficultyFilter, QuestionBankFilters } from "@/types/questionBank";
import { cn } from "@/lib/utils";

interface FilterPanelProps {
  filters: QuestionBankFilters;
  onFilterChange: (filters: QuestionBankFilters) => void;
}

const subjects: SubjectFilter[] = ['All', 'Math 1', 'Math 2', 'Physics', 'Chemistry', 'Biology'];
const difficulties: DifficultyFilter[] = ['All', 'Easy', 'Medium', 'Hard'];

// Subject colors matching the CSS variables
const subjectColors: Record<SubjectFilter, string> = {
  'All': 'bg-white/10 hover:bg-white/15 text-white/90',
  'Math 1': 'bg-[#5da8f0]/20 hover:bg-[#5da8f0]/30 text-[#5da8f0] border border-[#5da8f0]/30',
  'Math 2': 'bg-[#5da8f0]/20 hover:bg-[#5da8f0]/30 text-[#5da8f0] border border-[#5da8f0]/30',
  'Physics': 'bg-[#a78bfa]/20 hover:bg-[#a78bfa]/30 text-[#a78bfa] border border-[#a78bfa]/30',
  'Chemistry': 'bg-[#ef7d7d]/20 hover:bg-[#ef7d7d]/30 text-[#ef7d7d] border border-[#ef7d7d]/30',
  'Biology': 'bg-[#85BC82]/20 hover:bg-[#85BC82]/30 text-[#85BC82] border border-[#85BC82]/30',
};

export function FilterPanel({ filters, onFilterChange }: FilterPanelProps) {
  const [searchInput, setSearchInput] = useState(filters.searchTag);

  const handleSubjectChange = (subject: SubjectFilter) => {
    onFilterChange({ ...filters, subject });
  };

  const handleDifficultyChange = (difficulty: DifficultyFilter) => {
    onFilterChange({ ...filters, difficulty });
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    // Debounce or immediate update - using immediate for simplicity
    onFilterChange({ ...filters, searchTag: value });
  };

  return (
    <div className="space-y-4">
      {/* Subject Filter */}
      <div>
        <label className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wide">
          Subject
        </label>
        <div className="flex flex-wrap gap-2">
          {subjects.map((subject) => (
            <button
              key={subject}
              onClick={() => handleSubjectChange(subject)}
              className={cn(
                "px-4 py-2 rounded-organic-md text-sm font-medium transition-all duration-fast ease-signature",
                filters.subject === subject
                  ? subjectColors[subject] + " scale-105"
                  : "bg-white/5 hover:bg-white/10 text-white/60"
              )}
            >
              {subject}
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty and Tag Search */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Difficulty Filter */}
        <div>
          <label className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wide">
            Difficulty
          </label>
          <div className="flex gap-2">
            {difficulties.map((difficulty) => (
              <button
                key={difficulty}
                onClick={() => handleDifficultyChange(difficulty)}
                className={cn(
                  "flex-1 px-3 py-2 rounded-organic-md text-sm font-medium transition-all duration-fast ease-signature",
                  filters.difficulty === difficulty
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "bg-white/5 hover:bg-white/10 text-white/60"
                )}
              >
                {difficulty}
              </button>
            ))}
          </div>
        </div>

        {/* Tag Search */}
        <div>
          <label className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wide">
            Search Topics
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="e.g., calculus, kinematics..."
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-organic-md text-sm text-white/90 placeholder:text-white/40 focus:bg-white/10 focus:border-primary/30 focus:outline-none transition-all duration-fast"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

