/**
 * Subject selector page - Choose your learning path
 */

"use client";

import { useState, useEffect } from "react";
import { Container } from "@/components/layout/Container";
import { SubjectCard } from "@/components/subjects/SubjectCard";
import { getAllSubjects } from "@/config/subjects";
import { TOPICS } from "@/config/topics";
import { Subject } from "@/types/core";

export default function SubjectsPage() {
  const [subjectData, setSubjectData] = useState<Record<string, { 
    topicCount: number; 
    completedCount: number; 
  }>>({});
  
  const subjects = getAllSubjects();
  
  // Initialize subject data on mount with fixed preview values
  useEffect(() => {
    const data: Record<string, { topicCount: number; completedCount: number }> = {};
    
    subjects.forEach((subject) => {
      // Count topics for this subject by filtering all topics
      const allTopics = Object.values(TOPICS);
      const topicCount = allTopics.filter(topic => topic.subjectId === subject.id).length;
      
      // Fixed preview values for demonstration
      const previewValues: Record<string, number> = {
        maths: 8, // 8 out of ~25 topics completed
        physics: 2, // 2 out of ~8 topics completed
        chemistry: 0, // 0 out of ~0 topics completed
        biology: 0, // 0 out of ~0 topics completed
      };
      
      const completedCount = previewValues[subject.id] || 0;
      
      data[subject.id] = { topicCount, completedCount };
    });
    
    setSubjectData(data);
  }, []); // Remove subjects dependency to prevent re-runs
  
  return (
    <Container size="xl" className="py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white/90 mb-4">
          Choose Your Learning Path
        </h1>
        <p className="text-lg text-white/60 max-w-2xl mx-auto">
          Master any subject with interactive visualizations and step-by-step lessons. 
          Start with the fundamentals and build your expertise.
        </p>
      </div>
      
      {/* Subject Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8">
        {subjects.map((subject) => {
          const data = subjectData[subject.id] || { topicCount: 0, completedCount: 0 };
          
          return (
            <SubjectCard
              key={subject.id}
              subject={subject}
              topicCount={data.topicCount}
              completedCount={data.completedCount}
            />
          );
        })}
      </div>
      
      {/* Footer info */}
      <div className="mt-12 text-center">
        <p className="text-sm text-white/40">
          Each subject contains multiple topics with interactive lessons and visualizations
        </p>
      </div>
    </Container>
  );
}
