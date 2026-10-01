'use client';
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronDown, Info, LifeBuoy, Newspaper } from 'lucide-react';
import { useAttendee } from '@/lib/attendee';
import { clearIdentity } from '@/lib/attendeeIdentity';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { PersonAvatar } from '@/components/common/kit';
import { EventCover } from '@/components/common/visual';
import { PhaseBadge } from '@/components/common/EventBits';
import { AttendeeNameDialog } from './AttendeeNameDialog';

export function AttendeeShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const { event, identity, joined, unread, eventId, complaints } = useAttendee();
  const [nameOpen, setNameOpen] = useState(false);
  const base = `/a/${eventId}`;
  const tabs = [
    { href: base, label: 'Updates', icon: Newspaper },
    { href: `${base}/complaints`, label: 'My reports', icon: LifeBuoy },
    { href: `${base}/info`, label: 'Event', icon: Info },
  ];
  const openReports = complaints.filter((c) => c.status !== 'resolved').length;

  // no identity on this device, or the organizers removed it: start again from the QR / code page
  useEffect(() => {
    if (!identity) router.replace('/a');
    else if (joined === false) { clearIdentity(eventId); router.replace('/a'); }
  }, [identity, joined, eventId, router]);

  if (!identity || !event || joined !== true) {
    return <div className="mx-auto w-full max-w-md space-y-3 p-4"><Skeleton className="h-14 rounded-2xl" /><Skeleton className="h-44 rounded-3xl" /><Skeleton className="h-24 rounded-2xl" /></div>;
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background sm:border-x">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/90 px-4 py-2.5 backdrop-blur-md">
        <EventCover event={event} overlay={false} className="size-9 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">{event.name}</p>
          <div className="mt-0.5"><PhaseBadge event={event} /></div>
        </div>
        <button onClick={() => setNameOpen(true)} className="flex items-center gap-1.5 rounded-full border bg-card py-1 pl-1 pr-2.5 text-sm shadow-sm transition-colors hover:bg-muted" aria-label="Change your name">
          <PersonAvatar name={identity.name} size="sm" />
          <span className="max-w-20 truncate font-medium">{identity.name}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      </header>

      <main className="flex-1 px-4 pb-28 pt-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto grid w-full max-w-md grid-cols-3 border-t bg-background/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-md">
        {tabs.map((t) => {
          const active = path === t.href || (t.href !== base && path.startsWith(t.href));
          const badge = t.href === base ? unread : t.href.endsWith('/complaints') ? openReports : 0;
          return (
            <Link key={t.href} href={t.href} className={cn('relative flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium transition-colors', active ? 'text-primary' : 'text-muted-foreground')}>
              {active && <motion.span layoutId="att-tab" transition={{ duration: 0.2 }} className="absolute inset-0 rounded-xl bg-primary/10" />}
              <span className="relative"><t.icon className="size-5" />{badge > 0 && <span className="absolute -right-2.5 -top-1.5 min-w-4 rounded-full bg-gap px-1 text-center text-[10px] font-bold text-white tabular">{badge}</span>}</span>
              <span className="relative">{t.label}</span>
            </Link>
          );
        })}
      </nav>
      <AttendeeNameDialog open={nameOpen} onClose={() => setNameOpen(false)} eventId={eventId} identity={identity} />
    </div>
  );
}
