import { createClient } from '@supabase/supabase-js';

// Cast import.meta to any to allow access to .env property without specific Vite types
const env = (import.meta as any).env;

// Use provided URL as fallback or env var. 
// Note: Without a valid ANON_KEY, requests will fail, but the app will initialize.
const supabaseUrl = env?.VITE_SUPABASE_URL || 'https://qohhsadjijjgvzmsstsv.supabase.co';
const supabaseAnonKey = env?.VITE_SUPABASE_ANON_KEY || 'placeholder-key-to-prevent-crash';

if (!env?.VITE_SUPABASE_URL || !env?.VITE_SUPABASE_ANON_KEY) {
  console.warn('Supabase credentials missing. App running with placeholders.');
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);