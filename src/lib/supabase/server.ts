import { cookies } from "next/headers";
import {
  createMiddlewareClient as createMiddlewareClientSSR,
  createRouteHandlerClient as createRouteHandlerClientSSR,
  createServerClient as createServerClientSSR,
} from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import type { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export function createServerClient() {
  const cookieStore = cookies();
  return createServerClientSSR<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
    },
  });
}

export function createRouteClient() {
  const cookieStore = cookies();
  return createRouteHandlerClientSSR<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: () => cookieStore,
  });
}

export function createMiddlewareClientForRequest(
  req: NextRequest,
  res: NextResponse,
) {
  return createMiddlewareClientSSR<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set(name: string, value: string, options?: any) {
        res.cookies.set(name, value, options);
      },
      remove(name: string, options?: any) {
        res.cookies.delete(name);
      },
    },
  });
}

