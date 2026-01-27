"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Search, ChevronDown, Play } from "lucide-react";
import type { TestTypeFilter, SubjectFilter, DifficultyFilter, AttemptedFilter, AttemptResultFilter, QuestionBankFilters } from "@/types/questionBank";
import { cn } from "@/lib/utils";

interface FilterPopupProps {
  isOpen: boolean;
  onClose: () => void;
  filters: QuestionBankFilters;
  onFilterChange: (filters: QuestionBankFilters) => void;
  onStartSession?: (config: { count: number; topics: string[]; difficulties: string[] }) => void;
}

const testTypes: TestTypeFilter[] = ['All', 'ESAT', 'TMUA'];
const esatSubjects: SubjectFilter[] = ['Math 1', 'Math 2', 'Physics', 'Chemistry', 'Biology'];
const tmuaSubjects: SubjectFilter[] = ['Paper 1', 'Paper 2'];
const difficulties: DifficultyFilter[] = ['Easy', 'Medium', 'Hard'];
const attemptedStatuses: AttemptedFilter[] = ['Mix', 'New', 'Attempted'];
const attemptResults: AttemptResultFilter[] = ['Mixed Results', 'Unseen', 'Incorrect Before'];

// Common curriculum topics for dropdown
const curriculumTopics = [
  'Calculus', 'Algebra', 'Trigonometry', 'Geometry', 'Statistics', 'Probability',
  'Kinematics', 'Dynamics', 'Energy', 'Waves', 'Electricity', 'Magnetism',
  'Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry', 'Analytical Chemistry',
  'Cell Biology', 'Genetics', 'Evolution', 'Ecology', 'Physiology', 'Anatomy'
];

// Subject colors - borderless version (using signature colors from config/colors.ts)
const subjectColors: Record<SubjectFilter, string> = {
  'All': 'bg-white/10 hover:bg-white/15 text-white/90',
  'Math 1': 'bg-[#406166]/20 hover:bg-[#406166]/30 text-[#5da8f0]',
  'Math 2': 'bg-[#406166]/20 hover:bg-[#406166]/30 text-[#5da8f0]',
  'Physics': 'bg-[#2f2835]/30 hover:bg-[#2f2835]/40 text-[#a78bfa]',
  'Chemistry': 'bg-[#854952]/20 hover:bg-[#854952]/30 text-[#ef7d7d]',
  'Biology': 'bg-[#506141]/20 hover:bg-[#506141]/30 text-[#85BC82]',
  'Paper 1': 'bg-[#406166]/20 hover:bg-[#406166]/30 text-[#5da8f0]',
  'Paper 2': 'bg-[#2f2835]/30 hover:bg-[#2f2835]/40 text-[#a78bfa]',
};

// Test type colors
const testTypeColors: Record<TestTypeFilter, string> = {
  'All': 'bg-white/10 hover:bg-white/15 text-white/90',
  'ESAT': 'bg-[#5da8f0]/20 hover:bg-[#5da8f0]/30 text-[#5da8f0]',
  'TMUA': 'bg-[#a78bfa]/20 hover:bg-[#a78bfa]/30 text-[#a78bfa]',
};

