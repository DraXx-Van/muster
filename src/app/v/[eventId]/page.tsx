'use client';
import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarX2, CheckCircle2, ChevronRight, Clock, Flag, Loader2, LogIn, LogOut, Play, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '@/lib/data';
import { setAssignmentStatus, updateTaskStatus } from '@/lib/db/queries';
import { hoursByVolunteer, inCheckWindow } from '@/lib/derive';
import { fmtRange, fmtTime, isActiveStatus } from '@/lib/engine';
import { ms } from '@/lib/engine/time';
import type { Assignment, Shift } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EmptyState, PersonAvatar } from '@/components/common/kit';
import { ZoneIcon } from '@/components/common/visual';

function relative(mins: number): string {
  const m = Math.abs(Math.round(mins));
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`;
}

export default function VolunteerHome() {
  const { snap, refresh, now, me: self, eventId } = useData();
  const me = self?.id;
  const [busy, setBusy] = useState(false);
  if (!snap || !me || !self) return null;

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
  const worked = hours?.live ?? 0;
  const scheduled = hours?.scheduled ?? 0;

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
      <div className="flex items-center gap-3.5">
        <PersonAvatar name={self.name} src={self.avatar_url} size="lg" />
        <div className="min-w-0"><p className="text-sm text-muted-foreground">Hi {self.name.split(' ')[0]}</p><h1 className="text-[22px] font-semibold leading-tight tracking-tight">{current ? (current.a.status === 'checked_in' ? 'You are on shift' : 'Your next shift') : 'Your shifts'}</h1></div>
      </div>

      {self.skills.length === 0 && (
        <Link href={`/v/${eventId}/profile`} className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-3.5 transition-colors hover:bg-primary/10">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary"><UserRound className="size-5" /></span>
          <span className="flex-1"><span className="block text-sm font-semibold">Finish your profile</span><span className="text-xs text-muted-foreground">Add your skills and when you are free, so you can be given a shift.</span></span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      )}

      {dropped > 0 && <p className="rounded-2xl border border-partial/30 bg-partial/10 p-3 text-[13px] text-partial">{dropped} of your shifts {dropped === 1 ? 'was' : 'were'} released. Thanks for letting us know.</p>}

      {!current ? (
        <EmptyState icon={CalendarX2} title="No shifts yet" description="Make sure your skills and availability are filled in. You get an alert the moment a coordinator assigns you." />
      ) : (
        <CurrentShift key={current.a.id} a={current.a} s={current.s} zoneName={zone?.name ?? ''} color={zone?.color ?? '#6366f1'} now={now} busy={busy} onAct={act} />
      )}

      <div className="surface p-4">
        <div className="flex items-end justify-between"><p className="text-sm font-semibold">Your hours</p><p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground tabular">{worked.toFixed(1)}h</span> of <span className="tabular">{scheduled.toFixed(1)}h</span> scheduled</p></div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${scheduled ? Math.min(100, (worked / scheduled) * 100) : 0}%` }} /></div>
        <p className="mt-2 text-xs text-muted-foreground">{worked > 0 ? ((hours?.running ?? 0) > 0 ? 'Counting while you are on shift.' : 'Hours from completed shifts.') : 'Hours start counting when you check in.'}</p>
      </div>

      {zone && tasks.length > 0 && (
        <section>
          <h2 className="mb-2.5 text-sm font-semibold">Tasks in {zone.name}</h2>
          <ul className="space-y-2.5">
            <AnimatePresence initial={false}>
              {tasks.map((task) => (
                <motion.li key={task.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="surface flex items-center gap-3 p-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug">{task.title}</p>
                    <p className="mt-0.5 text-xs capitalize text-muted-foreground">{task.status.replace('_', ' ')} · {task.priority} priority</p>
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

      {rest.length > 0 && (
        <section>
          <h2 className="mb-2.5 text-sm font-semibold">Your other shifts</h2>
          <ul className="space-y-2.5">
            {rest.map(({ a, s }) => {
              const z = snap.zones.find((x) => x.id === s.zone_id);
              return (
                <li key={a.id} className={cn('surface flex items-center gap-3 p-3.5', a.status === 'completed' && 'opacity-60')}>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: z?.color }}><ZoneIcon name={z?.name ?? ''} className="size-[18px]" /></span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{z?.name}</p><p className="text-xs text-muted-foreground">{s.role_name} · <span className="tabular">{fmtRange(s)}</span></p></div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{a.status === 'completed' ? 'Done' : 'Upcoming'}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <Link href={`/v/${eventId}/issue`} className="flex items-center gap-3 rounded-2xl border border-gap/25 bg-gap/5 p-3.5 transition-colors hover:bg-gap/10">
        <span className="flex size-10 items-center justify-center rounded-xl bg-gap/12 text-gap"><Flag className="size-5" /></span>
        <span className="flex-1"><span className="block text-sm font-semibold">Something wrong?</span><span className="text-xs text-muted-foreground">Report a medical, crowd or equipment issue</span></span>
        <ChevronRight className="size-4 text-muted-foreground" />
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
      <div className="relative p-4 text-white" style={{ backgroundImage: `linear-gradient(135deg, ${color}, color-mix(in oklch, ${color} 60%, black))` }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur"><ZoneIcon name={zoneName} className="size-5" /></span>
            <div><h2 className="text-xl font-semibold leading-tight tracking-tight">{zoneName}</h2><p className="text-sm text-white/85">{s.role_name}</p></div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium tabular backdrop-blur"><Clock className="size-3" />{phase}</span>
        </div>
        <p className="mt-4 text-3xl font-semibold tracking-tight tabular">{fmtTime(s.starts_at)}<span className="mx-2 text-lg font-normal text-white/70">to</span>{fmtTime(s.ends_at)}</p>
      </div>
      <div className="p-4">
        {a.reason && <p className="mb-3 line-clamp-2 text-[13px] text-muted-foreground">Why you: {a.reason.split('; ').slice(0, 2).join(', ')}</p>}
        {checkedIn ? (
          <Button size="lg" variant="outline" className="h-14 w-full text-base" disabled={busy} onClick={() => onAct(a, 'completed')}>{busy ? <Loader2 className="animate-spin" /> : <LogOut />} Check out</Button>
        ) : (
          <Button size="lg" className="h-14 w-full text-base" disabled={busy || !inWindow} onClick={() => onAct(a, 'checked_in')}>{busy ? <Loader2 className="animate-spin" /> : <LogIn />} Check in</Button>
        )}
        {!checkedIn && !inWindow && <p className="mt-2.5 text-center text-xs text-muted-foreground">Check-in opens 15 minutes before your shift ({fmtTime(new Date(ms(s.starts_at) - 15 * 60_000).toISOString())}).</p>}
      </div>
    </motion.section>
  );
}
