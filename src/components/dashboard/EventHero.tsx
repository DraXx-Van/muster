'use client';
import Link from 'next/link';
import { CalendarDays, MapPin, Megaphone, QrCode, Sparkles, Ticket, UserPlus, Users } from 'lucide-react';
import type { EventRow } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { EventCover } from '@/components/common/visual';
import { PhaseBadge, eventWhen } from '@/components/common/EventBits';

function Ring({ pct, size = 84 }: { pct: number; size?: number }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const tone = pct >= 95 ? 'var(--covered)' : pct >= 70 ? 'var(--partial)' : 'var(--gap)';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${Math.round(pct)} percent of seats covered`}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, pct / 100))} style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s' }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold tabular">{Math.round(pct)}%</span>
    </div>
  );
}

/** Top of the dashboard: event cover, who is involved, and how ready the crew is. */
export function EventHero({ event, eventId, coverage, filled, required, volunteers, attendees, hasAssignments }: {
  event: EventRow; eventId: string; coverage: number; filled: number; required: number; volunteers: number; attendees: number; hasAssignments: boolean;
}) {
  const open = Math.max(0, required - filled);
  return (
    <EventCover event={event} className="rounded-3xl shadow-card">
      <div className="flex flex-wrap items-end justify-between gap-6 p-6 pt-24 text-white sm:p-8 sm:pt-28">
        <div className="min-w-0 max-w-xl">
          <PhaseBadge event={event} onCover />
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl">{event.name}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/85">
            <span className="flex items-center gap-1.5"><CalendarDays className="size-4" />{eventWhen(event)}</span>
            {event.venue && <span className="flex items-center gap-1.5"><MapPin className="size-4" />{event.venue}</span>}
          </p>
          <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/90">
            <span className="flex items-center gap-1.5"><Users className="size-4" /><span className="font-semibold tabular">{volunteers}</span> {volunteers === 1 ? 'volunteer' : 'volunteers'}</span>
            <span className="flex items-center gap-1.5"><Ticket className="size-4" /><span className="font-semibold tabular">{attendees}</span> {attendees === 1 ? 'attendee' : 'attendees'} joined</span>
          </p>
        </div>

        <div className="flex w-full items-center gap-4 rounded-2xl bg-background/95 p-4 text-foreground shadow-pop backdrop-blur sm:w-auto sm:min-w-80">
          <Ring pct={coverage} />
          <div className="min-w-0">
            <p className="text-sm font-semibold">Crew readiness</p>
            <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
              {required === 0 ? 'Add shifts in Event setup to start planning.' : !hasAssignments ? 'Nobody is scheduled yet.' : open === 0 ? 'Every seat is covered.' : `${open} ${open === 1 ? 'seat is' : 'seats are'} still open.`}
            </p>
            <Link href={`/e/${eventId}/assignments`} className="mt-2 inline-block"><Button size="sm"><Sparkles /> {hasAssignments ? 'Open assignments' : 'Auto-assign crew'}</Button></Link>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-white/15 bg-black/20 px-6 py-3 backdrop-blur sm:px-8">
        {[
          { href: `/e/${eventId}/announcements`, icon: Megaphone, label: 'Send announcement' },
          { href: `/e/${eventId}/qr`, icon: QrCode, label: 'Attendee QR poster' },
          { href: `/e/${eventId}/volunteers`, icon: UserPlus, label: 'Add volunteers' },
        ].map((a) => (
          <Link key={a.href} href={a.href} className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/25"><a.icon className="size-4" />{a.label}</Link>
        ))}
      </div>
    </EventCover>
  );
}
