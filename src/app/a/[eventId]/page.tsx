'use client';
import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, CheckCircle2, Clock, HeartPulse, Megaphone, PackageSearch, Newspaper, ShieldAlert, TriangleAlert } from 'lucide-react';
import { useAttendee } from '@/lib/attendee';
import { cn } from '@/lib/utils';
import { EventCover } from '@/components/common/visual';
import { EmptyState, PersonAvatar } from '@/components/common/kit';
import { PhaseBadge, eventPhase, eventWhen } from '@/components/common/EventBits';
import { categoryLabel } from '@/components/common/complaint';
import { ago } from '@/components/dashboard/LiveFeed';

interface Item { id: string; at: number; kind: 'announcement' | 'report'; title: string; body: string; urgent?: boolean; tone?: 'good' | 'info' }

function countdown(startISO: string, now: Date): string {
  const mins = Math.round((Date.parse(startISO) - now.getTime()) / 60_000);
  if (mins <= 0) return '';
  if (mins < 60) return `Starts in ${mins} min`;
  if (mins < 48 * 60) return `Starts in ${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `Starts in ${Math.round(mins / 1440)} days`;
}

const dayFmt = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'short' });
function dayLabel(at: number, now: Date): string {
  const d = dayFmt.format(new Date(at));
  if (d === dayFmt.format(now)) return 'Today';
  if (d === dayFmt.format(new Date(now.getTime() - 86_400_000))) return 'Yesterday';
  return d;
}

const QUICK = [
  { type: 'medical', label: 'Medical help', hint: 'Urgent', icon: HeartPulse, cls: 'bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/25' },
  { type: 'safety', label: 'Safety concern', hint: 'Urgent', icon: ShieldAlert, cls: 'bg-orange-500/10 text-orange-600 dark:text-orange-300 border-orange-500/25' },
  { type: 'facilities', label: 'Report a problem', hint: 'Facilities, food, crowd', icon: TriangleAlert, cls: 'bg-primary/10 text-primary border-primary/25' },
  { type: 'lost_found', label: 'Lost and found', hint: 'Lost or found something', icon: PackageSearch, cls: 'bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/25' },
] as const;

/** Attendee home: live status, one-tap alerts, and everything the organizers announced. */
export default function AttendeeUpdates() {
  const { event, announcements, complaints, now, markSeen, eventId, identity } = useAttendee();

  useEffect(() => { const t = setTimeout(markSeen, 1500); return () => clearTimeout(t); }, [markSeen, announcements.length]);

  const items = useMemo<Item[]>(() => [
    ...announcements.map((a): Item => ({ id: `a${a.id}`, at: Date.parse(a.created_at), kind: 'announcement', title: a.title, body: a.body, urgent: a.urgent })),
    ...complaints.filter((c) => c.status !== 'open').map((c): Item => ({
      id: `c${c.id}`, at: Date.parse(c.updated_at), kind: 'report', tone: c.status === 'resolved' ? 'good' : 'info',
      title: c.status === 'resolved' ? `Your ${categoryLabel(c.category).toLowerCase()} report was resolved` : `The organizers are looking into your ${categoryLabel(c.category).toLowerCase()} report`,
      body: c.response ?? 'We will update you here as soon as there is news.',
    })),
  ].sort((a, b) => b.at - a.at), [announcements, complaints]);

  const pinned = items.filter((i) => i.urgent).slice(0, 2);
  const groups = useMemo(() => {
    const g: { label: string; items: Item[] }[] = [];
    for (const it of items) {
      const label = dayLabel(it.at, now);
      const last = g[g.length - 1];
      if (last && last.label === label) last.items.push(it);
      else g.push({ label, items: [it] });
    }
    return g;
  }, [items, now]);

  if (!event || !identity) return null;
  const phase = eventPhase(event);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Hi {identity.name}</p>
        <h1 className="text-[22px] font-semibold leading-tight tracking-tight">{phase === 'live' ? 'The event is on' : phase === 'upcoming' ? 'Get ready' : 'Thanks for coming'}</h1>
      </div>

      <EventCover event={event} className="rounded-3xl shadow-card">
        <div className="flex min-h-40 flex-col justify-end gap-1.5 p-4 text-white">
          <PhaseBadge event={event} onCover />
          <h2 className="text-xl font-semibold leading-tight tracking-tight text-balance">{event.name}</h2>
          <p className="text-sm text-white/80">{eventWhen(event)}</p>
          {phase === 'upcoming' && <p className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium backdrop-blur"><Clock className="size-3" />{countdown(event.starts_at, now)}</p>}
        </div>
      </EventCover>

      {pinned.length > 0 && (
        <section className="space-y-2.5">
          {pinned.map((p) => (
            <div key={p.id} className="flex gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300"><BellRing className="size-4" /></span>
              <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Urgent from the organizers</p><p className="mt-0.5 font-medium leading-snug">{p.title}</p><p className="mt-0.5 text-sm text-muted-foreground">{p.body}</p></div>
            </div>
          ))}
        </section>
      )}

      <section>
        <h2 className="mb-2.5 text-sm font-semibold">Need something?</h2>
        <div className="grid grid-cols-2 gap-3">
          {QUICK.map((q) => (
            <Link key={q.type} href={`/a/${eventId}/complaints/new?type=${q.type}`} className={cn('flex flex-col gap-2 rounded-2xl border p-3.5 transition-transform active:scale-[0.98]', q.cls)}>
              <q.icon className="size-5" />
              <span><span className="block text-sm font-semibold leading-tight text-foreground">{q.label}</span><span className="text-[11px] text-muted-foreground">{q.hint}</span></span>
            </Link>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Sent as <span className="font-medium text-foreground">{identity.name}</span>. The organizers see this name.</p>
      </section>

      <section>
        <h2 className="mb-2.5 text-sm font-semibold">Latest from the organizers</h2>
        {items.length === 0 ? (
          <EmptyState icon={Newspaper} title="Nothing yet" description="Announcements and alerts show up here the moment the organizers send them. You will also get a pop-up." />
        ) : (
          <div className="space-y-5">
            {groups.map((g) => (
              <div key={g.label}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.label}</p>
                <ul className="space-y-2.5">
                  <AnimatePresence initial={false}>
                    {g.items.map((it) => (
                      <motion.li key={it.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                        className={cn('surface flex gap-3 p-3.5', it.urgent && 'border-amber-500/40', it.tone === 'good' && 'border-covered/30')}>
                        {it.kind === 'announcement'
                          ? <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', it.urgent ? 'bg-amber-500/15 text-amber-600' : 'bg-primary/10 text-primary')}>{it.urgent ? <BellRing className="size-4" /> : <Megaphone className="size-4" />}</span>
                          : <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', it.tone === 'good' ? 'bg-covered/15 text-covered' : 'bg-info/15 text-info')}>{it.tone === 'good' ? <CheckCircle2 className="size-4" /> : <PersonAvatar name={identity.name} size="sm" />}</span>}
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-semibold leading-snug">{it.title}</p>
                          <p className="mt-0.5 text-sm text-muted-foreground">{it.body}</p>
                          <p className="mt-1.5 text-[11px] text-muted-foreground tabular">{ago(now.getTime() - it.at)}</p>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
