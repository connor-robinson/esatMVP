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

export function createSupabaseBrowserClient(): SupabaseClient<Database> {
  return createSSRBrowserClient<Database>(supabaseUrl!, supabaseAnonKey!) as any as SupabaseClient<Database>;
}

export function useBrowserSupabaseClient() {
  return useMemo(() => createSupabaseBrowserClient(), []);
}

