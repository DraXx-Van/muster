'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ArrowRight, CalendarDays, EyeOff, Loader2, MapPin, QrCode, ShieldCheck, Smartphone, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { post } from '@/lib/post';
import { saveIdentity, useIdentities } from '@/lib/attendeeIdentity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { EventCover, Logo } from '@/components/common/visual';
import { PhaseBadge, eventWhen } from '@/components/common/EventBits';

interface Lookup { event: { id: string; name: string; venue: string | null; description: string | null; starts_at: string; ends_at: string; cover_url: string | null; clock_offset_minutes: number } }

async function lookup(code: string): Promise<Lookup> {
  const res = await fetch(`/api/join/lookup?code=${encodeURIComponent(code)}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? 'This link is not valid.');
  return json as Lookup;
}

/** What an attendee sees after scanning the event QR code: pick a display name, no account needed. */
export default function JoinPage() {
  const { code: raw } = useParams<{ code: string }>();
  const code = decodeURIComponent(raw ?? '').toUpperCase();
  const router = useRouter();
  const { data, error } = useSWR(['lookup', code], () => lookup(code), { shouldRetryOnError: false, revalidateOnFocus: false });
  const identities = useIdentities();
  const known = data ? identities[data.event.id] : undefined;
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const enter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    setBusy(true);
    try {
      const body = known && !editing ? { code, attendeeId: known.id, token: known.token } : { code, name, ...(known ? { attendeeId: known.id, token: known.token } : {}) };
      const r = await post<{ eventId: string; eventName: string; attendeeId: string; token: string; name: string }>('/api/attendee/join', body);
      saveIdentity(r.eventId, { id: r.attendeeId, token: r.token, name: r.name, eventName: r.eventName });
      router.push(`/a/${r.eventId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not join. Please try again.');
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background sm:my-0 sm:border-x">
      {error ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-gap/10 text-gap"><TriangleAlert className="size-7" /></span>
          <h1 className="text-xl font-semibold tracking-tight">This link does not work</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
          <Link href="/" className="mt-6 text-sm text-primary hover:underline">Go to CrewPulse</Link>
        </div>
      ) : !data ? (
        <div className="space-y-4 p-4"><Skeleton className="h-52 rounded-3xl" /><Skeleton className="h-40 rounded-2xl" /></div>
      ) : (
        <>
          <EventCover event={{ id: data.event.id, name: data.event.name, cover_url: data.event.cover_url }} className="h-56 rounded-b-[2rem]">
            <div className="flex h-56 flex-col justify-between p-5 text-white">
              <Logo textClassName="text-white" />
              <div>
                <PhaseBadge event={data.event} onCover />
                <h1 className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-balance">{data.event.name}</h1>
              </div>
            </div>
          </EventCover>

          <div className="relative z-10 -mt-6 flex-1 space-y-5 px-4 pb-10">
            <div className="surface space-y-3 p-4">
              <p className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="size-4 shrink-0" />{eventWhen(data.event)}</p>
              {data.event.venue && <p className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="size-4 shrink-0" />{data.event.venue}</p>}
              {data.event.description && <p className="text-sm">{data.event.description}</p>}
            </div>

            <form onSubmit={enter} className="surface space-y-4 p-5">
              {known && !editing ? (
                <>
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">Welcome back, {known.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">You are already set up on this device.</p>
                  </div>
                  <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : null} Open live updates <ArrowRight /></Button>
                  <button type="button" onClick={() => { setEditing(true); setName(known.name); }} className="block w-full text-center text-sm text-muted-foreground hover:text-foreground">Not you, or want a different name?</button>
                </>
              ) : (
                <>
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">What should we call you?</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Pick a name to follow live updates from the organizers.</p>
                  </div>
                  <div>
                    <Label htmlFor="att-name">Your name</Label>
                    <Input id="att-name" autoFocus autoComplete="given-name" maxLength={40} placeholder="e.g. Ravi" value={name} onChange={(e) => setName(e.target.value)} className="h-12 text-base" />
                  </div>
                  <div className="flex gap-2.5 rounded-xl bg-accent p-3 text-[13px] leading-snug text-accent-foreground">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                    <p><span className="font-medium">This is the name the organizers will see</span> when you send them an alert or lodge a complaint, so they know who to help. No account, email or phone number is needed.</p>
                  </div>
                  <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={busy || name.trim().length < 2}>{busy ? <Loader2 className="animate-spin" /> : null} Continue <ArrowRight /></Button>
                </>
              )}
            </form>

            <ul className="space-y-3 px-1 text-sm text-muted-foreground">
              <li className="flex items-start gap-3"><Smartphone className="mt-0.5 size-4 shrink-0 text-primary" />Live announcements and alerts from the organizers, right on your phone.</li>
              <li className="flex items-start gap-3"><QrCode className="mt-0.5 size-4 shrink-0 text-primary" />Report a problem or ask for help in two taps.</li>
              <li className="flex items-start gap-3"><EyeOff className="mt-0.5 size-4 shrink-0 text-primary" />Your name stays on this device and with the event team only.</li>
            </ul>

            <p className="pt-2 text-center text-xs text-muted-foreground">Volunteering at this event? <Link href={`/login?next=${encodeURIComponent(`/v?code=${code}`)}`} className="text-primary hover:underline">Sign in as a volunteer</Link></p>
          </div>
        </>
      )}
    </div>
  );
}
