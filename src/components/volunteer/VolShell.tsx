'use client';
import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bell, CalendarClock, Home, LogOut, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useData } from '@/lib/data';
import { useRealtime } from '@/lib/realtime';
import { setSession, useSessionId } from '@/lib/session';
import type { Notification } from '@/lib/types';
import { ErrorState, PersonAvatar } from '@/components/common/kit';
import { Skeleton } from '@/components/ui/skeleton';

const TABS = [
  { href: '/me', label: 'Home', icon: Home },
  { href: '/me/feed', label: 'Alerts', icon: Bell },
  { href: '/me/issue', label: 'Report', icon: TriangleAlert },
];

const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });

export function VolShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const sessionId = useSessionId();
  const { snap, error, refresh, now } = useData();
  const me = snap?.volunteers.find((v) => v.id === sessionId);
  const unread = snap?.notifications.filter((n) => n.volunteer_id === sessionId && !n.read).length ?? 0;

  useEffect(() => {
    if (sessionId === null) router.replace('/login');
    else if (snap && sessionId && !me) { setSession(null); router.replace('/login'); }
  }, [sessionId, snap, me, router]);

  // live alerts: new notifications for this person pop up as toasts
  useRealtime<Notification>('notifications', (e) => {
    if (e.type !== 'INSERT' || e.row.volunteer_id !== sessionId) return;
    const urgent = e.row.title.startsWith('URGENT') || e.row.kind === 'escalation';
    (urgent ? toast.warning : toast)(e.row.title, { description: e.row.body ?? undefined, duration: 6000 });
  });

  if (error && !snap) return <div className="mx-auto max-w-md p-4"><ErrorState message={error.message} onRetry={() => void refresh()} /></div>;
  if (!snap || !me) {
    return <div className="mx-auto w-full max-w-md space-y-3 p-4"><Skeleton className="h-16" /><Skeleton className="h-44" /><Skeleton className="h-24" /></div>;
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col sm:border-x">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/85 px-4 py-3 backdrop-blur-md">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><CalendarClock className="size-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">{me.name}</p>
          <p className="text-[11px] leading-tight text-muted-foreground tabular">Event time {timeFmt.format(now)}</p>
        </div>
        <PersonAvatar name={me.name} />
        <button aria-label="Switch user" onClick={() => { setSession(null); router.replace('/login'); }} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><LogOut className="size-4" /></button>
      </header>

      <main className="flex-1 px-4 pb-28 pt-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto grid w-full max-w-md grid-cols-3 border-t bg-background/90 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-md">
        {TABS.map((t) => {
          const active = path === t.href;
          return (
            <Link key={t.href} href={t.href} className={cn('relative flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] transition-colors', active ? 'text-primary' : 'text-muted-foreground')}>
              {active && <motion.span layoutId="vol-tab" transition={{ duration: 0.2 }} className="absolute inset-0 rounded-lg bg-primary/10" />}
              <span className="relative"><t.icon className="size-5" />{t.href === '/me/feed' && unread > 0 && <span className="absolute -right-2 -top-1.5 min-w-4 rounded-full bg-gap px-1 text-center text-[10px] font-bold text-white tabular">{unread}</span>}</span>
              <span className="relative font-medium">{t.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
