/**
 * StageListCard - Individual stage card for roadmap list view
 * Redesigned to match question bank style with inline expansion
 */

"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, ChevronDown, ChevronRight, CheckCircle2, Play, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPaperTypeColor } from "@/config/colors";
import type { RoadmapStage, RoadmapPart } from "@/lib/papers/roadmapConfig";

interface StageListCardProps {
    stage: RoadmapStage;
    index: number;
    completedCount: number;
    totalCount: number;
    isUnlocked: boolean;
    isCurrent?: boolean;
    isCompleted?: boolean;
    isExpanded: boolean;
    onToggleExpand: () => void;
    completionData: Map<string, boolean>; // partKey -> isCompleted
    onStartSession: (stage: RoadmapStage, selectedParts: RoadmapPart[]) => void;
    timelineNodeY?: number; // Y position of corresponding timeline node
}

export function StageListCard({
    stage,
    index,
    completedCount,
    totalCount,
    isUnlocked,
    isCurrent = false,
    isCompleted = false,
    isExpanded,
    onToggleExpand,
    completionData,
    onStartSession,
    timelineNodeY,
}: StageListCardProps) {
    const [selectedParts, setSelectedParts] = useState<Set<string>>(new Set());
    const examColor = getPaperTypeColor(stage.examName);

    // Initialize selected parts to all parts when stage changes
    useMemo(() => {
        if (stage) {
            const allPartKeys = new Set(
                stage.parts.map(
                    (part) => `${part.paperName}-${part.partLetter}-${part.examType}`
                )
            );
            setSelectedParts(allPartKeys);
        }
    }, [stage]);

    const handleCardClick = () => {
        if (!isUnlocked) return;
        onToggleExpand();
    };

    const handlePartToggle = (partKey: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newSelected = new Set(selectedParts);
        if (newSelected.has(partKey)) {
            newSelected.delete(partKey);
        } else {
            newSelected.add(partKey);
        }
        setSelectedParts(newSelected);
    };

    const handleStartSession = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isUnlocked && selectedParts.size > 0) {
            const selectedPartsList = stage.parts.filter((part) => {
                const partKey = `${part.paperName}-${part.partLetter}-${part.examType}`;
                return selectedParts.has(partKey);
            });
            onStartSession(stage, selectedPartsList);
        }
    };

    const handleSelectAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (selectedParts.size === stage.parts.length) {
            setSelectedParts(new Set());
        } else {
            const allPartKeys = new Set(
                stage.parts.map(
                    (part) => `${part.paperName}-${part.partLetter}-${part.examType}`
                )
            );
            setSelectedParts(allPartKeys);
        }
    };

    return (
        <div className="relative">
            {/* Connector line from card to timeline node */}
            {timelineNodeY !== undefined && (
                <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pointer-events-none z-0 hidden lg:block"
                    style={{
                        width: "calc(18% + 2rem)", // Width of left column + gap
                        height: "1px",
                        background: "linear-gradient(to left, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))",
                        boxShadow: "0 0 2px rgba(255, 255, 255, 0.1)",
                    }}
                />
            )}

            {/* Card - borderless glassy design */}
            <motion.div
                className={cn(
                    "relative flex flex-col rounded-organic-lg overflow-hidden overflow-x-hidden transform-gpu backdrop-blur-md",
                    isUnlocked ? "cursor-pointer" : "opacity-60 cursor-not-allowed"
                )}
                style={{ 
                    width: "100%", 
                    maxWidth: "100%", 
                    border: "none", 
                    outline: "none",
                    transform: isCurrent ? "scale(1.02)" : "scale(1)",
                    transformOrigin: "center"
                }}
                animate={{
                    backgroundColor: isUnlocked
                        ? isCurrent
                            ? "rgba(255, 255, 255, 0.08)"
                            : "rgba(255, 255, 255, 0.06)"
                        : "rgba(255, 255, 255, 0.03)",
                    boxShadow: isUnlocked
                        ? "0 4px 12px rgba(0, 0, 0, 0.2)"
                        : "none"
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                onClick={handleCardClick}
            >
                {/* Main Header Content */}
                <div className="flex items-center gap-4 p-5 w-full max-w-full overflow-x-hidden">
                    {/* Left: Numbered rounded square */}
                    <div
                        className={cn(
                            "relative z-10 flex-shrink-0 w-12 h-12 rounded-organic-md flex items-center justify-center font-mono font-bold text-lg transition-colors",
                            isUnlocked ? (isCompleted || isCurrent ? "" : "bg-white/10 text-white/90") : "bg-white/5 text-white/30"
                        )}
                        style={{
                            backgroundColor: isUnlocked
                                ? (isCompleted ? examColor + "25" : isCurrent ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.05)")
                                : examColor + "10",
                            color: isUnlocked ? (isCurrent ? "#ffffff" : examColor) : undefined
                        }}
                    >
                        {isUnlocked ? index + 1 : (
                            <Lock
                                className="w-5 h-5 transition-colors duration-500"
                                style={{ color: examColor, opacity: 0.4 }}
                            />
                        )}
                    </div>

                    {/* Center: Stage info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-3 flex-shrink-0">
                                <span className={cn("font-mono font-semibold text-xl tracking-wide", isUnlocked ? "text-white/90" : "text-white/40")}>
                                    {stage.examName}
                                </span>
                                {stage.id === 'specimen-papers' ? (
                                    <span className={cn("font-mono font-semibold text-xl tracking-wide", isUnlocked ? "text-white/70" : "text-white/30")}>
                                        Specimen
                                    </span>
                                ) : (
                                    <span className={cn("font-mono font-semibold text-xl tracking-wide", isUnlocked ? "text-white/70" : "text-white/30")}>
                                        {stage.year}
                                    </span>
                                )}
                                {(() => {
                                    const hasSpecimen = stage.parts.some(part => part.examType === 'Specimen');
                                    const hasOfficial = stage.parts.some(part => part.examType === 'Official');
                                    const allSpecimen = stage.parts.length > 0 && stage.parts.every(part => part.examType === 'Specimen');
                                    const allOfficial = stage.parts.length > 0 && stage.parts.every(part => part.examType === 'Official');
                                    
                                    // Only show badge if all parts are of the same type (no mixed stages)
                                    if (allSpecimen) {
                                        return (
                                            <span className="px-2.5 py-1 rounded-md text-xs font-medium uppercase tracking-wide bg-white/5 text-white/40 whitespace-nowrap">
                                                Specimen
                                            </span>
                                        );
                                    } else if (allOfficial) {
                                        return (
                                            <span className="px-2.5 py-1 rounded-md text-xs font-medium uppercase tracking-wide bg-white/5 text-white/40 whitespace-nowrap">
                                                Official
                                            </span>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>

                            {totalCount > 0 && (
                                <div className={cn("text-[0.85rem] font-mono whitespace-nowrap flex-shrink-0", isUnlocked ? "text-white/40" : "text-white/30")}>
                                    {completedCount}/{totalCount} parts completed
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Chevron */}
                    <div className="flex-shrink-0 flex items-center">
                        {!isUnlocked ? (
                            <Lock className="w-5 h-5 text-white/20" />
                        ) : (
                            <motion.div
                                animate={{ rotate: isExpanded ? 90 : 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <ChevronRight className="w-5 h-5 text-white/60" />
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* Expanded Content */}
                <AnimatePresence>
                    {isExpanded && isUnlocked && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="overflow-hidden overflow-x-hidden w-full"
                        >
                            <div className="px-5 pb-5 pt-0 w-full max-w-full">
                                <div
                                    className="space-y-2.5 rounded-organic-lg p-3 w-full max-w-full overflow-x-hidden"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-medium text-white/30">Select parts to practice</span>
                                        <button
                                            onClick={handleSelectAll}
                                            className="text-xs text-white/40 hover:text-white/50 transition-colors"
                                        >
                                            {selectedParts.size === stage.parts.length ? "Deselect All" : "Select All"}
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        {stage.parts.map((part) => {
                                            const partKey = `${part.paperName}-${part.partLetter}-${part.examType}`;
                                            const isPartCompleted = completionData.get(partKey) || false;
                                            const isSelected = selectedParts.has(partKey);

                                            return (
                                                <div
                                                    key={partKey}
                                                    className="flex items-center gap-3 p-3 rounded-md text-sm cursor-pointer hover:bg-white/[0.03] transition-colors bg-white/[0.02]"
                                                    style={{ border: "none", outline: "none" }}
                                                    onClick={(e) => handlePartToggle(partKey, e)}
                                                >
                                                     <div
                                                         className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-all"
                                                         style={{ 
                                                             border: "none", 
                                                             outline: "none", 
                                                             backgroundColor: isSelected ? examColor : "rgba(255, 255, 255, 0.05)"
                                                         }}
                                                     >
                                                         {isSelected && (
                                                             <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                                                         )}
                                                     </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-white/70">{part.partLetter}: {part.partName}</div>
                                                        <div className="text-xs text-white/35">{part.paperName}</div>
                                                    </div>
                                                    {isPartCompleted && (
                                                        <div className="flex-shrink-0 flex items-center gap-1.5">
                                                            <CheckCircle2 
                                                                className="w-5 h-5" 
                                                                style={{ color: examColor }} 
                                                                strokeWidth={2.5}
                                                            />
                                                            <span className="text-xs font-medium" style={{ color: examColor + "CC" }}>
                                                                Done
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                     <button
                                         onClick={handleStartSession}
                                         disabled={selectedParts.size === 0}
                                         className={cn(
                                             "w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-lg font-semibold text-sm transition-all shadow-md shadow-black/20",
                                             selectedParts.size === 0
                                                 ? "bg-white/5 text-white/30 cursor-not-allowed"
                                                 : "bg-white/[0.02] text-white/70 hover:bg-white/[0.03] hover:text-white/80"
                                         )}
                                         style={{ border: "none", outline: "none" }}
                                     >
                                         <Play className="w-4 h-4" />
                                         <span>Start Practice Session</span>
                                     </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
