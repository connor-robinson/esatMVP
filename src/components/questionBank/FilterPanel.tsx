"use client";

import { useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import type { SubjectFilter, DifficultyFilter, AttemptedFilter, ReviewStatusFilter, QuestionBankFilters } from "@/types/questionBank";
import { cn } from "@/lib/utils";

interface FilterPanelProps {
  filters: QuestionBankFilters;
  onFilterChange: (filters: QuestionBankFilters) => void;
  onToggleFilters?: () => void;
  showToggle?: boolean;
}

const subjects: SubjectFilter[] = ['All', 'Math 1', 'Math 2', 'Physics', 'Chemistry', 'Biology', 'TMUA Paper 1', 'TMUA Paper 2'];
const difficulties: DifficultyFilter[] = ['All', 'Easy', 'Medium', 'Hard'];
const attemptedStatuses: AttemptedFilter[] = ['Mix', 'New', 'Attempted'];
const reviewStatuses: ReviewStatusFilter[] = ['All', 'Pending Review', 'Approved', 'Needs Revision'];

// Common curriculum topics for dropdown
const curriculumTopics = [
  'Calculus', 'Algebra', 'Trigonometry', 'Geometry', 'Statistics', 'Probability',
  'Kinematics', 'Dynamics', 'Energy', 'Waves', 'Electricity', 'Magnetism',
  'Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry', 'Analytical Chemistry',
  'Cell Biology', 'Genetics', 'Evolution', 'Ecology', 'Physiology', 'Anatomy'
];

// Subject colors matching the CSS variables
const subjectColors: Record<SubjectFilter, string> = {
  'All': 'bg-white/10 hover:bg-white/15 text-white/90',
  'Math 1': 'bg-[#5da8f0]/20 hover:bg-[#5da8f0]/30 text-[#5da8f0] border border-[#5da8f0]/30',
  'Math 2': 'bg-[#5da8f0]/20 hover:bg-[#5da8f0]/30 text-[#5da8f0] border border-[#5da8f0]/30',
  'Physics': 'bg-[#a78bfa]/20 hover:bg-[#a78bfa]/30 text-[#a78bfa] border border-[#a78bfa]/30',
  'Chemistry': 'bg-[#ef7d7d]/20 hover:bg-[#ef7d7d]/30 text-[#ef7d7d] border border-[#ef7d7d]/30',
  'Biology': 'bg-[#85BC82]/20 hover:bg-[#85BC82]/30 text-[#85BC82] border border-[#85BC82]/30',
  'TMUA Paper 1': 'bg-[#5da8f0]/20 hover:bg-[#5da8f0]/30 text-[#5da8f0] border border-[#5da8f0]/30',
  'TMUA Paper 2': 'bg-[#a78bfa]/20 hover:bg-[#a78bfa]/30 text-[#a78bfa] border border-[#a78bfa]/30',
};

export function FilterPanel({ filters, onFilterChange, onToggleFilters, showToggle = false }: FilterPanelProps) {
  const [searchInput, setSearchInput] = useState(filters.searchTag);
  const [showTopicDropdown, setShowTopicDropdown] = useState(false);

  const handleSubjectChange = (subject: SubjectFilter) => {
    onFilterChange({ ...filters, subject });
  };

  const handleDifficultyChange = (difficulty: DifficultyFilter) => {
    onFilterChange({ ...filters, difficulty });
  };

  const handleAttemptedStatusChange = (attemptedStatus: AttemptedFilter) => {
    onFilterChange({ ...filters, attemptedStatus });
  };

  const handleReviewStatusChange = (reviewStatus: ReviewStatusFilter) => {
    onFilterChange({ ...filters, reviewStatus });
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    // Debounce or immediate update - using immediate for simplicity
    onFilterChange({ ...filters, searchTag: value });
  };

  const handleTopicSelect = (topic: string) => {
    setSearchInput(topic);
    onFilterChange({ ...filters, searchTag: topic });
    setShowTopicDropdown(false);
  };

  return (
    <div className="space-y-4">
      {/* Subject Filter */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-white/50 uppercase tracking-wide">
            Subject
          </label>
          {showToggle && (
            <button
              onClick={onToggleFilters}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-md text-xs text-white/60 transition-all duration-fast"
            >
              Hide Filters
            </button>
          )}
        </div>
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

      {/* Difficulty, Attempted Status, Review Status, and Tag Search */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

        {/* Attempted Status Filter */}
        <div>
          <label className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wide">
            User Status
          </label>
          <div className="flex gap-2">
            {attemptedStatuses.map((status) => (
              <button
                key={status}
                onClick={() => handleAttemptedStatusChange(status)}
                className={cn(
                  "flex-1 px-3 py-2 rounded-organic-md text-sm font-medium transition-all duration-fast ease-signature",
                  filters.attemptedStatus === status
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "bg-white/5 hover:bg-white/10 text-white/60"
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Review Status Filter */}
        <div>
          <label className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wide">
            Review Status
          </label>
          <div className="flex gap-2">
            {reviewStatuses.map((status) => (
              <button
                key={status}
                onClick={() => handleReviewStatusChange(status)}
                className={cn(
                  "flex-1 px-2 py-2 rounded-organic-md text-xs font-medium transition-all duration-fast ease-signature",
                  filters.reviewStatus === status
                    ? (status === 'Pending Review' || status === 'Needs Revision')
                      ? "bg-error/20 text-error border border-error/30"
                      : status === 'Approved'
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : "bg-primary/20 text-primary border border-primary/30"
                    : "bg-white/5 hover:bg-white/10 text-white/60"
                )}
              >
                {status === 'Pending Review' ? 'Pending' : status === 'Needs Revision' ? 'Revision' : status}
              </button>
            ))}
          </div>
        </div>

        {/* Topic Selector with Dropdown and Search */}
        <div>
          <label className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wide">
            Topic
          </label>
          <div className="relative">
            {/* Topic Dropdown Button */}
            <button
              onClick={() => setShowTopicDropdown(!showTopicDropdown)}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-organic-md text-sm text-white/90 hover:bg-white/10 transition-all duration-fast text-left flex items-center justify-between"
            >
              <span className="truncate">{searchInput || 'Select or search topics...'}</span>
              <ChevronDown className={cn("w-4 h-4 text-white/40 transition-transform", showTopicDropdown && "rotate-180")} />
            </button>
            
            {/* Dropdown Menu */}
            {showTopicDropdown && (
              <div className="absolute z-50 w-full mt-2 bg-neutral-800 border border-white/10 rounded-organic-md shadow-xl max-h-60 overflow-y-auto">
                {/* Search Input in Dropdown */}
                <div className="sticky top-0 bg-neutral-800 p-2 border-b border-white/10">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Search or type custom topic..."
                      className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-md text-sm text-white/90 placeholder:text-white/40 focus:bg-white/10 focus:border-primary/30 focus:outline-none"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
                
                {/* Topic List */}
                <div className="p-1">
                  {searchInput && !curriculumTopics.some(t => t.toLowerCase() === searchInput.toLowerCase()) && (
                    <button
                      onClick={() => handleTopicSelect(searchInput)}
                      className="w-full px-3 py-2 text-left text-sm text-primary hover:bg-white/5 rounded-md transition-colors"
                    >
                      Use &quot;{searchInput}&quot;
                    </button>
                  )}
                  {curriculumTopics
                    .filter(topic => !searchInput || topic.toLowerCase().includes(searchInput.toLowerCase()))
                    .map((topic) => (
                      <button
                        key={topic}
                        onClick={() => handleTopicSelect(topic)}
                        className="w-full px-3 py-2 text-left text-sm text-white/80 hover:bg-white/5 rounded-md transition-colors"
                      >
                        {topic}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

