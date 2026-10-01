'use client';
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import type { EventRow } from '@/lib/types';
import { cn } from '@/lib/utils';

const dateFmt = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });

export const eventWhen = (e: Pick<EventRow, 'starts_at' | 'ends_at'>) =>
  `${dateFmt.format(new Date(e.starts_at))} · ${timeFmt.format(new Date(e.starts_at))}-${timeFmt.format(new Date(e.ends_at))}`;

export type EventPhase = 'upcoming' | 'live' | 'ended';
export function eventPhase(e: Pick<EventRow, 'starts_at' | 'ends_at' | 'clock_offset_minutes'>, real: Date = new Date()): EventPhase {
  const t = real.getTime() + e.clock_offset_minutes * 60_000;
  if (t < Date.parse(e.starts_at)) return 'upcoming';
  return t <= Date.parse(e.ends_at) ? 'live' : 'ended';
}

const PHASE = {
  upcoming: { label: 'Upcoming', cls: 'bg-info/15 text-info' },
  live: { label: 'Live now', cls: 'bg-covered/15 text-covered' },
  ended: { label: 'Ended', cls: 'bg-muted text-muted-foreground' },
} as const;

/** onCover: readable on top of the event cover image (white on a dark glass pill). */
export function PhaseBadge({ event, onCover = false }: { event: Pick<EventRow, 'starts_at' | 'ends_at' | 'clock_offset_minutes'>; onCover?: boolean }) {
  const phase = eventPhase(event);
  const p = PHASE[phase];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', onCover ? 'bg-black/30 text-white backdrop-blur' : p.cls)}>
      {phase === 'live' && <span className={cn('size-1.5 animate-pulse rounded-full', onCover ? 'bg-emerald-300' : 'bg-covered')} />}{p.label}
    </span>
  );
}

/** Join code with a copy button. */
export function JoinCode({ code, className }: { code: string; className?: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setDone(true); toast.success('Join code copied'); setTimeout(() => setDone(false), 1500); }
    catch { toast.error('Could not copy. Select the code and copy it by hand.'); }
  };
  return (
    <button type="button" onClick={copy} title="Copy join code" className={cn('inline-flex items-center gap-2 rounded-lg border bg-background/60 px-2.5 py-1 font-mono text-sm font-semibold tracking-[0.2em] transition-colors hover:border-primary/50', className)}>
      {code}{done ? <Check className="size-3.5 text-covered" /> : <Copy className="size-3.5 text-muted-foreground" />}
    </button>
  );
}
