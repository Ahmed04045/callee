// src/lib/supabaseClient.js
//
// Single Supabase client instance for the whole app. Reads config from Vite
// env vars — see .env.example. Never hardcode these values; the anon key is
// safe to expose in a browser bundle (it's designed to be public and is
// constrained by Row Level Security policies), but keep it in .env.local
// out of version control anyway so it's easy to rotate per-environment.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fails loudly in dev instead of silently returning empty data everywhere.
  console.error(
    '[Supabase] Missing VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env.local and fill in your project values.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
