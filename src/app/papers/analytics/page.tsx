/**
 * Papers Analytics page - Detailed analytics for paper performance
 */

"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/shared/PageHeader";
import { PerformanceTrendChart } from "@/components/papers/PerformanceTrendChart";
import { MistakeChart } from "@/components/papers/MistakeChart";
import { FileText } from "lucide-react";
import type { PaperType, PaperSection } from "@/types/papers";
import { 
  fetchUserSessions, 
  filterSessions, 
  calculateTrendData,
  getAllMistakeTags,
  calculateSessionAnalytics 
} from "@/lib/papers/analytics";
import type { PaperSession } from "@/types/papers";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { usePaperSessionStore } from "@/store/paperSessionStore";

export default function PapersAnalyticsPage() {
  const router = useRouter();
  const session = useSupabaseSession();
  const [sessions, setSessions] = useState<PaperSession[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedPaper, setSelectedPaper] = useState<PaperType | "ALL">("ALL");
  const [selectedSection, setSelectedSection] = useState<PaperSection | "ALL">("ALL");
  const [timeRange, setTimeRange] = useState<"week" | "month" | "quarter" | "all">("all");

  // Fetch sessions on mount
  useEffect(() => {
    if (session?.user) {
      fetchUserSessions().then(data => {
        setSessions(data);
        setLoading(false);
      }).catch(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [session]);

  // Filter sessions based on selected filters
  const filteredSessions = useMemo(() => {
    return filterSessions(sessions, {
      paperType: selectedPaper,
      section: selectedSection,
      timeRange,
    });
  }, [sessions, selectedPaper, selectedSection, timeRange]);

  // Calculate trend data for graph
  const trendData = useMemo(() => {
    return calculateTrendData(filteredSessions);
  }, [filteredSessions]);

  // Calculate analytics
  const analytics = useMemo(() => {
    return calculateSessionAnalytics(filteredSessions);
  }, [filteredSessions]);

  // Get all unique sections practiced
  const sectionsPracticed = useMemo(() => {
    const sections = new Set<PaperSection>();
    filteredSessions.forEach(s => {
      s.selectedSections?.forEach(sec => sections.add(sec));
    });
    return sections.size;
  }, [filteredSessions]);

  // Get all mistake tags from filtered sessions
  const allMistakeTags = useMemo(() => {
    const tags: string[] = [];
    filteredSessions.forEach(s => {
      tags.push(...s.mistakeTags.filter(t => t && t !== 'None'));
    });
    return tags as any[];
  }, [filteredSessions]);

  const { loadSessionFromDatabase } = usePaperSessionStore();

  // Function to load session and navigate to mark page
  const handleViewMarkPage = async (sessionId: string) => {
    try {
      await loadSessionFromDatabase(sessionId);
      router.push('/papers/mark');
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  if (loading) {
    return (
      <Container size="lg">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Container>
    );
  }

  if (!session?.user) {
    return (
      <Container size="lg">
        <PageHeader
          title="Papers Analytics"
          description="Please log in to view your paper analytics."
        />
      </Container>
    );
  }

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

        {/* Trends Card - First Big Card */}
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-100 mb-2">Performance Trends</h2>
              <p className="text-sm text-neutral-400">Your score percentage over time</p>
            </div>
            {trendData.length > 0 ? (
              <PerformanceTrendChart dataPoints={trendData} />
            ) : (
              <div className="h-64 bg-white/5 rounded-organic-md border border-white/10 flex items-center justify-center">
                <div className="text-center text-neutral-500">
                  <div className="text-sm">No trend data available for the selected filters</div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Stats Section - Smaller Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6 text-center">
            <div className="text-3xl font-bold text-primary mb-2">
              {Math.round(analytics.averageScore)}%
            </div>
            <div className="text-sm text-neutral-400">Average Score</div>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-3xl font-bold text-cyan-400 mb-2">
              {analytics.totalSessions}
            </div>
            <div className="text-sm text-neutral-400">Sessions Completed</div>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-3xl font-bold text-amber-400 mb-2">
              {Math.round(analytics.averageTime)} min
            </div>
            <div className="text-sm text-neutral-400">Avg Time</div>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">
              {sectionsPracticed}
            </div>
            <div className="text-sm text-neutral-400">Sections Practiced</div>
          </Card>
        </div>

        {/* History Section - Big Card */}
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-100 mb-2">Session History</h2>
              <p className="text-sm text-neutral-400">Your past paper sessions</p>
            </div>
            
            {filteredSessions.length > 0 ? (
              <div className="space-y-3">
                {filteredSessions.map((session) => {
                  const scorePercentage = session.score 
                    ? Math.round((session.score.correct / session.score.total) * 100)
                    : null;
                  const date = session.startedAt 
                    ? new Date(session.startedAt).toLocaleDateString()
                    : 'Unknown date';
                  const minutes = Math.round(session.timeLimitMinutes);

                  return (
                    <div 
                      key={session.id} 
                      className="flex items-center justify-between p-4 bg-white/5 rounded-organic-md border border-white/10 hover:border-white/20 transition-colors"
                    >
                      {/* Left: Icon */}
                      <div className="flex-shrink-0 mr-4">
                        <FileText className="w-5 h-5 text-neutral-400" />
                      </div>

                      {/* Middle: Session Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-neutral-100 truncate">
                          {session.paperName} {session.paperVariant}
                        </div>
                        <div className="text-sm text-neutral-400 truncate">
                          {date} • {session.sessionName}
                          {session.selectedSections && session.selectedSections.length > 0 && (
                            ` • ${session.selectedSections.join(", ")}`
                          )}
                        </div>
                      </div>

                      {/* Right: Marks, Minutes, and Button */}
                      <div className="flex items-center gap-4 ml-4">
                        <div className="text-right">
                          {scorePercentage !== null && (
                            <div className="font-medium text-neutral-100">{scorePercentage}%</div>
                          )}
                          <div className="text-sm text-neutral-400">{minutes} min</div>
                        </div>
                        <Button
                          onClick={() => handleViewMarkPage(session.id)}
                          variant="secondary"
                          size="sm"
                        >
                          View Mark Page
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-500">
                <div className="text-sm">No sessions found for the selected filters</div>
              </div>
            )}
          </div>
        </Card>

        {/* Bottom Section - Half Page Split */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Mistake Patterns */}
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-neutral-100 mb-2">Mistake Patterns</h2>
                <p className="text-sm text-neutral-400">Most common mistake types</p>
              </div>
              {allMistakeTags.length > 0 ? (
                <MistakeChart mistakeTags={allMistakeTags} />
              ) : (
                <div className="text-center py-8 text-neutral-500">
                  <div className="text-sm">No mistakes recorded yet</div>
                </div>
              )}
            </div>
          </Card>

          {/* Right: Section Performance (placeholder for now) */}
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-neutral-100 mb-2">Section Performance</h2>
                <p className="text-sm text-neutral-400">Performance breakdown by section</p>
              </div>
              <div className="text-center py-8 text-neutral-500">
                <div className="text-sm">Section performance details coming soon</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Container>
  );
}
