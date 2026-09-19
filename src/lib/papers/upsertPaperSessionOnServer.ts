/**
 * Upsert a past-paper sitting to the server.
 * Guest starts never create a row; after login PATCH matches nothing, so we POST.
 * Tombstoned / soft-deleted sittings must never be recreated.
 */

import { isPaperSessionTombstoned } from "@/lib/papers/paperSessionTombstones";

export type UpsertPaperSessionOptions = {
  /**
   * When true, create a row if PATCH finds nothing (guest → login).
   * Defaults to true so completed guest mocks still land in session history.
   * Pass false only when intentionally avoiding recreate (e.g. delete flows).
   */
  createIfMissing?: boolean;
};

export async function upsertPaperSessionOnServer(
  payload: Record<string, unknown>,
  options?: UpsertPaperSessionOptions,
): Promise<{
  ok: boolean;
  status: number;
  created: boolean;
  deleted?: boolean;
}> {
  const sessionId = typeof payload.id === "string" ? payload.id : "";
  if (sessionId && isPaperSessionTombstoned(sessionId)) {
    return { ok: false, status: 410, created: false, deleted: true };
  }

  const createIfMissing = options?.createIfMissing ?? true;

  const patchRes = await fetch("/api/past-papers/sessions", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (patchRes.status === 401) {
    return { ok: false, status: 401, created: false };
  }

  if (patchRes.status === 410) {
    return { ok: false, status: 410, created: false, deleted: true };
  }

  if (!patchRes.ok) {
    return { ok: false, status: patchRes.status, created: false };
  }

  const patchData = (await patchRes.json().catch(() => ({}))) as {
    session?: unknown;
    deleted?: boolean;
    code?: string;
  };
  if (patchData.session) {
    return { ok: true, status: 200, created: false };
  }
  if (patchData.deleted || patchData.code === "SESSION_DELETED") {
    return { ok: false, status: 410, created: false, deleted: true };
  }

  if (!createIfMissing) {
    return { ok: false, status: 404, created: false };
  }

  // No row for this user yet (typical guest → login path). Create it.
  const postRes = await fetch("/api/past-papers/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (postRes.status === 410) {
    return { ok: false, status: 410, created: false, deleted: true };
  }

  if (postRes.ok) {
    return { ok: true, status: postRes.status, created: true };
  }

  // Race / already created: treat as success if a follow-up PATCH finds the row.
  if (postRes.status === 401) {
    return { ok: false, status: 401, created: false };
  }

  const retryPatch = await fetch("/api/past-papers/sessions", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (retryPatch.status === 410) {
    return { ok: false, status: 410, created: false, deleted: true };
  }
  if (!retryPatch.ok) {
    return { ok: false, status: postRes.status, created: false };
  }
  const retryData = (await retryPatch.json().catch(() => ({}))) as {
    session?: unknown;
  };
  return {
    ok: Boolean(retryData.session),
    status: retryPatch.status,
    created: false,
  };
}
