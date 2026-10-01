'use client';
// Data for the attendee app. Attendees have no account: their identity is the { id, token } kept on their device.
// They only ever see public things: event info, zones, announcements meant for them, and their own complaints.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { supabase } from './db/client';
import { getEvent, listAttendeeAnnouncements, listComplaintsByAttendee } from './db/queries';
import { useIdentity, type AttendeeIdentity } from './attendeeIdentity';
import { useRealtime } from './realtime';
import type { Announcement, Complaint, EventRow, Zone } from './types';

interface Ctx {
  eventId: string;
  identity: AttendeeIdentity | undefined;
  event: EventRow | null | undefined;
  zones: Zone[];
  announcements: Announcement[];
  complaints: Complaint[];
  joined: boolean | undefined; // false: this device is not (or no longer) registered for the event
  error: Error | undefined;
  refresh: () => Promise<unknown>;
  unread: number;
  markSeen: () => void;
  now: Date;
}

const AttCtx = createContext<Ctx | null>(null);
export const useAttendee = (): Ctx => {
  const c = useContext(AttCtx);
  if (!c) throw new Error('useAttendee must be used inside <AttendeeProvider>');
  return c;
};

const seenKey = (eventId: string, id: string) => `crewpulse.seen.${eventId}.${id}`;

export function AttendeeProvider({ eventId, children }: { eventId: string; children: ReactNode }) {
  const identity = useIdentity(eventId);
  const aid = identity?.id;
  const { data, error, mutate } = useSWR(
    aid ? ['attendee', eventId, aid] : null,
    async () => {
      const [event, announcements, complaints, zones, member] = await Promise.all([
        getEvent(eventId),
        listAttendeeAnnouncements(eventId),
        listComplaintsByAttendee(eventId, aid!),
        supabase.from('zones').select('*').eq('event_id', eventId).order('name').then((r) => (r.data ?? []) as Zone[]),
        supabase.from('attendees').select('id').eq('id', aid!).eq('event_id', eventId).maybeSingle().then((r) => !!r.data),
      ]);
      return { event, announcements, complaints, zones, member };
    },
    { refreshInterval: 4000, shouldRetryOnError: false },
  );

  // relative times ("2 min ago") tick without re-fetching
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);

  // "last seen" lives in localStorage; a version counter re-reads it after markSeen()
  const [seenVersion, setSeenVersion] = useState(0);
  const seenAt = useMemo(() => {
    void seenVersion;
    if (!aid || typeof window === 'undefined') return 0;
    try { return Number(localStorage.getItem(seenKey(eventId, aid)) ?? 0); } catch { return 0; }
  }, [eventId, aid, seenVersion]);
  const markSeen = useCallback(() => {
    if (!aid) return;
    try { localStorage.setItem(seenKey(eventId, aid), String(Date.now())); } catch { /* storage blocked */ }
    setSeenVersion((v) => v + 1);
  }, [eventId, aid]);

  const filter = `event_id=eq.${eventId}`;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bump = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void mutate(); }, 120);
  }, [mutate]);

  // live: a new announcement pops up as a toast, and so does progress on your own complaints
  useRealtime<Announcement>('announcements', (e) => {
    bump();
    if (e.type === 'INSERT' && (e.row.audience === 'all' || e.row.audience === 'attendees')) {
      (e.row.urgent ? toast.warning : toast)(e.row.title, { description: e.row.body, duration: 8000 });
    }
  }, filter);
  useRealtime<Complaint>('complaints', (e) => {
    bump();
    if (e.type === 'UPDATE' && e.row.attendee_id === aid) {
      toast(e.row.status === 'resolved' ? 'Your report was resolved' : 'The organizers are looking into your report', { description: e.row.response ?? undefined, duration: 8000 });
    }
  }, filter);

  const announcements = useMemo(() => data?.announcements ?? [], [data]);
  const unread = announcements.filter((a) => new Date(a.created_at).getTime() > seenAt).length;

  const value = useMemo<Ctx>(() => ({
    eventId, identity, event: data?.event, zones: data?.zones ?? [], announcements, complaints: data?.complaints ?? [],
    joined: identity ? data?.member : false, error: error as Error | undefined, refresh: () => mutate(), unread, markSeen, now,
  }), [eventId, identity, data, announcements, error, mutate, unread, markSeen, now]);
  return <AttCtx.Provider value={value}>{children}</AttCtx.Provider>;
}
