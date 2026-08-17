import { cookies } from "next/headers";
import {
  createServerClient as createServerClientSSR,
} from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import type { Database } from "./types";

function getSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      `Missing Supabase environment variables. URL: ${supabaseUrl ? 'set' : 'missing'}, Key: ${supabaseAnonKey ? 'set' : 'missing'}`
    );
  }

  return { supabaseUrl, supabaseAnonKey };
}

export function createServerClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  
  // During build time, cookies() is not available, so we need to handle this gracefully
  try {
    const cookieStore = cookies();
    return createServerClientSSR<Database>(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options?: any) {
          try {
            cookieStore.set(name, value, options);
          } catch (error) {
            // Cookie setting failed - this can happen in Server Components during initial render
            // The session will still be read-only which is fine for most use cases
          }
        },
        remove(name: string, options?: any) {
          try {
            cookieStore.delete(name);
          } catch (error) {
            // Cookie deletion failed - this is non-critical
          }
        },
      },
    });
  } catch (error) {
    // If cookies() fails (e.g., during build), create a client without cookie handling
    // This will only work for read operations during build
    return createServerClientSSR<Database>(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    });
  }
}

// Alias for route handlers - uses the same server client
export function createRouteClient() {
  return createServerClient();
}

/** Cookie-aware client for auth callback / confirm redirects. */
export function createCallbackClient(request: NextRequest, response: NextResponse) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  return createServerClientSSR<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}


