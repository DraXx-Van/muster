'use client';
import Link from 'next/link';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { ArrowRight, CalendarPlus, CalendarX2, MapPin, Package, Users } from 'lucide-react';
import { useRequireAccount } from '@/lib/auth';
import { listCoordinatorEvents } from '@/lib/db/queries';
import { TEMPLATES } from '@/lib/templates';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/common/kit';
import { EventCover } from '@/components/common/visual';
import { JoinCode, PhaseBadge, eventWhen } from '@/components/common/EventBits';
import { TopBar } from '@/components/common/TopBar';

export default function EventsPage() {
  const profile = useRequireAccount('coordinator');
  const { data, error, mutate } = useSWR(profile ? ['my-events', profile.id] : null, () => listCoordinatorEvents(profile!.id), { refreshInterval: 10000 });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-6xl px-4 py-9 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{profile ? `${greeting}, ${profile.full_name.split(' ')[0]}` : ' '}</p>
            <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight">Your events</h1>
          </div>
          <Link href="/events/new"><Button size="lg" className="h-11"><CalendarPlus /> Create event</Button></Link>
        </div>

        {!profile || (!data && !error) ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-3xl" />)}</div>
        ) : error ? (
          <ErrorState message={error.message} onRetry={() => void mutate()} />
        ) : data!.length === 0 ? (
          <div className="space-y-10">
            <EmptyState icon={CalendarX2} title="Create your first event" description="Start from a template and your zones, shifts and starter tasks are set up for you. You can change everything afterwards."
              action={<Link href="/events/new"><Button size="lg"><CalendarPlus /> Create event</Button></Link>} className="py-14" />
            <div>
              <p className="mb-3 text-sm font-semibold">Templates to start from</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {TEMPLATES.filter((t) => t.id !== 'blank').map((t) => (
                  <Link key={t.id} href="/events/new" className="surface group overflow-hidden transition-shadow hover:shadow-pop">
                    <EventCover event={{ id: t.id, name: t.name, template_id: t.id }} className="h-20" overlay={false} />
                    <div className="p-4"><p className="font-semibold tracking-tight">{t.name}</p><p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">{t.description}</p></div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data!.map(({ event, volunteers, seats, role }, i) => (
              <motion.div key={event.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: i * 0.04 }}>
                <div className="surface group overflow-hidden transition-shadow hover:shadow-pop">
                  <Link href={`/e/${event.id}/dashboard`} className="block">
                    <EventCover event={event} className="h-36">
                      <div className="flex h-36 flex-col justify-between p-4 text-white">
                        <div className="flex items-start justify-between"><PhaseBadge event={event} onCover />{role === 'coordinator' && <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium backdrop-blur">Co-coordinator</span>}</div>
                        <h3 className="text-lg font-semibold leading-tight tracking-tight text-balance">{event.name}</h3>
                      </div>
                    </EventCover>
                    <div className="space-y-2.5 p-4">
                      <p className="text-sm text-muted-foreground">{eventWhen(event)}</p>
                      {event.venue && <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="size-3.5 shrink-0" />{event.venue}</p>}
                      <div className="flex items-center gap-5 pt-1 text-sm">
                        <span className="flex items-center gap-1.5"><Users className="size-4 text-muted-foreground" /><span className="font-semibold tabular">{volunteers}</span><span className="text-muted-foreground">volunteers</span></span>
                        <span className="flex items-center gap-1.5"><Package className="size-4 text-muted-foreground" /><span className="font-semibold tabular">{seats}</span><span className="text-muted-foreground">seats</span></span>
                      </div>
                    </div>
                  </Link>
                  <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2.5">
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">Join code <JoinCode code={event.join_code} className="py-0.5 text-xs" /></span>
                    <Link href={`/e/${event.id}/dashboard`} className="flex items-center gap-1 text-sm font-medium text-primary">Open <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
