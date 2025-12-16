import { cookies } from "next/headers";
import {
  createServerClient as createServerClientSSR,
} from "@supabase/ssr";
import type { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export function createServerClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }
  const cookieStore = cookies();
  return createServerClientSSR<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options?: any) {
        cookieStore.set(name, value, options);
      },
      remove(name: string, options?: any) {
        cookieStore.delete(name);
      },
    },
  });
}

// Alias for route handlers - uses the same server client
export function createRouteClient() {
  return createServerClient();
}


