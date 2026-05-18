import { createClient } from '@supabase/supabase-js';

// Vite uses import.meta.env to access environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: supabaseUrl ? '✓' : '✗ VITE_SUPABASE_URL missing',
    key: supabaseAnonKey ? '✓' : '✗ VITE_SUPABASE_ANON_KEY missing'
  });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);