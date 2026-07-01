/**
 * Past Papers Analytics — layout aligned with Mental Maths analytics
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PaperAnalyticsView } from '@/components/papers/analytics/PaperAnalyticsView';
import { fetchUserSessions } from '@/lib/papers/analytics';
import type { PaperSession } from '@/types/papers';
import { useSupabaseSession } from '@/components/auth/SupabaseSessionProvider';
import { usePaperSessionStore } from '@/store/paperSessionStore';
import { deletePaperSession } from '@/lib/supabase/papers';

export default function PapersAnalyticsPage() {
  const router = useRouter();
  const session = useSupabaseSession();
  const { loadSessionFromDatabase } = usePaperSessionStore();

  const [sessions, setSessions] = useState<PaperSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightedSessionId, setHighlightedSessionId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (session?.user) {
      fetchUserSessions()
        .then((data) => {
          setSessions(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const highlightId = urlParams.get('highlight');

    if (highlightId && sessions.length > 0 && !loading) {
      setHighlightedSessionId(highlightId);

      setTimeout(() => {
        const sessionElement = document.querySelector(
          `[data-session-id="${highlightId}"]`,
        );
        if (sessionElement) {
          sessionElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
          setTimeout(() => {
            setHighlightedSessionId(null);
            const url = new URL(window.location.href);
            url.searchParams.delete('highlight');
            router.replace(url.pathname + url.search);
          }, 5000);
        }
      }, 300);
    }
  }, [sessions, loading, router]);

  const handleViewMarkPage = async (sessionId: string) => {
    try {
      await loadSessionFromDatabase(sessionId);
      router.push('/past-papers/mark');
    } catch (error) {
    }
  };

  const handleDeleteSession = async (
    sessionId: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this session?')) {
      return;
    }
    try {
      await deletePaperSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (error) {
      alert('Failed to delete session. Please try again.');
    }
  };

  const handleClearAllSessions = async () => {
    if (!session?.user) return;
      const response = await fetch('/api/past-papers/sessions', {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to clear sessions');
      }
      setSessions([]);
  };

  if (loading) {
    return (
      <Container size="lg">
        <div className="flex min-h-[400px] items-center justify-center">
          <LoadingSpinner size="md" />
        </div>
      </Container>
    );
  }

  if (!session?.user) {
    return (
      <Container size="lg" className="py-10 sm:py-12">
        <header className="border-b border-border-subtle pb-8">
          <h1 className="text-3xl font-bold tracking-tight text-text sm:text-4xl">
            Past Papers Analytics
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-text-muted sm:text-base">
            Please log in to view your paper analytics.
          </p>
        </header>
      </Container>
    );
  }

  return (
    <Container size="lg" className="space-y-8 py-10 sm:py-12">
      <header className="border-b border-border-subtle pb-8">
        <h1 className="text-3xl font-bold tracking-tight text-text sm:text-4xl">
          Past Papers Analytics
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-text-muted sm:text-base">
          Overview, trends, session history, and mistake patterns across your
          paper practice.
        </p>
      </header>

      <PaperAnalyticsView
        sessions={sessions}
        highlightedSessionId={highlightedSessionId}
        onViewMarkPage={handleViewMarkPage}
        onDeleteSession={handleDeleteSession}
        onClearAllSessions={handleClearAllSessions}
      />
    </Container>
  );
}
