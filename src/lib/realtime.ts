'use client';
// useRealtime(table, handler): subscribe to row changes. Always pair with SWR polling as a fallback (see useSnapshot).
import { useEffect, useRef } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from './db/client';

export type RealtimeEvent<T = Record<string, unknown>> = {
  table: string;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  row: T;
  old: Partial<T>;
};

export function useRealtime<T = Record<string, unknown>>(table: string, handler: (e: RealtimeEvent<T>) => void) {
  const ref = useRef(handler);
  useEffect(() => { ref.current = handler; });

  useEffect(() => {
    const channel = supabase
      .channel(`rt-${table}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, (p: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        ref.current({ table, type: p.eventType, row: p.new as T, old: p.old as Partial<T> });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [table]);
}
