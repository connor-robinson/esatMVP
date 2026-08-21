/**
 * Past Papers Analytics - layout aligned with Mental Maths analytics
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PaperAnalyticsView } from '@/components/papers/analytics/PaperAnalyticsView';
import { DrillUpgradeBanner } from '@/components/builder/DrillUpgradeBanner';
import { fetchUserSessions } from '@/lib/papers/analytics';
import { getSamplePaperAnalyticsSessions } from '@/lib/papers/sampleAnalyticsSessions';
import type { PaperSession } from '@/types/papers';
import { useSupabaseSession } from '@/components/auth/SupabaseSessionProvider';
import { useSubscription } from '@/hooks/useSubscription';
import { usePaperSessionStore } from '@/store/paperSessionStore';
import { deletePaperSession } from '@/lib/supabase/papers';

export default function PapersAnalyticsPage() {
  const router = useRouter();
  const session = useSupabaseSession();
  const { hasFullAccess, isLoading: subscriptionLoading } = useSubscription();
  const { loadSessionFromDatabase } = usePaperSessionStore();

  const [sessions, setSessions] = useState<PaperSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightedSessionId, setHighlightedSessionId] = useState<
    string | null
  >(null);

  const sampleSessions = useMemo(() => getSamplePaperAnalyticsSessions(), []);
  const isSignedIn = !!session?.user;
  const analyticsLocked =
    !isSignedIn || (!subscriptionLoading && !hasFullAccess);

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
    if (typeof window === 'undefined' || analyticsLocked) return;

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
  }, [sessions, loading, router, analyticsLocked]);

  const handleViewMarkPage = async (sessionId: string) => {
    if (analyticsLocked) return;
    try {
      await loadSessionFromDatabase(sessionId);
      router.push('/past-papers/mark');
    } catch {
      /* ignore */
    }
  };

  const handleDeleteSession = async (
    sessionId: string,
    e: React.MouseEvent,
  ) => {
    if (analyticsLocked) return;
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this session?')) {
      return;
    }
    try {
      await deletePaperSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch {
      alert('Failed to delete session. Please try again.');
    }
  };

  const handleClearAllSessions = async () => {
    if (!session?.user || analyticsLocked) return;
    const response = await fetch('/api/past-papers/sessions', {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to clear sessions');
    }
    setSessions([]);
  };

  const noopView = () => {};
  const noopDelete = (_id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const noopClear = async () => {};

  if (loading || (isSignedIn && subscriptionLoading)) {
    return (
      <Container size="lg">
        <div className="flex min-h-[400px] items-center justify-center">
          <LoadingSpinner size="md" />
        </div>
      </Container>
    );
  }

  const loginHref = `/login?redirectTo=${encodeURIComponent('/past-papers/analytics')}`;

  return (
    <Container size="lg" className="space-y-8 py-10 sm:py-12">
      <header className="border-b border-border-subtle pb-8">
        <h1 className="text-3xl font-bold tracking-tight text-text sm:text-4xl">
          Past Papers Analytics
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-text-muted sm:text-base">
          {analyticsLocked
            ? 'Preview of what your paper analytics look like once unlocked.'
            : 'Overview, trends, session history, and mistake patterns across your paper practice.'}
        </p>
      </header>

      {analyticsLocked ? (
        <>
          <DrillUpgradeBanner
            headline={
              isSignedIn
                ? 'Upgrade to unlock paper analytics'
                : 'Log in to view your paper analytics'
            }
            subtext={
              isSignedIn
                ? 'See score trends, session history, and mistake patterns across your past papers.'
                : 'Sign in to track past paper scores, trends, and mistakes over time.'
            }
            ctaLabel={isSignedIn ? 'View plans' : 'Sign in'}
            href={isSignedIn ? '/pricing' : loginHref}
          />

          <div className="relative overflow-hidden rounded-organic-xl">
            <div
              className="pointer-events-none select-none blur-[6px] sm:blur-md"
              aria-hidden
            >
              <PaperAnalyticsView
                sessions={sampleSessions}
                highlightedSessionId={null}
                onViewMarkPage={noopView}
                onDeleteSession={noopDelete}
                onClearAllSessions={noopClear}
              />
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/20 via-background/35 to-background/70"
            />
          </div>
        </>
      ) : (
        <PaperAnalyticsView
          sessions={sessions}
          highlightedSessionId={highlightedSessionId}
          onViewMarkPage={handleViewMarkPage}
          onDeleteSession={handleDeleteSession}
          onClearAllSessions={handleClearAllSessions}
        />
      )}
    </Container>
  );
}
