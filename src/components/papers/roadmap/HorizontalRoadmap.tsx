/**
 * Horizontal connected roadmap with stages as nodes
 */

"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { RoadmapStage } from "@/lib/papers/roadmapConfig";
import { StageNode } from "./StageCard";

interface TimelineNode {
  stage: RoadmapStage;
  isCompleted: boolean;
  isUnlocked: boolean;
  isCurrent: boolean;
  completedCount: number;
  totalCount: number;
}

interface HorizontalRoadmapProps {
  nodes: TimelineNode[];
  onNodeClick: (stage: RoadmapStage) => void;
  currentIndex: number;
}

const NODE_SIZE = 140;
const NODE_SPACING = 300; // Horizontal spacing between nodes

export function HorizontalRoadmap({
  nodes,
  onNodeClick,
  currentIndex,
}: HorizontalRoadmapProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const roadmapContainerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Calculate node positions - subtle S-curve pattern
  const nodePositions = useMemo(() => {
    return nodes.map((node, index) => {
      const baseX = index * NODE_SPACING;
      // Subtle S-curve: alternate nodes slightly up/down
      const sCurveOffset = Math.sin((index / nodes.length) * Math.PI) * 40; // Max 40px vertical variation
      const x = baseX;
      const y = 250 + sCurveOffset; // Base at 250px, with S-curve variation
      return { x, y };
    });
  }, [nodes.length]);

  // Calculate container width - prevent left cutoff and excessive right space
  const containerWidth = useMemo(() => {
    if (nodes.length === 0) return 1200;
    // Calculate width based on node positions + padding
    const lastNodeX = (nodes.length - 1) * NODE_SPACING;
    const rightPadding = 200; // Minimal right padding
    const leftPadding = 200; // Ensure left isn't cut off
    return leftPadding + lastNodeX + NODE_SIZE + rightPadding;
  }, [nodes.length]);

  // Scroll to current node on mount
  useEffect(() => {
    if (currentIndex >= 0 && nodeRefs.current[currentIndex] && scrollContainerRef.current) {
      const nodeElement = nodeRefs.current[currentIndex];
      if (nodeElement) {
        const containerRect = scrollContainerRef.current.getBoundingClientRect();
        const nodeRect = nodeElement.getBoundingClientRect();
        const scrollLeft = nodeRect.left - containerRect.left - containerRect.width / 2 + NODE_SIZE / 2;
        
        scrollContainerRef.current.scrollTo({
          left: Math.max(0, scrollContainerRef.current.scrollLeft + scrollLeft),
          behavior: 'smooth',
        });
      }
    }
  }, [currentIndex]);

  return (
    <div className="relative w-full" style={{ height: '500px' }}>
      {/* Scrollable container */}
      <div
        ref={scrollContainerRef}
        className="absolute inset-0 overflow-x-auto overflow-y-hidden z-10"
        style={{
          scrollBehavior: "smooth",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {/* Roadmap container - ensure left padding prevents cutoff */}
        <div
          ref={roadmapContainerRef}
          className="relative"
          style={{
            width: containerWidth,
            height: "100%",
            paddingLeft: "200px", // Ensure left side isn't cut off
          }}
        >
          {/* Connecting paths - smooth curved connections between node centers + infinite extensions */}
          {nodes.length > 0 && (
            <svg
              className="absolute inset-0 pointer-events-none z-0"
              style={{ width: "100%", height: "100%" }}
            >
              {/* Left infinite connector - extends from first node leftward */}
              {nodes.length > 0 && (() => {
                const firstPos = nodePositions[0];
                if (!firstPos) return null;
                
                const startX = -1000; // Extend far left
                const startY = firstPos.y; // Same Y as first node
                const endX = firstPos.x;
                const endY = firstPos.y;
                
                const dx = endX - startX;
                const cp1x = startX + dx * 0.3;
                const cp1y = startY;
                const cp2x = startX + dx * 0.7;
                const cp2y = endY;
                
                const pathData = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
                const firstNode = nodes[0];
                const pathColor = firstNode.isCompleted
                  ? "rgba(52, 211, 153, 0.4)"
                  : firstNode.isUnlocked
                  ? "rgba(255, 255, 255, 0.35)"
                  : "rgba(255, 255, 255, 0.2)";
                
                return (
                  <path
                    key="path-left-infinite"
                    d={pathData}
                    fill="none"
                    stroke={pathColor}
                    strokeWidth="2"
                    strokeDasharray="6 10"
                    strokeLinecap="round"
                  />
                );
              })()}

              {/* Inter-node connectors */}
              {nodes.length > 1 && nodes.slice(0, -1).map((node, index) => {
                const startPos = nodePositions[index];
                const endPos = nodePositions[index + 1];
                
                if (!startPos || !endPos) return null;

                // Connect from center of one node to center of next
                const startX = startPos.x;
                const startY = startPos.y; // Center of node
                const endX = endPos.x;
                const endY = endPos.y; // Center of next node

                // Calculate smooth curve control points
                // Use a cubic bezier for smooth, modern curves
                const dx = endX - startX;
                const dy = endY - startY;
                
                // Control points create a smooth S-curve
                const cp1x = startX + dx * 0.5;
                const cp1y = startY + dy * 0.3;
                const cp2x = startX + dx * 0.5;
                const cp2y = endY - dy * 0.3;

                // Cubic bezier for smooth, modern curve
                const pathData = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;

                // Determine path color based on completion status
                const pathColor = node.isCompleted
                  ? "rgba(52, 211, 153, 0.4)"
                  : node.isUnlocked
                  ? "rgba(255, 255, 255, 0.35)"
                  : "rgba(255, 255, 255, 0.2)";

                return (
                  <path
                    key={`path-${index}`}
                    d={pathData}
                    fill="none"
                    stroke={pathColor}
                    strokeWidth="2"
                    strokeDasharray="6 10"
                    strokeLinecap="round"
                  />
                );
              })}

              {/* Right infinite connector - extends from last node rightward */}
              {nodes.length > 0 && (() => {
                const lastPos = nodePositions[nodes.length - 1];
                if (!lastPos) return null;
                
                const startX = lastPos.x;
                const startY = lastPos.y;
                const endX = containerWidth + 1000; // Extend far right
                const endY = lastPos.y;
                
                const dx = endX - startX;
                const cp1x = startX + dx * 0.3;
                const cp1y = startY;
                const cp2x = startX + dx * 0.7;
                const cp2y = endY;
                
                const pathData = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
                const lastNode = nodes[nodes.length - 1];
                const pathColor = lastNode.isCompleted
                  ? "rgba(52, 211, 153, 0.4)"
                  : lastNode.isUnlocked
                  ? "rgba(255, 255, 255, 0.35)"
                  : "rgba(255, 255, 255, 0.2)";
                
                return (
                  <path
                    key="path-right-infinite"
                    d={pathData}
                    fill="none"
                    stroke={pathColor}
                    strokeWidth="2"
                    strokeDasharray="6 10"
                    strokeLinecap="round"
                  />
                );
              })()}
            </svg>
          )}

          {/* Stage nodes */}
          <div className="relative z-20">
            {nodes.map((nodeData, index) => {
              const position = nodePositions[index];
              
              return (
                <div
                  key={nodeData.stage.id}
                  ref={(el) => {
                    nodeRefs.current[index] = el;
                  }}
                  className="absolute"
                  style={{
                    left: position.x - NODE_SIZE / 2,
                    top: position.y - NODE_SIZE / 2,
                  }}
                >
                  <StageNode
                    stage={nodeData.stage}
                    completedCount={nodeData.completedCount}
                    totalCount={nodeData.totalCount}
                    isUnlocked={nodeData.isUnlocked}
                    isCurrent={nodeData.isCurrent}
                    isCompleted={nodeData.isCompleted}
                    onNodeClick={() => onNodeClick(nodeData.stage)}
                    index={index}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hide scrollbar completely */}
      <style dangerouslySetInnerHTML={{
        __html: `
          div::-webkit-scrollbar {
            display: none;
            width: 0;
            height: 0;
          }
          div {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `
      }} />
    </div>
  );
}

