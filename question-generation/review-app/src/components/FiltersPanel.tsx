"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReviewStats, PaperType, ESATSubject, TMUASubject, ReviewFilters } from "@/types/review";

interface FiltersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: ReviewFilters;
  onFiltersChange: (filters: ReviewFilters) => void;
}

export function FiltersPanel({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
}: FiltersPanelProps) {
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen, filters]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.paperType) params.append('paperType', filters.paperType);
      if (filters.subjects && filters.subjects.length > 0) {
        params.append('subjects', filters.subjects.join(','));
      }

      const response = await fetch(`/api/review/stats?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('[Filters] Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const esatSubjects: ESATSubject[] = ['Math 1', 'Math 2', 'Physics', 'Chemistry', 'Biology'];
  const tmuaSubjects: TMUASubject[] = ['Paper 1', 'Paper 2'];
  const allSubjects: (ESATSubject | TMUASubject)[] = [...esatSubjects, ...tmuaSubjects];

  // Get available subjects based on paper type
  const getAvailableSubjects = (): (ESATSubject | TMUASubject)[] => {
    if (!filters.paperType || filters.paperType === 'All') {
      return allSubjects;
    } else if (filters.paperType === 'ESAT') {
      return esatSubjects;
    } else {
      return tmuaSubjects;
    }
  };

  const availableSubjects = getAvailableSubjects();
  const selectedSubjects = filters.subjects || [];

  const toggleSubject = (subject: ESATSubject | TMUASubject) => {
    const currentSubjects = selectedSubjects;
    if (currentSubjects.includes(subject)) {
      // Remove subject
      onFiltersChange({
        ...filters,
        subjects: currentSubjects.filter(s => s !== subject),
      });
    } else {
      // Add subject
      onFiltersChange({
        ...filters,
        subjects: [...currentSubjects, subject],
      });
    }
  };

  const progressPercentage = stats && stats.total > 0
    ? (stats.approved / stats.total) * 100
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-background border border-white/10 rounded-organic-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white/90">Filters</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {/* Filters */}
        <div className="space-y-4 mb-6">
          {/* Paper Type */}
          <div>
            <label className="text-sm font-mono text-white/70 mb-2 block">
              Paper Type
            </label>
            <div className="flex gap-2">
              {(['All', 'TMUA', 'ESAT'] as PaperType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    onFiltersChange({
                      ...filters,
                      // Always keep a paperType selected; clicking just selects this type
                      paperType: type,
                      subjects: [], // Reset subjects when changing paper type
                    });
                  }}
                  className={cn(
                    "px-4 py-2 rounded-organic-md text-sm font-mono transition-all",
                    filters.paperType === type
                      ? "bg-primary/30 text-primary border border-primary/50"
                      : "bg-white/5 text-white/60 hover:bg-white/10 border border-white/10"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Subject - Multi-select */}
          <div>
            <label className="text-sm font-mono text-white/70 mb-2 block">
              Subject {selectedSubjects.length > 0 && `(${selectedSubjects.length} selected)`}
            </label>
            <div className="flex flex-wrap gap-2">
              {availableSubjects.map((subject) => {
                const isSelected = selectedSubjects.includes(subject);
                return (
                  <button
                    key={subject}
                    onClick={() => toggleSubject(subject)}
                    className={cn(
                      "px-4 py-2 rounded-organic-md text-sm font-mono transition-all",
                      isSelected
                        ? "bg-primary/30 text-primary border border-primary/50"
                        : "bg-white/5 text-white/60 hover:bg-white/10 border border-white/10"
                    )}
                  >
                    {subject}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="text-center py-8 text-white/60">Loading statistics...</div>
        ) : stats ? (
          <div className="space-y-4">
            {/* Progress Bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-mono text-white/70">Progress</span>
                <span className="text-sm font-mono text-white/90">
                  {stats.approved} of {stats.total} processed
                </span>
              </div>
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary/40 transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-organic-md bg-white/5 border border-white/10">
                <div className="text-xs font-mono text-white/60 mb-1">Total</div>
                <div className="text-2xl font-bold text-white/90">{stats.total}</div>
              </div>
              <div className="p-4 rounded-organic-md bg-white/5 border border-white/10">
                <div className="text-xs font-mono text-white/60 mb-1">Approved</div>
                <div className="text-2xl font-bold text-[#85BC82]">{stats.approved}</div>
              </div>
              <div className="p-4 rounded-organic-md bg-white/5 border border-white/10">
                <div className="text-xs font-mono text-white/60 mb-1">Pending</div>
                <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-white/60">No statistics available</div>
        )}
      </div>
    </div>
  );
}



