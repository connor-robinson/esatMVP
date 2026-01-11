/**
 * QuestionLibraryFilters - Compact filter/search panel for Question Library
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { SubjectFilter, DifficultyFilter, AttemptedFilter, AttemptResultFilter } from "@/types/questionBank";

interface QuestionLibraryFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  subjectFilter: SubjectFilter | SubjectFilter[] | "ALL";
  onSubjectFilterChange: (value: SubjectFilter | SubjectFilter[] | "ALL") => void;
  difficultyFilter: DifficultyFilter | DifficultyFilter[] | "ALL";
  onDifficultyFilterChange: (value: DifficultyFilter | DifficultyFilter[] | "ALL") => void;
  attemptedStatusFilter: AttemptedFilter;
  onAttemptedStatusFilterChange: (value: AttemptedFilter) => void;
  attemptResultFilter: AttemptResultFilter | AttemptResultFilter[] | "ALL";
  onAttemptResultFilterChange: (value: AttemptResultFilter | AttemptResultFilter[] | "ALL") => void;
}

const subjects: SubjectFilter[] = ['Math 1', 'Math 2', 'Physics', 'Chemistry', 'Biology'];
const difficulties: DifficultyFilter[] = ['Easy', 'Medium', 'Hard'];
const attemptedStatuses: AttemptedFilter[] = ['Mix', 'New', 'Attempted'];
const attemptResults: AttemptResultFilter[] = ['Mixed Results', 'Unseen', 'Incorrect Before'];

export function QuestionLibraryFilters({
  searchQuery,
  onSearchChange,
  subjectFilter,
  onSubjectFilterChange,
  difficultyFilter,
  onDifficultyFilterChange,
  attemptedStatusFilter,
  onAttemptedStatusFilterChange,
  attemptResultFilter,
  onAttemptResultFilterChange,
}: QuestionLibraryFiltersProps) {
  // Custom Dropdown Component
  const CustomDropdown = ({
    value,
    onChange,
    options,
    placeholder,
    minWidth,
  }: {
    value: string | string[] | "ALL";
    onChange: (value: string | string[] | "ALL") => void;
    options: Array<{ value: string | "ALL"; label: string }>;
    placeholder: string;
    minWidth?: string;
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getSelectedLabel = () => {
      if (value === "ALL") return placeholder;
      if (Array.isArray(value)) {
        if (value.length === 0) return placeholder;
        if (value.length === 1) return options.find(opt => opt.value === value[0])?.label || placeholder;
        return `${value.length} selected`;
      }
      return options.find(opt => opt.value === value)?.label || placeholder;
    };

    return (
      <div className={cn("relative", minWidth)} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-10 pl-4 pr-10 rounded-lg bg-white/5 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all backdrop-blur-sm cursor-pointer flex items-center justify-between"
        >
          <span className="truncate text-left">{getSelectedLabel()}</span>
          <ChevronDown
            className={cn(
              "absolute right-3 w-4 h-4 text-white/50 pointer-events-none transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full mt-2 w-full bg-white/5 backdrop-blur-xl rounded-lg shadow-2xl z-50 overflow-hidden"
              >
                <div className="max-h-60 overflow-y-auto">
                  {options.map((option) => {
                    const isSelected = value === "ALL" 
                      ? option.value === "ALL"
                      : Array.isArray(value)
                        ? value.includes(option.value as string)
                        : value === option.value;
                    
                    return (
                      <button
                        key={String(option.value)}
                        type="button"
                        onClick={() => {
                          if (option.value === "ALL") {
                            onChange("ALL");
                          } else if (Array.isArray(value)) {
                            const newValue = isSelected
                              ? value.filter(v => v !== option.value)
                              : [...value, option.value as string];
                            onChange(newValue.length > 0 ? newValue : "ALL");
                          } else {
                            onChange(option.value);
                          }
                          setIsOpen(false);
                        }}
                        className={cn(
                          "w-full px-4 py-2.5 text-left text-sm transition-all flex items-center gap-2",
                          isSelected
                            ? "bg-white/10 text-white"
                            : "text-white/70 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        {isSelected && <span className="text-primary">✓</span>}
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const getSubjectOptions = () => {
    return [
      { value: "ALL" as const, label: "All subjects" },
      ...subjects.map((subject) => ({ value: subject, label: subject })),
    ];
  };

  const getDifficultyOptions = () => {
    return [
      { value: "ALL" as const, label: "All difficulties" },
      ...difficulties.map((difficulty) => ({ value: difficulty, label: difficulty })),
    ];
  };

  const getAttemptResultOptions = () => {
    // Filter based on attemptedStatus
    let available: AttemptResultFilter[] = [];
    if (attemptedStatusFilter === 'New') {
      available = ['Unseen'];
    } else if (attemptedStatusFilter === 'Attempted') {
      available = ['Mixed Results', 'Incorrect Before'];
    } else {
      available = ['Mixed Results', 'Unseen', 'Incorrect Before'];
    }
    
    return [
      { value: "ALL" as const, label: "All results" },
      ...available.map((result) => ({ value: result, label: result })),
    ];
  };

  return (
    <Card variant="flat" className="p-3">
      <div className="mb-4">
        <h2 className="text-xl font-mono font-semibold uppercase tracking-wider text-white/90 mb-1">
          Filters
        </h2>
        <p className="text-xs font-mono text-white/50">
          Search and filter questions by ID, subject, difficulty, and attempt status.
        </p>
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by ID (C_xxxxx) or question content..."
            className="w-full h-10 px-4 rounded-lg bg-white/5 outline-none border-0 placeholder:text-white/40 text-white/90 text-sm transition-all backdrop-blur-sm"
            onFocus={(e) => {
              e.currentTarget.style.boxShadow = '0 0 0 2px rgba(64, 97, 102, 0.3)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = '';
            }}
          />
        </div>

        {/* Subject filter */}
        <CustomDropdown
          value={subjectFilter === "ALL" ? "ALL" : Array.isArray(subjectFilter) ? subjectFilter : [subjectFilter]}
          onChange={(value) => {
            if (value === "ALL") {
              onSubjectFilterChange("ALL");
            } else if (Array.isArray(value)) {
              onSubjectFilterChange(value as SubjectFilter[]);
            } else {
              onSubjectFilterChange(value as SubjectFilter);
            }
          }}
          options={getSubjectOptions()}
          placeholder="All subjects"
          minWidth="min-w-[140px]"
        />

        {/* Difficulty filter */}
        <CustomDropdown
          value={difficultyFilter === "ALL" ? "ALL" : Array.isArray(difficultyFilter) ? difficultyFilter : [difficultyFilter]}
          onChange={(value) => {
            if (value === "ALL") {
              onDifficultyFilterChange("ALL");
            } else if (Array.isArray(value)) {
              onDifficultyFilterChange(value as DifficultyFilter[]);
            } else {
              onDifficultyFilterChange(value as DifficultyFilter);
            }
          }}
          options={getDifficultyOptions()}
          placeholder="All difficulties"
          minWidth="min-w-[140px]"
        />

        {/* Attempted Status filter */}
        <CustomDropdown
          value={attemptedStatusFilter}
          onChange={(value) => {
            onAttemptedStatusFilterChange(value as AttemptedFilter);
            // Reset attempt result when status changes
            if (value === "ALL") {
              onAttemptResultFilterChange("ALL");
            } else if (value === 'New') {
              onAttemptResultFilterChange(['Unseen']);
            } else if (value === 'Attempted') {
              onAttemptResultFilterChange(['Mixed Results']);
            }
          }}
          options={attemptedStatuses.map((status) => ({ value: status, label: status }))}
          placeholder="Mix"
          minWidth="min-w-[140px]"
        />

        {/* Attempt Result filter */}
        <CustomDropdown
          value={attemptResultFilter === "ALL" ? "ALL" : Array.isArray(attemptResultFilter) ? attemptResultFilter : [attemptResultFilter]}
          onChange={(value) => {
            if (value === "ALL") {
              onAttemptResultFilterChange("ALL");
            } else if (Array.isArray(value)) {
              onAttemptResultFilterChange(value as AttemptResultFilter[]);
            } else {
              onAttemptResultFilterChange(value as AttemptResultFilter);
            }
          }}
          options={getAttemptResultOptions()}
          placeholder="All results"
          minWidth="min-w-[160px]"
        />
      </div>
    </Card>
  );
}

