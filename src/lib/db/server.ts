// Server-only client (secret key). Use ONLY in route handlers and the seed script.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function serverClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  return createClient(url, key, { auth: { persistSession: false } });
}
