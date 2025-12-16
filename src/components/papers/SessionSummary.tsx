/**
 * SessionSummary component for the papers wizard
 */

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { Edit3, Clock, FileText, Target, Calendar, Check } from "lucide-react";
import type { PaperSection } from "@/types/papers";
import { prefetchImages } from "@/lib/papers/prefetch";
import { getSectionColor } from "@/config/colors";

interface SessionSummaryProps {
  sessionData: {
    paperType: string;
    year: string;
    variant?: string;
    sections: PaperSection[];
    totalQuestions: number;
    timeLimit: number;
    sessionName: string;
  };
  onSessionNameChange: (name: string) => void;
  onTimeLimitChange: (time: number) => void;
  onSectionReorder?: (sections: PaperSection[]) => void;
  onStartSession: () => void | Promise<void>;
  canStart: boolean;
  partInfo?: Record<PaperSection, { partLetter: string; partName: string }>; // Part info mapping
  prefetchUrls?: string[];
}

export function SessionSummary({ 
  sessionData, 
  onSessionNameChange, 
  onTimeLimitChange, 
  onSectionReorder, 
  onStartSession, 
  canStart,
  partInfo = {} as Record<PaperSection, { partLetter: string; partName: string }>,
  prefetchUrls = []
}: SessionSummaryProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [customTimeLimit, setCustomTimeLimit] = useState(sessionData.timeLimit);
  const [sectionOrder, setSectionOrder] = useState<PaperSection[]>([]);
  const [isPreparing, setIsPreparing] = useState(false);

  // Initialize section order when sections change - sort alphabetically by part letter
  // Only initialize if sectionOrder is empty (first time or sections completely changed)
  useEffect(() => {
    if (sessionData.sections.length > 0) {
      // Only set initial order if sectionOrder is empty or if the sections have actually changed
      setSectionOrder(prevOrder => {
        // Check if sections have fundamentally changed (different set of sections)
        const sectionsChanged = prevOrder.length === 0 || 
          prevOrder.length !== sessionData.sections.length ||
          !sessionData.sections.every(s => prevOrder.includes(s));
        
        if (sectionsChanged) {
          // Sort sections alphabetically by part letter
          const sortedSections = [...sessionData.sections].sort((a, b) => {
            const partLetterA = partInfo[a]?.partLetter || '';
            const partLetterB = partInfo[b]?.partLetter || '';
            return partLetterA.localeCompare(partLetterB);
          });
          // Also reflect this initial order back to the parent so any derived strings (like session name)
          // exactly match what's displayed here.
          onSectionReorder?.(sortedSections);
          return sortedSections;
        }
        
        // Keep existing order if sections haven't fundamentally changed
        return prevOrder;
      });
    }
  }, [sessionData.sections, partInfo]);

  const handleTimeLimitChange = (value: number) => {
    setCustomTimeLimit(value);
    onTimeLimitChange(value);
  };

  const handlePrepareAndStart = async () => {
    if (!canStart || isPreparing) return;
    setIsPreparing(true);
    try {
      if (prefetchUrls.length > 0) {
        await prefetchImages(prefetchUrls, { cacheName: 'paper-assets-v1', warmDecodeCount: 8 });
      }
      await Promise.resolve(onStartSession());
    } finally {
      setIsPreparing(false);
    }
  };

  // Calculate if time is custom (different from calculated 1.5 minutes per question)
  const calculatedTime = Math.ceil(sessionData.totalQuestions * 1.5);
  const isCustomTime = customTimeLimit !== calculatedTime;

  // Section reordering functions
  const moveSection = (fromIndex: number, toIndex: number) => {
    const currentSections = sectionOrder.length > 0 ? sectionOrder : sessionData.sections;
    const newOrder = [...currentSections];
    const [movedSection] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, movedSection);
    setSectionOrder(newOrder);
    onSectionReorder?.(newOrder);
  };

  const moveSectionLeft = (index: number) => {
    if (index > 0) {
      moveSection(index, index - 1);
    }
  };

  const moveSectionRight = (index: number) => {
    const currentSections = sectionOrder.length > 0 ? sectionOrder : sessionData.sections;
    if (index < currentSections.length - 1) {
      moveSection(index, index + 1);
    }
  };


  const resetSectionOrder = () => {
    // Reset to alphabetical order by part letter
    const sortedSections = [...sessionData.sections].sort((a, b) => {
      const partLetterA = partInfo[a]?.partLetter || '';
      const partLetterB = partInfo[b]?.partLetter || '';
      return partLetterA.localeCompare(partLetterB);
    });
    setSectionOrder(sortedSections);
    onSectionReorder?.(sortedSections);
  };

  // Map section to hex color via central config
  const getSectionHex = (sectionName: string) => getSectionColor(sectionName);

  return (
    <Card className="p-6 bg-primary/5 border-0">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "#506141" }}>
            <Target className="w-4 h-4" style={{ color: "#ffffff" }} />
          </div>
          <h3 className="text-lg font-semibold text-neutral-100">Session Summary</h3>
        </div>

        {/* Session Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Session Name */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <FileText className="w-4 h-4" />
              Session Name
            </div>
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <Input
                  value={sessionData.sessionName}
                  onChange={(e) => onSessionNameChange(e.target.value)}
                  onBlur={() => setIsEditingName(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                  className="flex-1 border-0 ring-0 outline-none focus:outline-none focus:ring-0"
                  autoFocus
                />
              ) : (
                <>
                  <span className="font-medium text-neutral-100">{sessionData.sessionName}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingName(true)}
                    className="p-1"
                  >
                    <Edit3 className="w-3 h-3 text-neutral-400" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Time Limit */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <Clock className="w-4 h-4" />
              Time Limit
            </div>
            <div className="flex items-center gap-2">
              {isEditingTime ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={customTimeLimit}
                    onChange={(e) => handleTimeLimitChange(Number(e.target.value))}
                    className="w-20 border-0 ring-0 outline-none focus:outline-none focus:ring-0"
                    autoFocus
                  />
                  <span className="text-sm text-neutral-400">minutes</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingTime(false)}
                    className="p-1 border-0 ring-0 outline-none focus:outline-none focus:ring-0"
                  >
                    <Check className="w-4 h-4" strokeWidth={3} />
                  </Button>
                </div>
              ) : (
                <>
                  <span className="font-medium text-neutral-100">
                    {sessionData.timeLimit} minutes
                  {isCustomTime && (
                      <span className="ml-2 px-2 py-1 text-white text-xs rounded-full" style={{ backgroundColor: "#506141" }}>
                        Custom
                      </span>
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingTime(true)}
                    className="p-1 border-0 ring-0 outline-none focus:outline-none focus:ring-0"
                  >
                    <Edit3 className="w-3 h-3 text-neutral-400" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Paper Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-neutral-400 mb-1">Paper Type</div>
            <div className="font-medium text-neutral-100">{sessionData.paperType}</div>
          </div>
          <div>
            <div className="text-neutral-400 mb-1">Year</div>
            <div className="font-medium text-neutral-100">{sessionData.year}</div>
          </div>
          {sessionData.variant && (
            <div>
              <div className="text-neutral-400 mb-1">Variant</div>
              <div className="font-medium text-neutral-100">{sessionData.variant}</div>
            </div>
          )}
          <div>
            <div className="text-neutral-400 mb-1">Questions</div>
            <div className="font-medium text-neutral-100">{sessionData.totalQuestions}Q</div>
          </div>
        </div>

        {/* Order of Sections */}
        {(sessionData.sections.length > 0 || sectionOrder.length > 0) && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-neutral-400">Order of Sections</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetSectionOrder}
                className="text-xs text-neutral-400"
              >
                Reset Order
              </Button>
            </div>
            
            <div className="space-y-2">
              {(sectionOrder.length > 0 ? sectionOrder : sessionData.sections).map((section, index) => {
                const hex = getSectionHex(section);
                return (
                  <div
                    key={section}
                    className={cn("flex items-center gap-3 p-3 rounded-lg transition-colors bg-white/5")}
                  >
                    {/* Order Number */}
                    <div className={cn("flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white")}
                         style={{ backgroundColor: hex }}>
                      {index + 1}
                    </div>
                    
                    {/* Section Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-neutral-100 text-sm">
                        {partInfo[section] ? partInfo[section].partLetter : section}
                      </div>
                      <div className="text-xs text-neutral-200 mt-1">
                        {partInfo[section] ? partInfo[section].partName : `Section ${index + 1}`}
                      </div>
                    </div>
                    
                    {/* Reorder Controls */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveSectionLeft(index)}
                        disabled={index === 0}
                        className="p-1 hover:bg-slate-500 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors outline-none focus:outline-none"
                        title="Move up"
                      >
                        <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => moveSectionRight(index)}
                        disabled={index === (sectionOrder.length > 0 ? sectionOrder : sessionData.sections).length - 1}
                        className="p-1 hover:bg-slate-500 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors outline-none focus:outline-none"
                        title="Move down"
                      >
                        <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}


        {/* Start Button */}
        <div className="pt-4">
          <Button
            variant="secondary"
            size="lg"
            onClick={handlePrepareAndStart}
            disabled={!canStart || isPreparing}
            className="w-full py-4 text-lg border-0 ring-0 outline-none focus:outline-none focus:ring-0"
            style={isPreparing ? { backgroundColor: "#506141", borderColor: "#506141", color: "#ffffff" } : undefined}
          >
            {(!canStart) ? "Complete Setup Above" : (
              isPreparing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-white/40 opacity-60 animate-ping" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                  </span>
                  <span className="tracking-wide">Preparing session…</span>
                </span>
              ) : "Start Session"
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
