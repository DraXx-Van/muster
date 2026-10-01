'use client';
import { CalendarDays, MapPin, Share } from 'lucide-react';
import { useAttendee } from '@/lib/attendee';
import { EventCover, ZoneBadge } from '@/components/common/visual';
import { PhaseBadge, eventWhen } from '@/components/common/EventBits';
import { EmptyState } from '@/components/common/kit';

/** Event details and a venue map so attendees can find their way around. */
export default function AttendeeInfo() {
  const { event, zones } = useAttendee();
  if (!event) return null;
  return (
    <div className="space-y-5">
      <EventCover event={event} className="rounded-3xl shadow-card">
        <div className="flex min-h-32 flex-col justify-end gap-1.5 p-4 text-white"><PhaseBadge event={event} onCover /><h1 className="text-xl font-semibold leading-tight tracking-tight">{event.name}</h1></div>
      </EventCover>

      <section className="surface space-y-2.5 p-4">
        <p className="flex items-center gap-2 text-sm"><CalendarDays className="size-4 text-muted-foreground" />{eventWhen(event)}</p>
        {event.venue && <p className="flex items-center gap-2 text-sm"><MapPin className="size-4 text-muted-foreground" />{event.venue}</p>}
        {event.description && <p className="border-t pt-2.5 text-sm text-muted-foreground">{event.description}</p>}
      </section>

      <section>
        <h2 className="mb-2.5 text-sm font-semibold">Venue map</h2>
        {zones.length === 0 ? (
          <EmptyState icon={MapPin} title="No map yet" description="The organizers have not added the venue areas." className="py-8" />
        ) : (
          <>
            <div className="surface p-2.5">
              <svg viewBox="0 0 800 480" className="h-auto w-full" role="img" aria-label="Venue map">
                {zones.map((z) => (
                  <g key={z.id}>
                    <rect x={z.map_x} y={z.map_y} width={z.map_w} height={z.map_h} rx="16" style={{ fill: `color-mix(in oklch, ${z.color} 16%, white)`, stroke: z.color, strokeWidth: 2 }} />
                    <text x={z.map_x + z.map_w / 2} y={z.map_y + z.map_h / 2 + 6} textAnchor="middle" style={{ fontSize: 18, fontWeight: 600 }} className="fill-slate-800">{z.name}</text>
                  </g>
                ))}
              </svg>
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-2">
              {zones.map((z) => <li key={z.id} className="surface-flat px-2.5 py-2 text-sm"><ZoneBadge name={z.name} color={z.color} /></li>)}
            </ul>
          </>
        )}
      </section>

      <p className="flex items-start gap-2 rounded-2xl bg-accent p-3 text-xs text-accent-foreground"><Share className="mt-0.5 size-3.5 shrink-0 text-primary" />Tip: add this page to your home screen from your browser menu to open it like an app.</p>
    </div>
  );
}
