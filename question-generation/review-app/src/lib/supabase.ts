import { cookies } from "next/headers";
import {
  createServerClient as createServerClientSSR,
} from "@supabase/ssr";

function getSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[Supabase] Missing environment variables:", {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
    });
    throw new Error(
      `Missing Supabase environment variables. URL: ${supabaseUrl ? 'set' : 'missing'}, Key: ${supabaseAnonKey ? 'set' : 'missing'}`
    );
  }

  return { supabaseUrl, supabaseAnonKey };
}

export function createServerClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  
  try {
    const cookieStore = cookies();
    return createServerClientSSR(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options?: any) {
          try {
            cookieStore.set(name, value, options);
          } catch (error) {
            // Cookie setting failed - this can happen in Server Components during initial render
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
    console.warn("[Supabase] cookies() unavailable, using fallback client:", error);
    return createServerClientSSR(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    });
  }
}





