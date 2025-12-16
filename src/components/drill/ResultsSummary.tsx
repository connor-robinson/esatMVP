/**
 * Results summary component showing session statistics
 */

"use client";

import { motion } from "framer-motion";
import { Trophy, Clock, Target, TrendingUp, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { DrillResult } from "@/types/core";
import { formatTimeHuman } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ResultsSummaryProps {
  result: DrillResult;
  onRetry?: () => void;
  onBack?: () => void;
  className?: string;
}

export function ResultsSummary({
  result,
  onRetry,
  onBack,
  className,
}: ResultsSummaryProps) {
  const { totalQuestions, correctAnswers, accuracy, averageTimeMs } = result;
  
  // Determine performance level
  const getPerformanceLevel = () => {
    if (accuracy >= 90) return { label: "Excellent!", color: "success", icon: Trophy };
    if (accuracy >= 75) return { label: "Great Job!", color: "primary", icon: TrendingUp };
    if (accuracy >= 60) return { label: "Good Effort!", color: "warning", icon: Target };
    return { label: "Keep Practicing!", color: "default", icon: RotateCcw };
  };
  
  const performance = getPerformanceLevel();
  const PerformanceIcon = performance.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("space-y-6", className)}
    >
      {/* Header */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "mx-auto w-20 h-20 rounded-full flex items-center justify-center border-2",
            accuracy >= 75 ? "bg-primary/20 border-primary" : "bg-warning/20 border-warning"
          )}
        >
          <PerformanceIcon
            className={cn(
              "h-10 w-10",
              accuracy >= 75 ? "text-primary" : "text-warning"
            )}
          />
        </motion.div>
        
        <div>
          <h2 className="text-3xl font-heading font-bold text-gray-100">
            {performance.label}
          </h2>
          <p className="mt-1 text-gray-400">
            You completed the drill session
          </p>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-6 text-center">
          <div className="text-4xl font-bold font-mono text-primary mb-1">
            <AnimatedNumber value={accuracy} decimals={0} />%
          </div>
          <div className="text-sm text-gray-400">Accuracy</div>
        </Card>
        
        <Card className="p-6 text-center">
          <div className="text-4xl font-bold font-mono text-gray-100 mb-1">
            {correctAnswers}/{totalQuestions}
          </div>
          <div className="text-sm text-gray-400">Correct</div>
        </Card>
        
        <Card className="p-6 text-center">
          <div className="text-2xl font-mono text-gray-100 mb-1">
            {formatTimeHuman(averageTimeMs)}
          </div>
          <div className="text-sm text-gray-400 flex items-center justify-center gap-1">
            <Clock className="h-3 w-3" />
            Average Time
          </div>
        </Card>
        
        <Card className="p-6 text-center">
          <div className="text-2xl font-mono text-gray-100 mb-1">
            {formatTimeHuman(averageTimeMs)}
          </div>
          <div className="text-sm text-gray-400 flex items-center justify-center gap-1">
            <Target className="h-3 w-3" />
            Fastest
          </div>
        </Card>
      </div>
      
      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {onBack && (
          <Button
            onClick={onBack}
            variant="secondary"
            size="lg"
            className="flex-1"
          >
            Back to Setup
          </Button>
        )}
        
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="primary"
            size="lg"
            className="flex-1"
          >
            <RotateCcw className="h-5 w-5 mr-2" />
            Try Again
          </Button>
        )}
      </div>
    </motion.div>
  );
}

