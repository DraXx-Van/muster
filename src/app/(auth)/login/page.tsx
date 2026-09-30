'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { ArrowRight, CalendarClock, Crown, Radio, Search, ShieldCheck, Smartphone } from 'lucide-react';
import { getSnapshot } from '@/lib/db/queries';
import { setSession } from '@/lib/session';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, PersonAvatar, SkillTags } from '@/components/common/kit';

export default function LoginPage() {
  const router = useRouter();
  const { data, error, mutate } = useSWR('snapshot', () => getSnapshot());
  const [q, setQ] = useState('');

  const staff = useMemo(() => data?.volunteers.filter((v) => v.role !== 'volunteer') ?? [], [data]);
  const vols = useMemo(
    () => (data?.volunteers ?? []).filter((v) => v.role === 'volunteer' && v.name.toLowerCase().includes(q.toLowerCase())),
    [data, q],
  );

  const enter = (id: string, role: string, to?: string | null) => {
    setSession(id);
    router.push(to && to.startsWith('/') ? to : role === 'volunteer' ? '/me' : '/dashboard');
  };

  // deep link for demos: /login?as=<person id>&to=/me opens that person's view directly (handy for a phone)
  useEffect(() => {
    if (!data) return;
    const p = new URLSearchParams(window.location.search);
    const id = p.get('as');
    const person = id ? data.volunteers.find((v) => v.id === id) : undefined;
    if (person) enter(person.id, person.role, p.get('to'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      {/* left: pitch */}
      <div className="grid-dots relative hidden flex-col justify-between overflow-hidden border-r p-10 lg:flex">
        <div className="pointer-events-none absolute -left-32 -top-32 size-112 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_24px_-4px_var(--primary)]"><CalendarClock className="size-5" /></span>
          <span className="text-lg font-semibold tracking-tight">CrewPulse</span>
        </div>
        <div className="relative max-w-md">
          <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight">The right volunteer, in the right place, <span className="text-primary">even when plans fall apart.</span></h1>
          <p className="mt-4 text-muted-foreground">Skill-based shift assignment that re-optimizes in milliseconds when people drop out, with live visibility of every zone.</p>
          <ul className="mt-8 space-y-3 text-sm">
            {[
              [ShieldCheck, 'No double bookings, no missing skills, fair hours'],
              [Radio, 'Live coverage, check-ins, issues and escalations'],
              [Smartphone, 'A phone view for volunteers: shifts, check-in, alerts'],
            ].map(([Icon, text], i) => {
              const I = Icon as typeof ShieldCheck;
              return <li key={i} className="flex items-center gap-3"><span className="flex size-8 items-center justify-center rounded-lg bg-muted text-primary"><I className="size-4" /></span>{text as string}</li>;
            })}
          </ul>
        </div>
        <p className="relative text-xs text-muted-foreground">Demo login: pick a persona. Production would use real authentication.</p>
      </div>

      {/* right: persona picker */}
      <div className="flex items-center justify-center p-5 sm:p-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="w-full max-w-md">
          <div className="mb-6 lg:hidden flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><CalendarClock className="size-5" /></span>
            <span className="text-lg font-semibold tracking-tight">CrewPulse</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Who are you today?</h2>
          <p className="mt-1 text-sm text-muted-foreground">{data ? data.event.name : 'Loading the event...'}</p>

          {error && !data && <ErrorState className="mt-6" message={error.message} onRetry={() => void mutate()} />}
          {!data && !error && <div className="mt-6 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>}

          {data && (
            <div className="mt-6 space-y-6">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Organizers and coordinators</p>
                <div className="space-y-2">
                  {staff.map((p) => (
                    <button key={p.id} onClick={() => enter(p.id, p.role)}
                      className="group flex w-full items-center gap-3 rounded-xl border bg-card/60 p-3 text-left transition-colors hover:border-primary/50 hover:bg-card">
                      <PersonAvatar name={p.name} size="lg" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-sm font-medium">{p.name}{p.role === 'organizer' && <Crown className="size-3.5 text-partial" />}</span>
                        <span className="text-xs capitalize text-muted-foreground">{p.role}</span>
                      </span>
                      <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Volunteers (phone view)</p>
                <div className="relative mb-2">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search volunteers" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
                </div>
                <ScrollArea className="h-56 rounded-xl border">
                  <div className="p-1">
                    {vols.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">No volunteer matches &ldquo;{q}&rdquo;</p>}
                    {vols.map((v) => (
                      <button key={v.id} onClick={() => enter(v.id, v.role)} className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted/60">
                        <PersonAvatar name={v.name} size="sm" />
                        <span className="min-w-0 flex-1 truncate text-sm">{v.name}</span>
                        <SkillTags skills={v.skills} limit={2} />
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
