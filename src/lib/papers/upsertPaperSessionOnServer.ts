/**
 * Upsert a past-paper sitting to the server.
 * Guest starts never create a row; after login PATCH matches nothing, so we POST.
 */
export async function upsertPaperSessionOnServer(
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; created: boolean }> {
  const patchRes = await fetch("/api/past-papers/sessions", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (patchRes.status === 401) {
    return { ok: false, status: 401, created: false };
  }

  if (!patchRes.ok) {
    return { ok: false, status: patchRes.status, created: false };
  }

  const patchData = (await patchRes.json().catch(() => ({}))) as {
    session?: unknown;
  };
  if (patchData.session) {
    return { ok: true, status: 200, created: false };
  }

  // No row for this user yet (typical guest → login path). Create it.
  const postRes = await fetch("/api/past-papers/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

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
