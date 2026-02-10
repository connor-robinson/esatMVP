/**
 * Subject card component for the subject selector page
 */

"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SubjectIcon } from "./SubjectIcon";
import { Subject } from "@/types/core";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface SubjectCardProps {
  subject: Subject;
  topicCount: number;
  completedCount: number;
  className?: string;
}

export function SubjectCard({ 
  subject, 
  topicCount, 
  completedCount,
  className 
}: SubjectCardProps) {
  const progressPercentage = topicCount > 0 ? (completedCount / topicCount) * 100 : 0;
  
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="h-full"
    >
      <Link href={`/mental-maths/learn/${subject.id}`} className="h-full block">
        <Card 
          className={cn(
            "p-6 cursor-pointer transition-all duration-300 hover:border-white/30 group h-full flex flex-col",
            "bg-gradient-to-br from-white/5 to-white/2",
            "hover:shadow-lg hover:shadow-black/20",
            className
          )}
          style={{
            borderColor: `${subject.color}30`,
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-organic-lg shadow-lg" style={{ backgroundColor: `${subject.color}25`, boxShadow: `0 8px 32px ${subject.color}20` }}>
                <div className="w-8 h-8" style={{ color: subject.color }}>
                  <SubjectIcon id={subject.id} className="w-8 h-8" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white/95 mb-2 group-hover:text-white transition-colors">
                  {subject.name}
                </h3>
                <p className="text-sm text-white/70 leading-relaxed">
                  {subject.description}
                </p>
              </div>
            </div>
            
            <Badge 
              variant="default"
              className="text-sm font-medium px-3 py-1.5"
              style={{ 
                backgroundColor: `${subject.color}25`,
                color: subject.color,
                borderColor: `${subject.color}40`,
                boxShadow: `0 4px 16px ${subject.color}15`
              }}
            >
              {completedCount}/{topicCount}
            </Badge>
          </div>
          
          {/* Progress section */}
          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center text-sm">
              <span className="text-white/60 font-medium">Progress</span>
              <span className="text-white/90 font-semibold">{Math.round(progressPercentage)}%</span>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden shadow-inner">
              <motion.div
                className="h-full rounded-full shadow-sm"
                style={{ 
                  backgroundColor: subject.color,
                  boxShadow: `0 0 12px ${subject.color}40`
                }}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
              />
            </div>
          </div>
          
          {/* Categories */}
          <div className="mt-auto">
            <div className="flex flex-wrap gap-2">
              {subject.categories.slice(0, 3).map((category) => (
                <span
                  key={category}
                  className="text-xs px-3 py-1.5 rounded-organic-sm bg-white/8 text-white/70 font-medium border border-white/10 hover:bg-white/12 transition-colors"
                >
                  {category.replace('_', ' ')}
                </span>
              ))}
              {subject.categories.length > 3 && (
                <span className="text-xs px-3 py-1.5 rounded-organic-sm bg-white/8 text-white/70 font-medium border border-white/10">
                  +{subject.categories.length - 3} more
                </span>
              )}
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}
