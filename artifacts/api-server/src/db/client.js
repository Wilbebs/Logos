import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
// Service role key bypasses RLS — required for server-side storage uploads.
// Set SUPABASE_SERVICE_ROLE_KEY in Railway env vars (Settings → Variables).
// Find it in: Supabase Dashboard → Project Settings → API → service_role key.
const serviceRoleKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[db] WARNING: SUPABASE_URL or SUPABASE_ANON_KEY not set — database calls will fail.');
}

// Default client (anon key) — used for all DB queries
const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

// Admin client (service role) — used for storage uploads that bypass RLS.
// Falls back to anon client if key not configured (uploads will fail with RLS error).
export const supabaseAdmin = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : supabase;

export default supabase;
