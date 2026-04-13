/**
 * Supabase client for walkthrough upload API routes (server-only).
 *
 * 1) If SUPABASE_SERVICE_ROLE_KEY is set → uses service role (bypasses RLS).
 * 2) Otherwise → uses NEXT_PUBLIC_SUPABASE_ANON_KEY + the request's auth cookies
 *    (same session as the rest of the review app). You must add RLS policies so
 *    `anon` or `authenticated` can insert registry rows and update media columns —
 *    see migrations/review_walkthrough_rls.sql.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Next.js inlines `NEXT_PUBLIC_*` at build time. If you change only those vars on Vercel,
 * API routes can keep talking to an old Supabase project until the next build. Prefer setting
 * `SUPABASE_URL` (server-only, runtime) to the same value as `NEXT_PUBLIC_SUPABASE_URL`.
 */
function serverSupabaseUrl(): string {
  return (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim() ?? "";
}

function hostFromEnvUrl(raw: string | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  try {
    return new URL(t).hostname;
  } catch {
    return null;
  }
}

/** Safe connection metadata for debugging “API row ≠ SQL editor row” (no secrets). */
export function getSupabaseServerDiagnostics() {
  const supabaseUrl = process.env.SUPABASE_URL?.trim() ?? "";
  const nextPublic = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const hSrv = hostFromEnvUrl(supabaseUrl);
  const hPub = hostFromEnvUrl(nextPublic);
  return {
    hostFrom_SUPABASE_URL: hSrv,
    hostFrom_NEXT_PUBLIC_SUPABASE_URL: hPub,
    effectiveHost: hostFromEnvUrl(serverSupabaseUrl()),
    preferServerEnv: Boolean(supabaseUrl),
    bothSet: Boolean(supabaseUrl && nextPublic),
    hostsDiffer: Boolean(hSrv && hPub && hSrv !== hPub),
    hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
  };
}

let _serviceClientCache: { cacheKey: string; client: SupabaseClient } | null = null;

export const QUESTION_MEDIA_BUCKET = "question-media";

/**
 * Server-side client for review APIs (list, stats, approve, delete, update).
 * Prefer setting SUPABASE_SERVICE_ROLE_KEY on Vercel so these routes bypass RLS;
 * otherwise uses anon + cookies and your DB must allow SELECT/UPDATE (see migrations/review_walkthrough_rls.sql).
 */
export function getReviewSupabase(): SupabaseClient {
  return getUploadSupabase();
}

export function getUploadSupabase(): SupabaseClient {
  const url = serverSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url) {
    throw new Error(
      "Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL (set in Vercel env; use SUPABASE_URL for server routes)."
    );
  }

  if (serviceKey) {
    const cacheKey = `${url}\0${serviceKey}`;
    if (!_serviceClientCache || _serviceClientCache.cacheKey !== cacheKey) {
      _serviceClientCache = {
        cacheKey,
        client: createClient(url, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        }),
      };
    }
    return _serviceClientCache.client;
  }

  if (!anon) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. Add it in Vercel (Project → Settings → Environment Variables), or set SUPABASE_SERVICE_ROLE_KEY instead."
    );
  }

  const cookieStore = cookies();
  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          /* Route handlers may be read-only for Set-Cookie */
        }
      },
    },
  });
}
