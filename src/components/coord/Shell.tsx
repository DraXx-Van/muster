'use client';
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  AlertTriangle, KanbanSquare, LayoutDashboard, MessageSquareWarning, Megaphone, Menu, QrCode, Settings2, Sparkles, UserPlus, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useData } from '@/lib/data';
import { useRequireAccount } from '@/lib/auth';
import { post } from '@/lib/post';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { ErrorState, PageSkeleton } from '@/components/common/kit';
import { Logo } from '@/components/common/visual';
import { AccountMenu } from '@/components/common/TopBar';
import { AttentionBell } from './AttentionBell';
import { ClockControl } from './ClockControl';
import { EventSwitcher } from './EventSwitcher';
import { InviteDialog } from './InviteDialog';

const GROUPS = [
  { label: 'Overview', items: [{ path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  { label: 'Crew', items: [
    { path: '/assignments', label: 'Assignments', icon: Sparkles },
    { path: '/volunteers', label: 'Volunteers', icon: Users },
    { path: '/tasks', label: 'Task board', icon: KanbanSquare },
  ] },
  { label: 'Respond', items: [
    { path: '/issues', label: 'Issues', icon: AlertTriangle },
    { path: '/complaints', label: 'Complaints', icon: MessageSquareWarning },
    { path: '/announcements', label: 'Announcements', icon: Megaphone },
  ] },
  { label: 'Event', items: [
    { path: '/qr', label: 'Attendee QR', icon: QrCode },
    { path: '/setup', label: 'Event setup', icon: Settings2 },
  ] },
];
const ALL = GROUPS.flatMap((g) => g.items);

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const { snap, eventId } = useData();
  const badge = (p: string) => p === '/issues' ? snap?.issues.filter((i) => i.status === 'open').length ?? 0 : p === '/complaints' ? snap?.complaints.filter((c) => c.status === 'open').length ?? 0 : 0;
  return (
    <nav className="space-y-5">
      {GROUPS.map((g) => (
        <div key={g.label}>
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">{g.label}</p>
          <div className="flex flex-col gap-0.5">
            {g.items.map((n) => {
              const href = `/e/${eventId}${n.path}`;
              const active = path === href || path.startsWith(`${href}/`);
              const count = badge(n.path);
              return (
                <Link key={n.path} href={href} onClick={onNavigate}
                  className={cn('relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors', active ? 'text-primary' : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground')}>
                  {active && <motion.span layoutId="nav-pill" transition={{ duration: 0.2 }} className="absolute inset-0 rounded-xl bg-primary/10" />}
                  <n.icon className="relative size-[18px]" />
                  <span className="relative flex-1">{n.label}</span>
                  {count > 0 && <span className="relative rounded-full bg-gap px-1.5 py-px text-[11px] font-semibold text-white tabular">{count}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function CoordShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const profile = useRequireAccount('coordinator');
  const { snap, error, refresh, me, eventId } = useData();
  const [menu, setMenu] = useState(false);
  const [invite, setInvite] = useState(false);
  const allowed = !!snap && (snap.event.owner_id === profile?.id || me?.role === 'coordinator' || me?.role === 'organizer');
  const current = ALL.find((n) => path.startsWith(`/e/${eventId}${n.path}`));

  // someone who is not a coordinator of this event goes back to their own list
  useEffect(() => {
    if (snap && profile && !allowed) router.replace('/events');
  }, [snap, profile, allowed, router]);

  // escalation ticker: every 5 s a coordinator page asks the server to escalate overdue issues
  useEffect(() => {
    if (!allowed) return;
    const t = setInterval(() => { void post('/api/escalate/tick', { eventId }).catch(() => undefined); }, 5000);
    return () => clearInterval(t);
  }, [allowed, eventId]);

  const runChaos = async () => {
    const id = toast.loading('Dropping volunteers and raising a medical issue...');
    try {
      const r = await post<{ dropped: { volunteer: string }[] }>('/api/simulate', { eventId });
      toast.success(`Chaos: ${r.dropped.length} dropouts and a medical issue`, { id });
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Chaos failed', { id }); }
  };

  if (error && !snap) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-8">
        <ErrorState message={error.message} onRetry={() => void refresh()} />
        <Link href="/events" className="block text-center text-sm text-primary hover:underline">Back to your events</Link>
      </div>
    );
  }
  if (!snap || !profile || !allowed) return <div className="p-6 lg:p-8"><PageSkeleton /></div>;

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col gap-5 border-r bg-sidebar p-4 print:hidden lg:flex">
        <div className="px-1.5 pt-1"><Link href="/events"><Logo /></Link></div>
        <EventSwitcher event={snap.event} />
        <div className="-mr-2 flex-1 overflow-y-auto pr-2"><NavList /></div>
        <button onClick={() => setInvite(true)} className="group flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3 text-left transition-colors hover:bg-primary/10">
          <span className="brand-gradient flex size-9 items-center justify-center rounded-xl text-white"><UserPlus className="size-4" /></span>
          <span><span className="block text-sm font-semibold">Invite people</span><span className="text-xs text-muted-foreground">QR code and join code</span></span>
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-md print:hidden sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMenu(true)} aria-label="Open menu"><Menu /></Button>
          <div className="min-w-0">
            <p className="truncate text-sm text-muted-foreground"><span className="hidden sm:inline">{snap.event.name} <span className="mx-1">/</span> </span><span className="font-medium text-foreground">{current?.label ?? 'Event'}</span></p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <AttentionBell />
            <Button size="sm" className="hidden sm:inline-flex" onClick={() => setInvite(true)}><UserPlus /> Invite</Button>
            <ClockControl onChaos={runChaos} />
            <AccountMenu compact />
          </div>
        </header>
        <main className="flex-1 px-4 py-7 sm:px-6 lg:px-9 lg:py-9">{children}</main>
      </div>

      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent side="left" className="w-[290px] gap-5 p-4">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="px-1.5 pt-1"><Link href="/events" onClick={() => setMenu(false)}><Logo /></Link></div>
          <EventSwitcher event={snap.event} />
          <div className="flex-1 overflow-y-auto"><NavList onNavigate={() => setMenu(false)} /></div>
        </SheetContent>
      </Sheet>

      <InviteDialog open={invite} onClose={() => setInvite(false)} event={snap.event} attendees={snap.attendees.length} />
    </div>
  );
}
