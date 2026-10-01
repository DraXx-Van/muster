'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { ArrowRight, CalendarX2, KeyRound, Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { useRequireAccount } from '@/lib/auth';
import { listJoinedEvents } from '@/lib/db/queries';
import { post } from '@/lib/post';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from './kit';
import { PhaseBadge, eventWhen } from './EventBits';
import { TopBar } from './TopBar';

/** Home for volunteers (/v) and attendees (/a): events you joined, and a box to join another with a code. */
export function JoinedEvents({ kind }: { kind: 'volunteer' | 'attendee' }) {
  const profile = useRequireAccount(kind);
  const router = useRouter();
  const base = kind === 'volunteer' ? '/v' : '/a';
  const { data, error, mutate } = useSWR(profile ? [`joined-${kind}`, profile.id] : null, () => listJoinedEvents(profile!.id, kind), { refreshInterval: 10000 });
  // a shared link like /v?code=ABC123 pre-fills the code
  const params = useSearchParams();
  const [code, setCode] = useState(() => (params.get('code') ?? '').toUpperCase());
  const [busy, setBusy] = useState(false);

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await post<{ eventId: string; name: string; already: boolean }>('/api/join', { code });
      toast.success(r.already ? `You are already in ${r.name}` : `Joined ${r.name}`);
      router.push(`${base}/${r.eventId}${kind === 'volunteer' && !r.already ? '/profile' : ''}`);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not join'); setBusy(false); }
  };

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-2xl p-4 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">{profile ? `Hi ${profile.full_name.split(' ')[0]}` : 'Your events'}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{kind === 'volunteer' ? 'Join an event with the code from the organizer, then add your skills and availability.' : 'Join an event with its code to read live updates and lodge complaints.'}</p>

        <form onSubmit={join} className="surface mt-6 flex flex-col gap-3 p-4 sm:flex-row">
          <div className="relative flex-1">
            <KeyRound className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Join code, e.g. K7M2QX" maxLength={10} className="pl-8 font-mono tracking-widest" aria-label="Join code" />
          </div>
          <Button type="submit" disabled={busy || code.trim().length < 4}>{busy && <Loader2 className="animate-spin" />} Join event</Button>
        </form>

        <h2 className="mb-3 mt-8 text-xs font-medium uppercase tracking-wide text-muted-foreground">Your events</h2>
        {!profile || (!data && !error) ? (
          <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        ) : error ? (
          <ErrorState message={error.message} onRetry={() => void mutate()} />
        ) : data!.length === 0 ? (
          <EmptyState icon={CalendarX2} title="You have not joined an event yet" description="Ask the event organizer for the join code, then enter it above." />
        ) : (
          <ul className="space-y-3">
            {data!.map((ev, i) => (
              <motion.li key={ev.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: i * 0.04 }}>
                <Link href={`${base}/${ev.id}`} className="surface group flex items-center gap-4 p-4 transition-colors hover:border-primary/50">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><p className="truncate font-medium">{ev.name}</p><PhaseBadge event={ev} /></div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{eventWhen(ev)}</p>
                    {ev.venue && <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" />{ev.venue}</p>}
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              </motion.li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
