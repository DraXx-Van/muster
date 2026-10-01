'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ArrowRight, KeyRound, QrCode } from 'lucide-react';
import { getEvent } from '@/lib/db/queries';
import { useIdentities } from '@/lib/attendeeIdentity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyArt, EventCover, Logo } from '@/components/common/visual';
import { PhaseBadge, eventWhen } from '@/components/common/EventBits';

function JoinedCard({ eventId, name }: { eventId: string; name: string }) {
  const { data: event } = useSWR(['ev', eventId], () => getEvent(eventId));
  if (!event) return <div className="h-28 animate-pulse rounded-2xl bg-muted" />;
  return (
    <Link href={`/a/${eventId}`} className="surface group block overflow-hidden transition-shadow hover:shadow-pop">
      <EventCover event={event} className="h-24">
        <div className="flex h-24 items-end justify-between p-3 text-white"><PhaseBadge event={event} onCover /><ArrowRight className="size-5 opacity-80 transition-transform group-hover:translate-x-0.5" /></div>
      </EventCover>
      <div className="p-3.5"><p className="font-semibold">{event.name}</p><p className="text-sm text-muted-foreground">{eventWhen(event)}</p><p className="mt-1 text-xs text-muted-foreground">Joined as {name}</p></div>
    </Link>
  );
}

/** Attendee home: events joined on this device. Attendees normally arrive by scanning a QR, so there is no login. */
export default function AttendeeHome() {
  const router = useRouter();
  const identities = useIdentities();
  const ids = Object.entries(identities);
  const [code, setCode] = useState('');

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-background px-4 pb-10 pt-6 sm:border-x">
      <Logo />
      {ids.length === 0 ? (
        <div className="mt-10 text-center">
          <EmptyArt icon={QrCode} />
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">Scan the event QR code</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">Point your phone camera at the QR code at the venue to follow live updates and send alerts to the organizers. No account needed.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight">Your events</h1>
          {ids.map(([eventId, id]) => <JoinedCard key={eventId} eventId={eventId} name={id.name} />)}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); if (code.trim().length >= 4) router.push(`/join/${encodeURIComponent(code.trim().toUpperCase())}`); }} className="surface mt-8 space-y-3 p-4">
        <p className="text-sm font-medium">Have a join code instead?</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. K7M2QX" maxLength={10} className="h-11 pl-9 font-mono tracking-widest" aria-label="Join code" />
          </div>
          <Button type="submit" className="h-11" disabled={code.trim().length < 4}>Join</Button>
        </div>
      </form>
    </div>
  );
}
