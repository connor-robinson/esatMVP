/**
 * SectionSelector component for the papers wizard
 */

import { cn } from "@/lib/utils";
import type { PaperSection } from "@/types/papers";
import { getSectionColor, PAPER_COLORS } from "@/config/colors";

interface SectionSelectorProps {
  sections: PaperSection[];
  selectedSections: PaperSection[];
  onSectionToggle: (section: PaperSection) => void;
  completedSections?: PaperSection[];
  multiSelect?: boolean;
  maxSelections?: number;
  warningMessage?: string;
  showPartInfo?: boolean; // New prop to show part_letter/part_name info
  partInfo?: Record<PaperSection, { partLetter: string; partName: string }>; // Part info mapping
}

export function SectionSelector({ 
  sections, 
  selectedSections, 
  onSectionToggle, 
  completedSections = [],
  multiSelect = true,
  maxSelections,
  warningMessage,
  showPartInfo = false,
  partInfo = {} as Record<PaperSection, { partLetter: string; partName: string }>
}: SectionSelectorProps) {
  const showWarning = maxSelections && selectedSections.length > maxSelections;
  try {
    console.debug('[SectionSelector] props', {
      sections,
      selectedSections,
      completedSections,
      multiSelect,
      maxSelections,
      warningMessage,
      showPartInfo,
      partInfoKeys: Object.keys(partInfo || {})
    });
  } catch {}
  
  return (
    <div className="space-y-4">
      {/* Warning Message */}
      {showWarning && warningMessage && (
        <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: PAPER_COLORS.advanced }}>
          <svg className="w-5 h-5 flex-shrink-0" style={{ color: "#ffffff" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="text-sm" style={{ color: "#ffffff" }}>{warningMessage}</span>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {sections.map((section, index) => {
        const isSelected = selectedSections.includes(section);
        const isCompleted = completedSections.includes(section);
        const info = partInfo?.[section];
        const displayTitle = info?.partLetter || section;
        const displaySubtitle = info?.partName;
        
        const hex = getSectionColor(section);
        const styles = {
          bgColor: hex,
          borderColor: hex,
          iconColor: hex,
          textColor: "white"
        };
        
        return (
          <button
            key={section}
            onClick={() => onSectionToggle(section)}
            className={cn(
              "p-4 rounded-organic-md transition-all duration-fast ease-signature text-center w-full outline-none focus:outline-none",
              "interaction-scale"
            )}
            style={isSelected ? {
              backgroundColor: styles.bgColor
            } : isCompleted ? {
              backgroundColor: "#506141"
            } : { backgroundColor: "rgba(255,255,255,0.05)" }}
          >
            <div className="space-y-2">
              {/* Section Icon (top center) */}
              <div className="flex items-center justify-center">
                <div 
                  className="w-8 h-8 rounded-organic-md flex items-center justify-center"
                  style={{ backgroundColor: styles.iconColor }}
                >
                  <svg 
                    className="w-4 h-4" 
                    style={{ color: styles.textColor }}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              
              {/* Large text: Part Letter / Section Title */}
              {showPartInfo && (
                <div className="font-bold text-neutral-100 text-lg">{displayTitle}</div>
              )}
              
              {/* Small text: Part Name (description) */}
              {showPartInfo && displaySubtitle && (
                <div className={cn("text-sm", isSelected ? "text-white" : "text-neutral-400")}>{displaySubtitle}</div>
              )}
              
              {isCompleted && (
                <div className="text-xs font-medium" style={{ color: "#ffffff", backgroundColor: "#506141" }}>
                  Completed
                </div>
              )}
            </div>
          </button>
        );
      })}
      </div>
    </div>
  );
}