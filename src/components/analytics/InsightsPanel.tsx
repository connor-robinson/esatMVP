/**
 * Panel displaying personalized insights
 */

"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Lightbulb } from "lucide-react";
import { Insight } from "@/types/analytics";
import { cn } from "@/lib/utils";

interface InsightsPanelProps {
  insights: Insight[];
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  if (insights.length === 0) return null;

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-5 w-5 text-white/40" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-white/70">
          Quick Insights
        </h3>
      </div>

      <div className="space-y-2.5">
        {insights.map((insight, index) => (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className={cn(
              "flex items-start gap-3 p-3 rounded-xl border transition-colors",
              insight.type === "achievement" &&
                "bg-primary/5 border-primary/20",
              insight.type === "improvement" &&
                "bg-primary/5 border-primary/20",
              insight.type === "strength" &&
                "bg-primary/5 border-primary/20",
              insight.type === "weakness" &&
                "bg-warning/5 border-warning/20",
              insight.type === "suggestion" &&
                "bg-secondary/5 border-secondary/20"
            )}
          >
            <span className="text-base flex-shrink-0">{insight.icon}</span>
            <p className="text-sm text-white/70 leading-relaxed">
              {insight.message}
            </p>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

