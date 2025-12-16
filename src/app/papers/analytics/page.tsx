/**
 * Papers Analytics page - Detailed analytics for paper performance
 */

"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/layout/Container";
import { cn } from "@/lib/utils";
import type { PaperType, PaperSection } from "@/types/papers";
import { PageHeader } from "@/components/shared/PageHeader";

export default function PapersAnalyticsPage() {
  const [selectedPaper, setSelectedPaper] = useState<PaperType | "ALL">("ALL");
  const [selectedSection, setSelectedSection] = useState<PaperSection | "ALL">("ALL");
  const [timeRange, setTimeRange] = useState<"week" | "month" | "quarter" | "all">("all");

  // Mock data - in real implementation, this would come from Supabase
  const mockSessions = [
    {
      id: "1",
      paperName: "ESAT" as PaperType,
      paperVariant: "2024 Practice 1",
      score: 85,
      sections: ["Math", "Physics"] as PaperSection[],
      date: new Date("2024-01-15"),
      timeSpent: 72,
      mistakes: ["Calc / algebra mistakes", "Understanding"]
    },
    {
      id: "2", 
      paperName: "ESAT" as PaperType,
      paperVariant: "2024 Practice 2",
      score: 78,
      sections: ["Math", "Chemistry"] as PaperSection[],
      date: new Date("2024-01-20"),
      timeSpent: 75,
      mistakes: ["Read the question wrong", "Formula recall"]
    },
    {
      id: "3",
      paperName: "TMUA" as PaperType,
      paperVariant: "2024 Paper 1",
      score: 92,
      sections: [] as PaperSection[],
      date: new Date("2024-01-25"),
      timeSpent: 70,
      mistakes: ["Calc / algebra mistakes"]
    }
  ];

  const filteredSessions = useMemo(() => {
    return mockSessions.filter(session => {
      const paperMatch = selectedPaper === "ALL" || session.paperName === selectedPaper;
      const sectionMatch = selectedSection === "ALL" || session.sections.includes(selectedSection);
      
      // Time range filtering would be implemented here
      return paperMatch && sectionMatch;
    });
  }, [selectedPaper, selectedSection, timeRange]);

  const averageScore = useMemo(() => {
    if (filteredSessions.length === 0) return 0;
    return Math.round(filteredSessions.reduce((sum, s) => sum + s.score, 0) / filteredSessions.length);
  }, [filteredSessions]);

  const sectionPerformance = useMemo(() => {
    const sectionStats: Record<string, { total: number; correct: number; avgTime: number }> = {};
    
    filteredSessions.forEach(session => {
      session.sections.forEach(section => {
        if (!sectionStats[section]) {
          sectionStats[section] = { total: 0, correct: 0, avgTime: 0 };
        }
        sectionStats[section].total += 1;
        sectionStats[section].correct += session.score / 100;
        sectionStats[section].avgTime += session.timeSpent;
      });
    });

    return Object.entries(sectionStats).map(([section, stats]) => ({
      section,
      accuracy: Math.round((stats.correct / stats.total) * 100),
      avgTime: Math.round(stats.avgTime / stats.total),
      attempts: stats.total
    }));
  }, [filteredSessions]);

  return (
    <Container size="lg">
      <div className="space-y-8">
        {/* Header */}
        <PageHeader
          title="Papers Analytics"
          description="Deep insights into your paper performance. Track progress, identify patterns, and optimize your preparation."
        />

        {/* Filters */}
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Paper Filter */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Paper Type
              </label>
              <select
                value={selectedPaper}
                onChange={(e) => setSelectedPaper(e.target.value as PaperType | "ALL")}
                className="w-full px-4 py-3 bg-white/5 text-neutral-100 rounded-organic-md border border-white/10 focus:border-primary focus:shadow-glow-focus outline-none transition-all duration-fast ease-signature"
              >
                <option value="ALL">All Papers</option>
                <option value="ESAT">ESAT</option>
                <option value="TMUA">TMUA</option>
                <option value="NSAA">NSAA</option>
                <option value="ENGAA">ENGAA</option>
                <option value="PAT">PAT</option>
              </select>
            </div>

            {/* Section Filter */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Section
              </label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value as PaperSection | "ALL")}
                className="w-full px-4 py-3 bg-white/5 text-neutral-100 rounded-organic-md border border-white/10 focus:border-primary focus:shadow-glow-focus outline-none transition-all duration-fast ease-signature"
              >
                <option value="ALL">All Sections</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Biology">Biology</option>
                <option value="Advanced Mathematics and Advanced Physics">Advanced Mathematics and Advanced Physics</option>
                <option value="Mathematics and Physics">Mathematics and Physics</option>
              </select>
            </div>

            {/* Time Range Filter */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Time Range
              </label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as "week" | "month" | "quarter" | "all")}
                className="w-full px-4 py-3 bg-white/5 text-neutral-100 rounded-organic-md border border-white/10 focus:border-primary focus:shadow-glow-focus outline-none transition-all duration-fast ease-signature"
              >
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="quarter">Last 3 Months</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6 text-center">
            <div className="text-3xl font-bold text-primary mb-2">{averageScore}%</div>
            <div className="text-sm text-neutral-400">Average Score</div>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-3xl font-bold text-cyan-400 mb-2">{filteredSessions.length}</div>
            <div className="text-sm text-neutral-400">Sessions Completed</div>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-3xl font-bold text-amber-400 mb-2">
              {Math.round(filteredSessions.reduce((sum, s) => sum + s.timeSpent, 0) / filteredSessions.length) || 0}
            </div>
            <div className="text-sm text-neutral-400">Avg Time (min)</div>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">
              {sectionPerformance.length}
            </div>
            <div className="text-sm text-neutral-400">Sections Practiced</div>
          </Card>
        </div>

        {/* Score Trend Chart Placeholder */}
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-100 mb-2">Score Trend</h2>
              <p className="text-sm text-neutral-400">Your performance over time</p>
            </div>
            <div className="h-64 bg-white/5 rounded-organic-md border border-white/10 flex items-center justify-center">
              <div className="text-center text-neutral-500">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <div className="text-sm">Score trend chart will be implemented here</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Section Performance */}
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-100 mb-2">Section Performance</h2>
              <p className="text-sm text-neutral-400">Performance breakdown by section</p>
            </div>
            
            {sectionPerformance.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sectionPerformance.map((section) => (
                  <div key={section.section} className="p-4 bg-white/5 rounded-organic-md border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-neutral-100">{section.section}</div>
                      <div className="text-sm text-neutral-400">{section.attempts} attempts</div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-400">Accuracy</span>
                        <span className="font-medium text-neutral-200">{section.accuracy}%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-400">Avg Time</span>
                        <span className="font-medium text-neutral-200">{section.avgTime} min</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-500">
                <div className="text-sm">No section data available for the selected filters</div>
              </div>
            )}
          </div>
        </Card>

        {/* Mistake Analysis */}
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-100 mb-2">Mistake Patterns</h2>
              <p className="text-sm text-neutral-400">Most common mistake types</p>
            </div>
            
            <div className="h-48 bg-white/5 rounded-organic-md border border-white/10 flex items-center justify-center">
              <div className="text-center text-neutral-500">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <div className="text-sm">Mistake pattern analysis will be implemented here</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Improvement Suggestions */}
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-100 mb-2">Improvement Suggestions</h2>
              <p className="text-sm text-neutral-400">AI-powered recommendations based on your performance</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-primary/10 rounded-organic-md border border-primary/20">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-neutral-100 mb-1">Focus on Algebra</div>
                    <div className="text-sm text-neutral-300">
                      You've made calculation errors in 60% of recent sessions. Practice more algebra problems.
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-amber-500/10 rounded-organic-md border border-amber-500/20">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-neutral-100 mb-1">Time Management</div>
                    <div className="text-sm text-neutral-300">
                      You're spending too much time on individual questions. Practice faster problem solving.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Recent Sessions */}
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-100 mb-2">Recent Sessions</h2>
              <p className="text-sm text-neutral-400">Your latest practice sessions</p>
            </div>
            
            <div className="space-y-3">
              {filteredSessions.slice(0, 5).map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 bg-white/5 rounded-organic-md border border-white/10">
                  <div>
                    <div className="font-medium text-neutral-100">{session.paperName} {session.paperVariant}</div>
                    <div className="text-sm text-neutral-400">
                      {session.date.toLocaleDateString()} • {session.sections.join(", ") || "Full Paper"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-neutral-100">{session.score}%</div>
                    <div className="text-sm text-neutral-400">{session.timeSpent} min</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </Container>
  );
}


