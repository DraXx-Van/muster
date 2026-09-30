// Browser-safe Supabase client (publishable key). Never import server.ts from client code.
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'missing-key',
  { realtime: { params: { eventsPerSecond: 20 } } },
);
