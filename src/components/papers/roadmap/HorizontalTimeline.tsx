/**
 * HorizontalTimeline - Horizontal timeline with nodes and progress visualization
 */

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { getPaperTypeColor } from "@/config/colors";
import type { RoadmapStage } from "@/lib/papers/roadmapConfig";

interface TimelineNode {
  stage: RoadmapStage;
  isCompleted: boolean;
  isUnlocked: boolean;
  isCurrent: boolean;
}

interface HorizontalTimelineProps {
  nodes: TimelineNode[];
  currentIndex: number;
  selectedIndex: number;
  onNodeClick: (index: number) => void;
}

export function HorizontalTimeline({ 
  nodes, 
  currentIndex, 
  selectedIndex,
  onNodeClick 
}: HorizontalTimelineProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className="w-full flex justify-center">
      {/* Scrollable timeline wrapper */}
      <div className="overflow-x-auto w-full scroll-smooth" style={{ scrollbarWidth: 'thin' }}>
        <div className="relative inline-block min-w-full px-8 py-8">
          {/* Timeline container with nodes */}
          <div className="relative flex items-center gap-16">
            {/* Base horizontal timeline line - full width behind nodes */}
            <div className="absolute top-8 left-0 right-0 h-0.5 bg-white/10" />
            
            {nodes.map((node, index) => {
              const examColor = getPaperTypeColor(node.stage.examName);
              const isSelected = selectedIndex === index;
              const isHovered = hoveredIndex === index;
              const isLast = index === nodes.length - 1;
              
              // Determine node styling
              let nodeBorderColor: string;
              let nodeBg: string;
              if (node.isCompleted) {
                nodeBorderColor = "border-primary";
                nodeBg = "bg-primary";
              } else if (isSelected || node.isCurrent) {
                nodeBorderColor = "border-white/40";
                nodeBg = examColor;
              } else if (node.isUnlocked) {
                nodeBorderColor = "border-white/30";
                nodeBg = examColor;
              } else {
                nodeBorderColor = "border-white/20";
                nodeBg = "bg-transparent";
              }

              // Line segment color - from this node to next
              const lineColor = node.isCompleted 
                ? "bg-primary" 
                : node.isUnlocked 
                  ? examColor
                  : "bg-white/10";

              return (
                <div key={node.stage.id} className="relative flex items-center">
                  {/* Line segment to next node - spans from center to center */}
                  {!isLast && (
                    <div 
                      className={cn(
                        "absolute top-8 left-1/2 h-0.5 transition-colors z-[1]",
                        lineColor
                      )}
                      style={{ 
                        width: '6rem', // node width (2rem) + gap (4rem) = 6rem from center to center
                        transform: 'translateY(-50%)',
                      }}
                    />
                  )}
                  
                  <button
                    onClick={() => onNodeClick(index)}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className={cn(
                      "relative z-10 flex flex-col items-center transition-all cursor-pointer",
                      !node.isUnlocked && "cursor-not-allowed opacity-50"
                    )}
                    disabled={!node.isUnlocked}
                  >
                    {/* Timeline node dot */}
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition-all duration-200 relative z-20",
                        nodeBorderColor,
                        isSelected && "ring-2 ring-primary shadow-lg shadow-primary/50",
                        isHovered && node.isUnlocked && "scale-150",
                        !isHovered && !isSelected && "scale-100"
                      )}
                      style={{
                        backgroundColor: node.isCompleted ? undefined : nodeBg,
                      }}
                    >
                      {(isSelected || node.isCurrent) && !node.isCompleted && (
                        <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" />
                      )}
                    </div>
                    
                    {/* Label below node - "2016 NSAA" format */}
                    <div 
                      className={cn(
                        "mt-3 text-sm font-medium transition-colors whitespace-nowrap",
                        isSelected ? "text-primary" : node.isUnlocked ? "text-white/80" : "text-white/40"
                      )}
                      style={!isSelected && node.isUnlocked ? { color: examColor } : undefined}
                    >
                      {node.stage.year} {node.stage.examName}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

