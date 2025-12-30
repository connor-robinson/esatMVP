/**
 * RoadmapList - Vertical list of stage cards with timeline connections
 * Similar to language learning app lesson list
 */

"use client";

import { cn } from "@/lib/utils";
import type { RoadmapStage, RoadmapPart } from "@/lib/papers/roadmapConfig";
import { StageListCard } from "./StageListCard";

interface TimelineNode {
  stage: RoadmapStage;
  isCompleted: boolean;
  isUnlocked: boolean;
  isCurrent: boolean;
  completedCount: number;
  totalCount: number;
}

interface RoadmapListProps {
  nodes: TimelineNode[];
  completionData: Map<
    string,
    { completed: number; total: number; parts: Map<string, boolean> }
  >;
  onNodeClick: (stage: RoadmapStage) => void;
  onStartSession: (stage: RoadmapStage, selectedParts: RoadmapPart[]) => void;
}

export function RoadmapList({
  nodes,
  completionData,
  onNodeClick,
  onStartSession,
}: RoadmapListProps) {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {nodes.map((node, index) => {
        const stageCompletionData =
          completionData.get(node.stage.id)?.parts || new Map();

        return (
          <StageListCard
            key={node.stage.id}
            stage={node.stage}
            index={index}
            completedCount={node.completedCount}
            totalCount={node.totalCount}
            isUnlocked={node.isUnlocked}
            isCurrent={node.isCurrent}
            isCompleted={node.isCompleted}
            completionData={stageCompletionData}
            onStartSession={onStartSession}
            onPartClick={onNodeClick}
          />
        );
      })}
    </div>
  );
}

