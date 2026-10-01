'use client';
import { ArrowLeft, Printer } from 'lucide-react';
import Link from 'next/link';
import { useData } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { ErrorState, PageSkeleton } from '@/components/common/kit';
import { Logo, EventCover } from '@/components/common/visual';
import { QrCard, attendeeJoinUrl } from '@/components/common/QrCard';
import { eventWhen } from '@/components/common/EventBits';

/** Printable poster: put it at the gate so attendees can scan and follow live updates. */
export default function PosterPage() {
  const { snap, error, refresh, eventId } = useData();
  if (error && !snap) return <ErrorState message={error.message} onRetry={() => void refresh()} />;
  if (!snap) return <PageSkeleton />;
  const { event } = snap;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center justify-between print:hidden">
        <Link href={`/e/${eventId}/dashboard`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Back</Link>
        <Button onClick={() => window.print()}><Printer /> Print poster</Button>
      </div>

      <div className="overflow-hidden rounded-3xl border bg-white text-slate-900 shadow-card print:rounded-none print:border-0 print:shadow-none">
        <EventCover event={event} className="h-52 print:h-44">
          <div className="flex h-52 flex-col justify-between p-8 text-white print:h-44"><Logo textClassName="text-white" /><div><h1 className="text-4xl font-semibold leading-tight tracking-tight text-balance">{event.name}</h1><p className="mt-1 text-white/85">{eventWhen(event)}{event.venue ? ` · ${event.venue}` : ''}</p></div></div>
        </EventCover>
        <div className="flex flex-col items-center px-8 py-10 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">Scan for live updates</h2>
          <p className="mt-2 max-w-md text-slate-600">Get announcements and alerts from the organizers on your phone, and ask for help in two taps.</p>
          <QrCard url={attendeeJoinUrl(event.join_code)} filename="event-qr" size={300} showActions={false} className="mt-8" />
          <ol className="mt-8 grid w-full max-w-xl gap-4 text-left sm:grid-cols-3">
            {['Open your phone camera and point it at the code', 'Tap the link, then type your name (no sign-up needed)', 'Follow live updates and send an alert if you need help'].map((t, i) => (
              <li key={i} className="flex gap-3"><span className="brand-gradient flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white">{i + 1}</span><span className="text-sm text-slate-700">{t}</span></li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
