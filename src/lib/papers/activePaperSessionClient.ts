import { usePaperSessionStore } from '@/store/paperSessionStore';
import { findDetachedSession, isSessionDetached } from '@/lib/storage/sessionStorage';

/** Routes that show the paper itself, where the main navbar stays hidden. */
const PAPER_IMMERSIVE_ROUTES = [
  '/past-papers/solve',
  '/past-papers/mark',
  '/past-papers/submit',
];

/**
 * True while the user is actually inside the paper. Everywhere else the main
 * navbar must stay usable, even with a session running.
 */
export function isPaperImmersiveRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return PAPER_IMMERSIVE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

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

/** True when a save-and-left session exists and can be resumed. */
export async function hasResumablePaperSession(): Promise<boolean> {
  const { sessionId, endedAt } = usePaperSessionStore.getState();
  if (sessionId && !endedAt) return true;

  const detached = await findDetachedSession();
  if (detached) return true;

  try {
    const r = await fetch('/api/past-papers/sessions?in_progress=true', {
      credentials: 'include',
    });
    if (!r.ok) return false;
    const d = (await r.json()) as { sessions?: { id: string }[] };
    const sessions = Array.isArray(d.sessions) ? d.sessions : [];
    return sessions.some((s) => isSessionDetached(s.id));
  } catch {
    return false;
  }
}

/** Restore a save-and-left session into the client (shows the progress bar again). */
export async function resumeInProgressPaperSession(): Promise<boolean> {
  const { sessionId, endedAt, resumeSavedSession } =
    usePaperSessionStore.getState();
  if (sessionId && !endedAt) return true;
  return resumeSavedSession();
}
