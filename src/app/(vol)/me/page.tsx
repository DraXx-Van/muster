'use client';
import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarX2, CheckCircle2, Clock, Flag, Loader2, LogIn, LogOut, Play } from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '@/lib/data';
import { useSessionId } from '@/lib/session';
import { setAssignmentStatus, updateTaskStatus } from '@/lib/db/queries';
import { hoursByVolunteer, inCheckWindow } from '@/lib/derive';
import { fmtRange, fmtTime, isActiveStatus } from '@/lib/engine';
import { ms } from '@/lib/engine/time';
import type { Assignment, Shift } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CountUp, EmptyState } from '@/components/common/kit';

function relative(mins: number): string {
  const m = Math.abs(Math.round(mins));
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`;
}

export default function MeHome() {
  const { snap, refresh, now } = useData();
  const me = useSessionId();
  const [busy, setBusy] = useState(false);
  if (!snap || !me) return null;

  const shiftById = new Map(snap.shifts.map((s) => [s.id, s]));
  const mine = snap.assignments
    .filter((a) => a.volunteer_id === me && (isActiveStatus(a.status) || a.status === 'checked_in') && shiftById.has(a.shift_id))
    .map((a) => ({ a, s: shiftById.get(a.shift_id)! }))
    .sort((x, y) => x.s.starts_at.localeCompare(y.s.starts_at));
  const t = now.getTime();
  const pending = mine.filter(({ a, s }) => a.status !== 'completed' && ms(s.ends_at) + 15 * 60_000 >= t);
  const current = pending.find(({ a }) => a.status === 'checked_in') ?? pending.find(({ s }) => ms(s.starts_at) <= t && t < ms(s.ends_at)) ?? pending[0];
  const rest = mine.filter((x) => x !== current);
  const hours = hoursByVolunteer(snap, now).get(me);
  const dropped = snap.assignments.filter((a) => a.volunteer_id === me && (a.status === 'dropped' || a.status === 'no_show')).length;

  const zone = current ? snap.zones.find((z) => z.id === current.s.zone_id) : undefined;
  const tasks = zone ? snap.tasks.filter((x) => x.zone_id === zone.id && x.status !== 'resolved') : [];

  const act = async (a: Assignment, to: 'checked_in' | 'completed') => {
    setBusy(true);
    try {
      await setAssignmentStatus(a.id, to, now);
      toast.success(to === 'checked_in' ? 'You are checked in. Have a great shift!' : 'Checked out. Thank you!');
      await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not update your attendance'); }
    finally { setBusy(false); }
  };

  const advance = async (id: string, to: 'in_progress' | 'resolved') => {
    try { await updateTaskStatus(id, to); await refresh(); toast.success(to === 'resolved' ? 'Task done' : 'Task started'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not update the task'); }
  };

  return (
    <div className="space-y-5">
      {/* hours */}
      <div className="grid grid-cols-2 gap-3">
        <div className="surface p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Hours contributed</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight"><CountUp value={hours?.live ?? 0} decimals={1} suffix="h" /></p>
          <p className="text-xs text-muted-foreground">{(hours?.running ?? 0) > 0 ? 'Counting now' : 'From completed shifts'}</p>
        </div>
        <div className="surface p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Scheduled</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight"><CountUp value={hours?.scheduled ?? 0} decimals={1} suffix="h" /></p>
          <p className="text-xs text-muted-foreground">{mine.length} shift{mine.length === 1 ? '' : 's'} today</p>
        </div>
      </div>

      {dropped > 0 && <p className="rounded-lg border border-partial/30 bg-partial/10 p-3 text-xs text-partial">{dropped} of your shifts {dropped === 1 ? 'was' : 'were'} released. Thanks for letting us know.</p>}

      {/* current shift */}
      {!current ? (
        <EmptyState icon={CalendarX2} title="No shifts for you yet" description="A coordinator will assign you soon. You will get an alert the moment it happens." />
      ) : (
        <CurrentShift key={current.a.id} a={current.a} s={current.s} zoneName={zone?.name ?? ''} color={zone?.color ?? '#6366f1'} now={now} busy={busy} onAct={act} />
      )}

      {/* tasks in my zone */}
      {zone && tasks.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Tasks in {zone.name}</h2>
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {tasks.map((task) => (
                <motion.li key={task.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="surface flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{task.title}</p>
                    <p className="text-xs capitalize text-muted-foreground">{task.status.replace('_', ' ')} · {task.priority} priority</p>
                  </div>
                  {task.status === 'open'
                    ? <Button size="sm" variant="outline" onClick={() => advance(task.id, 'in_progress')}><Play /> Start</Button>
                    : <Button size="sm" onClick={() => advance(task.id, 'resolved')}><CheckCircle2 /> Done</Button>}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </section>
      )}

      {/* upcoming */}
      {rest.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Your other shifts</h2>
          <ul className="space-y-2">
            {rest.map(({ a, s }) => {
              const z = snap.zones.find((x) => x.id === s.zone_id);
              return (
                <li key={a.id} className={cn('surface flex items-center gap-3 p-3', a.status === 'completed' && 'opacity-60')}>
                  <span className="h-10 w-1 rounded-full" style={{ background: z?.color }} />
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium">{z?.name} · {s.role_name}</p><p className="text-xs text-muted-foreground tabular">{fmtRange(s)}</p></div>
                  <span className="text-[11px] capitalize text-muted-foreground">{a.status === 'completed' ? 'Done' : 'Upcoming'}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <Link href="/me/issue" className="flex items-center gap-3 rounded-xl border border-gap/30 bg-gap/5 p-3.5 text-sm transition-colors hover:bg-gap/10">
        <span className="flex size-9 items-center justify-center rounded-full bg-gap/15 text-gap"><Flag className="size-4" /></span>
        <span className="flex-1"><span className="block font-medium">Something wrong?</span><span className="text-xs text-muted-foreground">Report a medical, crowd or equipment issue</span></span>
      </Link>
    </div>
  );
}

function CurrentShift({ a, s, zoneName, color, now, busy, onAct }: { a: Assignment; s: Shift; zoneName: string; color: string; now: Date; busy: boolean; onAct: (a: Assignment, to: 'checked_in' | 'completed') => void }) {
  const t = now.getTime();
  const inWindow = inCheckWindow(s, now);
  const checkedIn = a.status === 'checked_in';
  const minsToStart = (ms(s.starts_at) - t) / 60_000;
  const minsToEnd = (ms(s.ends_at) - t) / 60_000;
  const phase = checkedIn ? `Ends in ${relative(minsToEnd)}` : minsToStart > 0 ? `Starts in ${relative(minsToStart)}` : minsToEnd > 0 ? `Started ${relative(minsToStart)} ago` : 'Shift has ended';
  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="surface overflow-hidden">
      <div className="h-1.5" style={{ background: color }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{checkedIn ? 'On shift now' : minsToStart > 0 ? 'Up next' : 'Current shift'}</p>
            <h2 className="mt-0.5 text-xl font-semibold tracking-tight">{zoneName}</h2>
            <p className="text-sm text-muted-foreground">{s.role_name}</p>
          </div>
          <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium tabular', checkedIn ? 'bg-covered/15 text-covered' : 'bg-info/15 text-info')}><Clock className="mr-1 inline size-3" />{phase}</span>
        </div>
        <p className="mt-3 text-2xl font-semibold tabular">{fmtTime(s.starts_at)}<span className="mx-1.5 text-muted-foreground">to</span>{fmtTime(s.ends_at)}</p>
        {a.reason && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{a.reason.split('; ').slice(0, 2).join(' · ')}</p>}

        {checkedIn ? (
          <Button size="lg" variant="outline" className="mt-4 h-14 w-full text-base" disabled={busy} onClick={() => onAct(a, 'completed')}>{busy ? <Loader2 className="animate-spin" /> : <LogOut />} Check out</Button>
        ) : (
          <Button size="lg" className="mt-4 h-14 w-full text-base" disabled={busy || !inWindow} onClick={() => onAct(a, 'checked_in')}>{busy ? <Loader2 className="animate-spin" /> : <LogIn />} Check in</Button>
        )}
        {!checkedIn && !inWindow && <p className="mt-2 text-center text-xs text-muted-foreground">Check-in opens 15 minutes before your shift ({fmtTime(new Date(ms(s.starts_at) - 15 * 60_000).toISOString())}).</p>}
      </div>
    </motion.section>
  );
}
