'use client';
import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Bell, Home, TriangleAlert, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useData } from '@/lib/data';
import { useRealtime } from '@/lib/realtime';
import { useRequireAccount } from '@/lib/auth';
import type { Notification } from '@/lib/types';
import { ErrorState } from '@/components/common/kit';
import { EventCover } from '@/components/common/visual';
import { PhaseBadge } from '@/components/common/EventBits';
import { AccountMenu } from '@/components/common/TopBar';
import { Skeleton } from '@/components/ui/skeleton';

export function VolShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const profile = useRequireAccount('volunteer');
  const { snap, error, refresh, me, eventId } = useData();
  const unread = snap?.notifications.filter((n) => n.volunteer_id === me?.id && !n.read).length ?? 0;
  const base = `/v/${eventId}`;
  const tabs = [
    { href: base, label: 'Home', icon: Home },
    { href: `${base}/feed`, label: 'Alerts', icon: Bell },
    { href: `${base}/issue`, label: 'Report', icon: TriangleAlert },
    { href: `${base}/profile`, label: 'Profile', icon: UserRound },
  ];

  // not a member of this event (or removed): back to the event list
  useEffect(() => {
    if (snap && profile && !me) router.replace('/v');
  }, [snap, profile, me, router]);

  // live alerts: new notifications for this person pop up as toasts
  useRealtime<Notification>('notifications', (e) => {
    if (e.type !== 'INSERT' || !me || e.row.volunteer_id !== me.id) return;
    const urgent = e.row.title.startsWith('URGENT') || e.row.kind === 'escalation';
    (urgent ? toast.warning : toast)(e.row.title, { description: e.row.body ?? undefined, duration: 7000 });
  }, `event_id=eq.${eventId}`);

  if (error && !snap) {
    return (
      <div className="mx-auto max-w-md space-y-3 p-4">
        <ErrorState message={error.message} onRetry={() => void refresh()} />
        <Link href="/v" className="block text-center text-sm text-primary hover:underline">Back to your events</Link>
      </div>
    );
  }
  if (!snap || !profile || !me) {
    return <div className="mx-auto w-full max-w-md space-y-3 p-4"><Skeleton className="h-14 rounded-2xl" /><Skeleton className="h-52 rounded-3xl" /><Skeleton className="h-24 rounded-2xl" /></div>;
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background sm:border-x">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/90 px-4 py-2.5 backdrop-blur-md">
        <Link href="/v" aria-label="All events" className="-ml-1.5 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><ArrowLeft className="size-4" /></Link>
        <EventCover event={snap.event} overlay={false} className="size-9 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">{snap.event.name}</p>
          <div className="mt-0.5"><PhaseBadge event={snap.event} /></div>
        </div>
        <AccountMenu compact />
      </header>

      <main className="flex-1 px-4 pb-28 pt-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto grid w-full max-w-md grid-cols-4 border-t bg-background/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-md">
        {tabs.map((t) => {
          const active = path === t.href;
          return (
            <Link key={t.href} href={t.href} className={cn('relative flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium transition-colors', active ? 'text-primary' : 'text-muted-foreground')}>
              {active && <motion.span layoutId="vol-tab" transition={{ duration: 0.2 }} className="absolute inset-0 rounded-xl bg-primary/10" />}
              <span className="relative"><t.icon className="size-5" />{t.href.endsWith('/feed') && unread > 0 && <span className="absolute -right-2.5 -top-1.5 min-w-4 rounded-full bg-gap px-1 text-center text-[10px] font-bold text-white tabular">{unread}</span>}</span>
              <span className="relative">{t.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