export function FilterPopup({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  onStartSession,
}: FilterPopupProps) {
  const [searchInput, setSearchInput] = useState(filters.searchTag);
  const [showTopicDropdown, setShowTopicDropdown] = useState(false);
  const [sessionMode, setSessionMode] = useState(false);
  const [sessionCount, setSessionCount] = useState(20);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>(['Easy', 'Medium', 'Hard']);

  // Convert filters to arrays for multi-select
  const getSelectedSubjects = (): SubjectFilter[] => {
    if (Array.isArray(filters.subject)) return filters.subject;
    if (filters.subject === 'All') return [];
    return [filters.subject];
  };

  const getSelectedDifficulties = (): DifficultyFilter[] => {
    if (Array.isArray(filters.difficulty)) return filters.difficulty;
    if (filters.difficulty === 'All') return [];
    return [filters.difficulty];
  };

  const getSelectedAttemptResults = (): AttemptResultFilter[] => {
    if (Array.isArray(filters.attemptResult)) return filters.attemptResult;
    return [];
  };

  const selectedSubjects = getSelectedSubjects();
  const selectedDifficultiesFilter = getSelectedDifficulties();
  const selectedAttemptResults = getSelectedAttemptResults();

  // Get available subjects based on test type
  const availableSubjects = useMemo(() => {
    if (filters.testType === 'ESAT') {
      return esatSubjects;
    } else if (filters.testType === 'TMUA') {
      return tmuaSubjects;
    } else {
      // If 'All' is selected, show all subjects
      return [...esatSubjects, ...tmuaSubjects];
    }
  }, [filters.testType]);

  // Get available attempt result options based on attemptedStatus
  const getAvailableAttemptResults = (): AttemptResultFilter[] => {
    if (filters.attemptedStatus === 'New') {
      return ['Unseen'];
    } else if (filters.attemptedStatus === 'Attempted') {
      return ['Mixed Results', 'Incorrect Before'];
    } else {
      return ['Mixed Results', 'Unseen', 'Incorrect Before'];
    }
  };

  const availableAttemptResults = getAvailableAttemptResults();

  // Auto-select attempt result when attemptedStatus changes
  useEffect(() => {
    if (filters.attemptedStatus === 'New') {
      // Auto-select "Unseen" when status is "New"
      if (!selectedAttemptResults.includes('Unseen')) {
        onFilterChange({ ...filters, attemptResult: ['Unseen'] });
      }
    } else if (filters.attemptedStatus === 'Attempted') {
      // Auto-select "Mixed Results" when status is "Attempted" and no selection
      if (selectedAttemptResults.length === 0) {
        onFilterChange({ ...filters, attemptResult: ['Mixed Results'] });
      } else {
        // Remove "Unseen" if it's selected (not available for Attempted)
        const filtered = selectedAttemptResults.filter(r => r !== 'Unseen');
        if (filtered.length !== selectedAttemptResults.length) {
          onFilterChange({ ...filters, attemptResult: filtered.length > 0 ? filtered : ['Mixed Results'] });
        }
      }
    } else {
      // For "Mix", remove any invalid selections (shouldn't happen, but just in case)
      const validResults = selectedAttemptResults.filter(r => availableAttemptResults.includes(r));
      if (validResults.length !== selectedAttemptResults.length) {
        onFilterChange({ ...filters, attemptResult: validResults.length > 0 ? validResults : [] });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.attemptedStatus]);

  // Prevent scrolling on body when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Reset search input when filters change externally
  useEffect(() => {
    setSearchInput(filters.searchTag);
  }, [filters.searchTag]);

  if (!isOpen) return null;

  const handleTestTypeChange = (testType: TestTypeFilter) => {
    // Reset subject when test type changes
    onFilterChange({ ...filters, testType, subject: 'All' });
  };

  const toggleSubject = (subject: SubjectFilter) => {
    const current = getSelectedSubjects();
    const newSubjects = current.includes(subject)
      ? current.filter(s => s !== subject)
      : [...current, subject];
    onFilterChange({ ...filters, subject: newSubjects.length > 0 ? newSubjects : 'All' });
  };

  const toggleDifficulty = (difficulty: DifficultyFilter) => {
    const current = getSelectedDifficulties();
    const newDifficulties = current.includes(difficulty)
      ? current.filter(d => d !== difficulty)
      : [...current, difficulty];
    onFilterChange({ ...filters, difficulty: newDifficulties.length > 0 ? newDifficulties : 'All' });
  };

  const handleAttemptedStatusChange = (attemptedStatus: AttemptedFilter) => {
    onFilterChange({ ...filters, attemptedStatus });
  };

  const toggleAttemptResult = (attemptResult: AttemptResultFilter) => {
    const current = getSelectedAttemptResults();
    const newResults = current.includes(attemptResult)
      ? current.filter(r => r !== attemptResult)
      : [...current, attemptResult];
    onFilterChange({ ...filters, attemptResult: newResults.length > 0 ? newResults : [] });
  };

  const selectAllSubjects = () => {
    onFilterChange({ ...filters, subject: availableSubjects as SubjectFilter[] });
  };

  const clearAllSubjects = () => {
    onFilterChange({ ...filters, subject: 'All' });
  };

  const selectAllDifficulties = () => {
    onFilterChange({ ...filters, difficulty: difficulties });
  };

  const clearAllDifficulties = () => {
    onFilterChange({ ...filters, difficulty: 'All' });
  };

  const selectAllAttemptResults = () => {
    onFilterChange({ ...filters, attemptResult: availableAttemptResults });
  };

  const clearAllAttemptResults = () => {
    onFilterChange({ ...filters, attemptResult: [] });
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    onFilterChange({ ...filters, searchTag: value });
  };

  const handleTopicSelect = (topic: string) => {
    setSearchInput(topic);
    onFilterChange({ ...filters, searchTag: topic });
    setShowTopicDropdown(false);
  };

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev => 
      prev.includes(topic) 
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    );
  };

  const toggleSessionDifficulty = (difficulty: string) => {
    setSelectedDifficulties(prev => 
      prev.includes(difficulty) 
        ? prev.filter(d => d !== difficulty)
        : [...prev, difficulty]
    );
  };

  const handleStartSession = () => {
    if (onStartSession) {
      onStartSession({
        count: sessionCount,
        topics: selectedTopics,
        difficulties: selectedDifficulties,
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-neutral-900 rounded-organic-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-white/[0.02] border-b border-white/10">
          <h2 className="text-xl font-semibold uppercase tracking-wider text-white/70">Filter & Settings</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            aria-label="Close filters"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Test Type Filter */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xs font-medium text-white/50 uppercase tracking-wide">
                Test Type
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {testTypes.map((testType) => (
                <button
                  key={testType}
                  onClick={() => handleTestTypeChange(testType)}
                  className={cn(
                    "px-4 py-2.5 rounded-organic-md text-sm font-medium transition-all duration-fast ease-signature",
                    filters.testType === testType
                      ? testTypeColors[testType] + " scale-105"
                      : "bg-white/5 hover:bg-white/10 text-white/60"
                  )}
                >
                  {testType}
                </button>
              ))}
            </div>
          </div>

          {/* Subject Filter */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xs font-medium text-white/50 uppercase tracking-wide">
                Subject
              </label>
              <div className="flex gap-2">
                {selectedSubjects.length > 0 ? (
                  <button
                    onClick={clearAllSubjects}
                    className="px-3 py-1 text-xs font-medium text-white/50 hover:text-white/70 transition-colors"
                  >
                    Clear All
                  </button>
                ) : (
                  <button
                    onClick={() => onFilterChange({ ...filters, subject: availableSubjects as SubjectFilter[] })}
                    className="px-3 py-1 text-xs font-medium text-white/50 hover:text-white/70 transition-colors"
                  >
                    Select All
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableSubjects.map((subject) => (
                <button
                  key={subject}
                  onClick={() => toggleSubject(subject)}
                  className={cn(
                    "px-4 py-2.5 rounded-organic-md text-sm font-medium transition-all duration-fast ease-signature",
                    selectedSubjects.includes(subject)
                      ? subjectColors[subject] + " scale-105"
                      : "bg-white/5 hover:bg-white/10 text-white/60"
                  )}
                >
                  {subject}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty, Attempted Status, Review Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Difficulty Filter */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-xs font-medium text-white/50 uppercase tracking-wide">
                  Difficulty
                </label>
                <div className="flex gap-2">
                  {selectedDifficultiesFilter.length > 0 ? (
                    <button
                      onClick={clearAllDifficulties}
                      className="px-2 py-1 text-xs font-medium text-white/50 hover:text-white/70 transition-colors"
                    >
                      Clear
                    </button>
                  ) : (
                    <button
                      onClick={selectAllDifficulties}
                      className="px-2 py-1 text-xs font-medium text-white/50 hover:text-white/70 transition-colors"
                    >
                      All
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {difficulties.map((difficulty) => {
                  const isSelected = selectedDifficultiesFilter.includes(difficulty);
                  const getDifficultyColor = () => {
                    if (!isSelected) return "bg-white/5 hover:bg-white/10 text-white/60";
                    if (difficulty === 'Easy') return "bg-[#506141]/20 text-[#85BC82]";
                    if (difficulty === 'Medium') return "bg-[#967139]/20 text-[#b8a066]";
                    if (difficulty === 'Hard') return "bg-[#854952]/20 text-[#ef7d7d]";
                    return "bg-white/5 hover:bg-white/10 text-white/60";
                  };
                  return (
                    <button
                      key={difficulty}
                      onClick={() => toggleDifficulty(difficulty)}
                      className={cn(
                        "w-full px-4 py-2.5 rounded-organic-md text-sm font-medium transition-all duration-fast ease-signature text-left",
                        getDifficultyColor()
                      )}
                    >
                      {difficulty}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Attempted Status Filter */}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-3 uppercase tracking-wide">
                User Status
              </label>
              <div className="flex flex-col gap-2">
                {attemptedStatuses.map((status) => (
                  <button
                    key={status}
                    onClick={() => handleAttemptedStatusChange(status)}
                    className={cn(
                      "w-full px-4 py-2.5 rounded-organic-md text-sm font-medium transition-all duration-fast ease-signature text-left",
                      filters.attemptedStatus === status
                        ? "bg-primary/20 text-primary"
                        : "bg-white/5 hover:bg-white/10 text-white/60"
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Attempt Result Filter */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-xs font-medium text-white/50 uppercase tracking-wide">
                  Attempt Result
                </label>
                <div className="flex gap-2">
                  {selectedAttemptResults.length > 0 ? (
                    <button
                      onClick={clearAllAttemptResults}
                      className="px-2 py-1 text-xs font-medium text-white/50 hover:text-white/70 transition-colors"
                    >
                      Clear
                    </button>
                  ) : (
                    availableAttemptResults.length > 1 && (
                      <button
                        onClick={selectAllAttemptResults}
                        className="px-2 py-1 text-xs font-medium text-white/50 hover:text-white/70 transition-colors"
                      >
                        All
                      </button>
                    )
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {availableAttemptResults.map((result) => {
                  const isSelected = selectedAttemptResults.includes(result);
                  const isDisabled = filters.attemptedStatus === 'New' && result === 'Unseen';
                  return (
                    <button
                      key={result}
                      onClick={() => !isDisabled && toggleAttemptResult(result)}
                      disabled={isDisabled}
                      className={cn(
                        "w-full px-4 py-2.5 rounded-organic-md text-sm font-medium transition-all duration-fast ease-signature text-left",
                        isSelected
                          ? "bg-white/20 text-white/70"
                          : "bg-white/5 hover:bg-white/10 text-white/60",
                        isDisabled && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {result}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Topic Selector */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-3 uppercase tracking-wide">
              Topic
            </label>
            <div className="relative">
              <button
                onClick={() => setShowTopicDropdown(!showTopicDropdown)}
                className="w-full px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-organic-md text-sm text-white/90 transition-all duration-fast text-left flex items-center justify-between"
              >
                <span className="truncate">{searchInput || 'Select or search topics...'}</span>
                <ChevronDown className={cn("w-4 h-4 text-white/40 transition-transform", showTopicDropdown && "rotate-180")} />
              </button>
              
              {showTopicDropdown && (
                <div className="absolute z-50 w-full mt-2 bg-neutral-800 rounded-organic-md shadow-xl max-h-60 overflow-y-auto">
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

          {/* Session Mode Section */}
          <div className="pt-6 border-t border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white/90 mb-1">Random Questions Session</h3>
                <p className="text-xs text-white/50">Practice with a set of random questions</p>
              </div>
              <button
                onClick={() => setSessionMode(!sessionMode)}
                className={cn(
                  "relative w-12 h-6 rounded-full transition-all duration-fast ease-signature",
                  sessionMode ? "bg-primary" : "bg-white/10"
                )}
              >
                <div className={cn(
                  "absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-all duration-fast ease-signature",
                  sessionMode ? "translate-x-6" : "translate-x-0"
                )} />
              </button>
            </div>

            {sessionMode && (
              <div className="space-y-4 bg-white/5 rounded-organic-md p-4">
                {/* Number of Questions */}
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-2">
                    Number of Questions
                  </label>
                  <div className="flex gap-2">
                    {[10, 20, 50, 100].map((count) => (
                      <button
                        key={count}
                        onClick={() => setSessionCount(count)}
                        className={cn(
                          "flex-1 px-4 py-2 rounded-organic-md text-sm font-medium transition-all duration-fast ease-signature",
                          sessionCount === count
                            ? "bg-primary/20 text-primary"
                            : "bg-white/5 hover:bg-white/10 text-white/60"
                        )}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Topic Selection (Multi-select) */}
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-2">
                    Topics (Optional - leave empty for all)
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {curriculumTopics.map((topic) => (
                      <button
                        key={topic}
                        onClick={() => toggleTopic(topic)}
                        className={cn(
                          "px-3 py-1.5 rounded-organic-md text-xs font-medium transition-all duration-fast ease-signature",
                          selectedTopics.includes(topic)
                            ? "bg-primary/20 text-primary"
                            : "bg-white/5 hover:bg-white/10 text-white/60"
                        )}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty Selection (Multi-select) */}
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-2">
                    Difficulties
                  </label>
                  <div className="flex gap-2">
                    {['Easy', 'Medium', 'Hard'].map((difficulty) => (
                      <button
                        key={difficulty}
                        onClick={() => toggleSessionDifficulty(difficulty)}
                        className={cn(
                          "flex-1 px-4 py-2 rounded-organic-md text-sm font-medium transition-all duration-fast ease-signature",
                          selectedDifficulties.includes(difficulty)
                            ? "bg-primary/20 text-primary"
                            : "bg-white/5 hover:bg-white/10 text-white/60"
                        )}
                      >
                        {difficulty}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Start Session Button */}
                <button
                  onClick={handleStartSession}
                  className="w-full mt-4 px-6 py-3 bg-primary text-neutral-900 rounded-organic-md font-semibold hover:bg-primary-hover transition-all duration-fast ease-signature flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Start Session
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/[0.02] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white/90 rounded-organic-md font-medium transition-all duration-fast text-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
