"use client";

import { createBrowserClient as createSSRBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useMemo } from "react";
import type { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

let browserClient: SupabaseClient<Database> | undefined;

/**
 * Exactly one persistent browser auth client per JS realm.
 * Always prefer this (or useSupabaseClient) over constructing another client.
 */
export function createSupabaseBrowserClient(): SupabaseClient<Database> {
  if (browserClient) return browserClient;
  browserClient = createSSRBrowserClient<Database>(
    supabaseUrl!,
    supabaseAnonKey!,
  ) as any as SupabaseClient<Database>;
  return browserClient;
}

/** @internal test helper */
export function __resetSupabaseBrowserClientForTests() {
  browserClient = undefined;
}

export function useBrowserSupabaseClient() {
  return useMemo(() => createSupabaseBrowserClient(), []);
}
