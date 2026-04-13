"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveReviewQuestionInput } from "@/lib/reviewLookup";
import type {
  ReviewStats,
  PaperType,
  ESATSubject,
  TMUASubject,
  ReviewFilters,
  QualityGateVerdict,
} from "@/types/review";

interface FiltersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: ReviewFilters;
  onFiltersChange: (filters: ReviewFilters) => void;
  onNavigateToReview: (questionId: string) => void;
}

export function FiltersPanel({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  onNavigateToReview,
}: FiltersPanelProps) {
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [jumpInput, setJumpInput] = useState("");
  const [jumpBusy, setJumpBusy] = useState(false);
  const [jumpError, setJumpError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen, filters]);

  useEffect(() => {
    if (!isOpen) {
      setJumpInput("");
      setJumpError(null);
      setJumpBusy(false);
    }
  }, [isOpen]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.paperType) params.append('paperType', filters.paperType);
      if (filters.subjects && filters.subjects.length > 0) {
        params.append('subjects', filters.subjects.join(','));
      }
      if (filters.schemaReclassOnly) {
        params.append('schemaReclass', '1');
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

  const verdictOptions: QualityGateVerdict[] = ["Pass", "Minor", "Major"];
  const selectedVerdicts = filters.qualityGateVerdicts || [];

  const toggleVerdict = (v: QualityGateVerdict) => {
    const cur = filters.qualityGateVerdicts || [];
    const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
    onFiltersChange({ ...filters, qualityGateVerdicts: next });
  };

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

  const submitJump = async () => {
    if (jumpBusy) return;
    setJumpError(null);
    setJumpBusy(true);
    try {
      const res = await resolveReviewQuestionInput(jumpInput);
      if (res.kind === "error") {
        setJumpError(res.message);
        return;
      }
      onNavigateToReview(res.id);
    } finally {
      setJumpBusy(false);
    }
  };

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

        <div className="mb-6 space-y-3">
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className="w-full flex items-center gap-2 rounded-organic-md border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left hover:bg-white/[0.07] transition-colors"
            aria-expanded={filtersOpen}
          >
            {filtersOpen ? (
              <ChevronDown className="w-4 h-4 text-white/50 shrink-0" strokeWidth={2.5} aria-hidden />
            ) : (
              <ChevronRight className="w-4 h-4 text-white/50 shrink-0" strokeWidth={2.5} aria-hidden />
            )}
            <span className="text-sm font-mono text-white/75">
              Queue filters
              {!filtersOpen && <span className="text-white/40"> · collapsed</span>}
            </span>
          </button>

          {filtersOpen ? (
        <div className="space-y-4 border border-white/10 rounded-organic-md p-4 bg-white/[0.02]">
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

          <div>
            <label className="text-sm font-mono text-white/70 mb-2 block">
              Quality gate (LLM)
            </label>
            <p className="text-xs font-mono text-white/40 mb-2 leading-snug">
              Requires DB migration{" "}
              <code className="text-white/55">add_quality_gate.sql</code>. Filter workspace queue by
              verdict or unassessed rows.
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {verdictOptions.map((v) => {
                const isSelected = selectedVerdicts.includes(v);
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => toggleVerdict(v)}
                    className={cn(
                      "px-4 py-2 rounded-organic-md text-sm font-mono transition-all",
                      isSelected
                        ? "bg-cyan-500/25 text-cyan-100 border border-cyan-400/45"
                        : "bg-white/5 text-white/60 hover:bg-white/10 border border-white/10"
                    )}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() =>
                onFiltersChange({
                  ...filters,
                  qualityGateUnassessedOnly: !filters.qualityGateUnassessedOnly,
                })
              }
              className={cn(
                "px-4 py-2 rounded-organic-md text-sm font-mono transition-all border mb-3",
                filters.qualityGateUnassessedOnly
                  ? "bg-cyan-500/25 text-cyan-100 border-cyan-400/45"
                  : "bg-white/5 text-white/60 hover:bg-white/10 border border-white/10"
              )}
            >
              Only not yet quality-assessed
            </button>
            <label className="text-xs font-mono text-white/50 mb-1 block">Quality gate job id</label>
            <input
              type="text"
              value={filters.qualityGateJobId || ""}
              onChange={(e) =>
                onFiltersChange({ ...filters, qualityGateJobId: e.target.value })
              }
              placeholder="e.g. 20260101-120000-abc12def"
              className="w-full px-3 py-2 rounded-organic-md bg-white/5 border border-white/10 text-sm font-mono text-white/90 placeholder:text-white/30"
            />
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                onClick={() =>
                  onFiltersChange({
                    ...filters,
                    qualityGateCalibrationGoldOnly: !filters.qualityGateCalibrationGoldOnly,
                  })
                }
                className={cn(
                  "px-4 py-2 rounded-organic-md text-sm font-mono transition-all border",
                  filters.qualityGateCalibrationGoldOnly
                    ? "bg-amber-500/25 text-amber-100 border-amber-400/45"
                    : "bg-white/5 text-white/60 hover:bg-white/10 border border-white/10"
                )}
              >
                Calibration gold only
              </button>
              <button
                type="button"
                onClick={() =>
                  onFiltersChange({
                    ...filters,
                    qualityGateGraphCandidateOnly: !filters.qualityGateGraphCandidateOnly,
                  })
                }
                className={cn(
                  "px-4 py-2 rounded-organic-md text-sm font-mono transition-all border",
                  filters.qualityGateGraphCandidateOnly
                    ? "bg-sky-500/25 text-sky-100 border-sky-400/45"
                    : "bg-white/5 text-white/60 hover:bg-white/10 border border-white/10"
                )}
              >
                Graph / diagram candidate only
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-mono text-white/70 mb-2 block">
              Schema reclassification
            </label>
            <button
              type="button"
              onClick={() =>
                onFiltersChange({
                  ...filters,
                  schemaReclassOnly: !filters.schemaReclassOnly,
                })
              }
              className={cn(
                "px-4 py-2 rounded-organic-md text-sm font-mono transition-all border",
                filters.schemaReclassOnly
                  ? "bg-violet-500/25 text-violet-100 border-violet-400/45"
                  : "bg-white/5 text-white/60 hover:bg-white/10 border border-white/10"
              )}
            >
              Only questions with schema changes
            </button>
            <p className="mt-2 text-xs font-mono text-white/40 leading-snug">
              Rows flagged when Schemas_ESAT.md moved a schema to a new subject id (original
              schema_id kept).
            </p>
          </div>
        </div>
          ) : null}
        </div>

        <div className="mb-6 space-y-2">
          <label className="text-sm font-mono text-white/70 block" htmlFor="filters-panel-jump">
            Open question by id or code
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 min-w-0">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35 pointer-events-none"
                strokeWidth={2.2}
                aria-hidden
              />
              <input
                id="filters-panel-jump"
                type="search"
                value={jumpInput}
                onChange={(e) => {
                  setJumpInput(e.target.value);
                  if (jumpError) setJumpError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submitJump();
                }}
                placeholder="UUID or walkthrough code (e.g. AB12)"
                autoComplete="off"
                className="w-full pl-10 pr-3 py-2 rounded-organic-md bg-white/5 border border-white/10 text-sm font-mono text-white/90 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/35"
              />
            </div>
            <button
              type="button"
              onClick={() => void submitJump()}
              disabled={jumpBusy || !jumpInput.trim()}
              className={cn(
                "px-4 py-2 rounded-organic-md text-sm font-mono border shrink-0",
                jumpBusy || !jumpInput.trim()
                  ? "border-white/10 bg-white/5 text-white/35 cursor-not-allowed"
                  : "border-primary/45 bg-primary/20 text-primary-light hover:bg-primary/30"
              )}
            >
              {jumpBusy ? "…" : "Open"}
            </button>
          </div>
          {jumpError ? (
            <p className="text-xs font-mono text-[#ef7d7d]/90">{jumpError}</p>
          ) : null}
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



