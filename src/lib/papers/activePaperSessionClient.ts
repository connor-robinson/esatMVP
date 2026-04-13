import { usePaperSessionStore } from '@/store/paperSessionStore';

/**
 * True if starting a new past-paper session would end an existing one
 * (local store and/or server in-progress rows).
 */
export async function shouldConfirmReplacePaperSession(): Promise<boolean> {
  const { sessionId, endedAt } = usePaperSessionStore.getState();
  if (sessionId && !endedAt) return true;

  try {
    const r = await fetch('/api/past-papers/sessions?in_progress=true', {
      credentials: 'include',
    });
    if (!r.ok) return false;
    const d = (await r.json()) as { sessions?: unknown[] };
    return Array.isArray(d.sessions) && d.sessions.length > 0;
  } catch {
    return false;
  }
}
