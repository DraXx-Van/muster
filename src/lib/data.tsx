'use client';
// One shared snapshot for the whole app: SWR (3 s polling fallback) + realtime invalidation + demo clock + live feed.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import useSWR from 'swr';
import { getSnapshot } from './db/queries';
import { useRealtime } from './realtime';
import { useEventClock } from './clock';
import { fmtRange } from './engine';
import type { Announcement, Assignment, Issue, Snapshot, Task } from './types';

export type FeedTone = 'info' | 'good' | 'warn' | 'bad';
export interface FeedItem { id: string; at: number; tone: FeedTone; text: string; kind: 'checkin' | 'drop' | 'issue' | 'announce' | 'task' | 'assign' }

interface Ctx {
  snap: Snapshot | undefined;
  error: Error | undefined;
  isLoading: boolean;
  refresh: () => Promise<unknown>;
  now: Date;          // demo-clock time
  real: Date;         // wall-clock time (issue deadlines)
  offsetMinutes: number;
  feed: FeedItem[];
}

const DataCtx = createContext<Ctx | null>(null);
export const useData = (): Ctx => {
  const c = useContext(DataCtx);
  if (!c) throw new Error('useData must be used inside <DataProvider>');
  return c;
};

export function DataProvider({ children }: { children: ReactNode }) {
  const { data, error, isLoading, mutate } = useSWR<Snapshot>('snapshot', () => getSnapshot(), {
    refreshInterval: 3000, keepPreviousData: true, revalidateOnFocus: true,
  });
  const { now, real, offsetMinutes } = useEventClock(data?.event);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const snapRef = useRef<Snapshot | undefined>(undefined);
  useEffect(() => { snapRef.current = data; }, [data]);

  // debounce bursts of realtime events into one refetch
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bump = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void mutate(); }, 120);
  }, [mutate]);

  const push = useCallback((item: Omit<FeedItem, 'id' | 'at'>) => {
    setFeed((f) => [{ ...item, id: Math.random().toString(36).slice(2), at: Date.now() }, ...f].slice(0, 40));
  }, []);

  // seed the feed once from existing data so the dashboard is never empty on first load
  const seeded = useRef(false);
  useEffect(() => {
    if (!data || seeded.current) return;
    seeded.current = true;
    const items: FeedItem[] = [
      ...data.issues.slice(0, 4).map((i): FeedItem => ({ id: `i${i.id}`, at: new Date(i.created_at).getTime(), tone: i.severity === 'critical' || i.severity === 'high' ? 'bad' : 'warn', kind: 'issue', text: `${i.severity} ${i.category.replace('_', ' ')} raised in ${data.zones.find((z) => z.id === i.zone_id)?.name ?? 'the venue'}` })),
      ...data.announcements.slice(0, 3).map((a): FeedItem => ({ id: `a${a.id}`, at: new Date(a.created_at).getTime(), tone: a.urgent ? 'warn' : 'info', kind: 'announce', text: `Announcement: ${a.title}` })),
    ].sort((a, b) => b.at - a.at);
    setFeed(items);
  }, [data]);

  useRealtime<Assignment>('assignments', (e) => {
    bump();
    const s = snapRef.current;
    if (!s || e.type === 'DELETE') return;
    const shift = s.shifts.find((x) => x.id === e.row.shift_id);
    const zone = s.zones.find((z) => z.id === shift?.zone_id)?.name ?? 'a zone';
    const who = s.volunteers.find((v) => v.id === e.row.volunteer_id)?.name ?? 'A volunteer';
    const when = shift ? ` (${fmtRange(shift)})` : '';
    if (e.type === 'INSERT') push({ tone: 'info', kind: 'assign', text: `${who} assigned to ${zone}${when}` });
    else if (e.row.status === 'checked_in') push({ tone: 'good', kind: 'checkin', text: `${who} checked in at ${zone}` });
    else if (e.row.status === 'completed') push({ tone: 'info', kind: 'checkin', text: `${who} checked out of ${zone}` });
    else if (e.row.status === 'dropped') push({ tone: 'bad', kind: 'drop', text: `${who} dropped out of ${zone}${when}` });
    else if (e.row.status === 'no_show') push({ tone: 'bad', kind: 'drop', text: `${who} is a no-show at ${zone}${when}` });
    else push({ tone: 'info', kind: 'assign', text: `${who} moved to ${zone}${when}` });
  });
  useRealtime<Issue>('issues', (e) => {
    bump();
    const s = snapRef.current;
    if (!s || e.type === 'DELETE') return;
    const zone = s.zones.find((z) => z.id === e.row.zone_id)?.name ?? 'the venue';
    const cat = (e.row.category ?? 'issue').replace('_', ' ');
    if (e.type === 'INSERT') push({ tone: e.row.severity === 'critical' || e.row.severity === 'high' ? 'bad' : 'warn', kind: 'issue', text: `New ${e.row.severity} ${cat} issue in ${zone}` });
    else if (e.row.status === 'acknowledged') push({ tone: 'good', kind: 'issue', text: `${cat} issue in ${zone} acknowledged` });
    else if (e.row.status === 'resolved') push({ tone: 'good', kind: 'issue', text: `${cat} issue in ${zone} resolved` });
    else if (e.row.escalation_level > 0) push({ tone: 'bad', kind: 'issue', text: `${cat} issue in ${zone} escalated to level ${e.row.escalation_level}` });
  });
  useRealtime<Announcement>('announcements', (e) => {
    bump();
    if (e.type === 'INSERT') push({ tone: e.row.urgent ? 'warn' : 'info', kind: 'announce', text: `Announcement: ${e.row.title}` });
  });
  useRealtime<Task>('tasks', (e) => {
    bump();
    if (e.type === 'UPDATE') push({ tone: 'info', kind: 'task', text: `Task "${e.row.title}" is now ${e.row.status.replace('_', ' ')}` });
  });
  useRealtime('shifts', bump);
  useRealtime('notifications', bump);

  const value = useMemo<Ctx>(
    () => ({ snap: data, error: error as Error | undefined, isLoading, refresh: () => mutate(), now, real, offsetMinutes, feed }),
    [data, error, isLoading, mutate, now, real, offsetMinutes, feed],
  );
  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}
