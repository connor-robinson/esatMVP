/**
 * Supabase client configuration
 * 
 * NOTE: For client components in Next.js, consider using the browser client from './browser' 
 * for better SSR compatibility. This client works but may have limitations in some contexts.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL environment variable. Please add it to your .env.local file.'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable. Please add it to your .env.local file.'
  );
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  throw new Error(
    `Invalid NEXT_PUBLIC_SUPABASE_URL format: "${supabaseUrl}". It should be a valid URL like "https://your-project.supabase.co"`
  );
}

// Create Supabase client with proper configuration for both client and server usage
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'x-client-info': 'no-calc-v3',
    },
  },
});

// Helper function to handle Supabase errors
export function handleSupabaseError(error: any) {
  console.error('Supabase error:', error);
  
  // Provide more helpful error messages
  if (error?.message?.includes('Failed to fetch') || error?.message?.includes('fetch')) {
    const troubleshooting = [
      `1. Check your NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl}`,
      `2. Verify your Supabase project is active (not paused)`,
      `3. Check your internet connection`,
      `4. Verify CORS settings in Supabase dashboard`,
      `5. Check browser console for detailed network errors`,
      `6. Ensure your Supabase project URL is correct`,
    ].join('\n');
    
    throw new Error(
      `Failed to connect to Supabase database.\n\n${troubleshooting}\n\nOriginal error: ${error.message}`
    );
  }
  
  throw new Error(error.message || 'Database operation failed');
}


