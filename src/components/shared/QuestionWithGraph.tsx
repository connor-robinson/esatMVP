/**
 * QuestionWithGraph component
 * Renders question text with math content and replaces <GRAPH> tags with TMUA graphs
 */

"use client";

import { useMemo } from "react";
import { MathContent } from "./MathContent";
import { TMUAGraph, TMUAGraphSpec } from "./TMUAGraph";
import { cn } from "@/lib/utils";

interface QuestionWithGraphProps {
  questionText: string;
  graphSpec?: TMUAGraphSpec | null; // Deprecated: single graph spec
  graphSpecs?: Record<string, TMUAGraphSpec> | null; // Map of graph ID to spec for multiple graphs
  className?: string;
}

export function QuestionWithGraph({ questionText, graphSpec, graphSpecs, className }: QuestionWithGraphProps) {
  const { parts } = useMemo(() => {
    // Parse question text and split by <GRAPH> tags
    const graphTagRegex = /<GRAPH\s+id="([^"]+)"\s*\/?>/gi;
    const parts: Array<{ type: "text" | "graph"; content: string; graphId?: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = graphTagRegex.exec(questionText)) !== null) {
      // Add text before the graph tag
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: questionText.substring(lastIndex, match.index),
        });
      }

      // Add graph placeholder
      parts.push({
        type: "graph",
        content: "",
        graphId: match[1],
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after last graph tag
    if (lastIndex < questionText.length) {
      parts.push({
        type: "text",
        content: questionText.substring(lastIndex),
      });
    }

    // If no graph tags found, return the whole text as a single part
    if (parts.length === 0) {
      parts.push({
        type: "text",
        content: questionText,
      });
    }

    return { parts };
  }, [questionText]);

  return (
    <div className={cn("question-with-graph", className)}>
      {parts.map((part, idx) => {
        if (part.type === "graph") {
          // Look up graph spec by ID (prefer graphSpecs map, fallback to single graphSpec)
          const spec = graphSpecs?.[part.graphId || ""] || graphSpec;
          
          if (spec) {
            return (
              <div
                key={`graph-${idx}`}
                className="tmua-graph-container"
                style={{
                  marginTop: "0px",
                  marginBottom: "0px",
                  marginLeft: "0px",
                  width: "fit-content",
                }}
              >
                <TMUAGraph spec={spec} />
              </div>
            );
          } else {
            // Fallback: show placeholder if graph spec is missing
            return (
              <div
                key={`graph-${idx}`}
                className="text-white/40 text-sm italic"
                style={{ marginLeft: "0px" }}
              >
                [Graph: {part.graphId}]
              </div>
            );
          }
        } else {
          // Render text with math content
          return (
            <MathContent
              key={`text-${idx}`}
              content={part.content}
              className="question-text"
            />
          );
        }
      })}
    </div>
  );
}

