'use client';
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  AlertTriangle, CalendarClock, ChevronsUpDown, KanbanSquare, LayoutDashboard, LogOut, Megaphone, Menu, Settings2, Sparkles, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useData } from '@/lib/data';
import { setSession, useSessionId } from '@/lib/session';
import { post } from '@/lib/post';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ErrorState, PageSkeleton, PersonAvatar } from '@/components/common/kit';
import { ClockControl } from './ClockControl';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/assignments', label: 'Assignments', icon: Sparkles },
  { href: '/volunteers', label: 'Volunteers', icon: Users },
  { href: '/tasks', label: 'Task board', icon: KanbanSquare },
  { href: '/issues', label: 'Issues', icon: AlertTriangle },
  { href: '/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/setup', label: 'Event setup', icon: Settings2 },
];

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 px-2">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_20px_-4px_var(--primary)]">
        <CalendarClock className="size-4" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight">CrewPulse</span>
    </Link>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const { snap } = useData();
  const open = snap?.issues.filter((i) => i.status === 'open').length ?? 0;
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((n) => {
        const active = path === n.href || path.startsWith(`${n.href}/`);
        return (
          <Link key={n.href} href={n.href} onClick={onNavigate}
            className={cn('relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors', active ? 'text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground')}>
            {active && <motion.span layoutId="nav-pill" transition={{ duration: 0.2 }} className="absolute inset-0 rounded-lg bg-primary/15 ring-1 ring-primary/30" />}
            <n.icon className={cn('relative size-4', active && 'text-primary')} />
            <span className="relative flex-1">{n.label}</span>
            {n.href === '/issues' && open > 0 && <span className="relative rounded-full bg-gap px-1.5 text-[11px] font-semibold text-white tabular">{open}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function PersonMenu({ name, role }: { name: string; role: string }) {
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<button className="flex w-full items-center gap-2.5 rounded-lg border bg-card/60 p-2 text-left transition-colors hover:bg-muted/60" />}>
        <PersonAvatar name={name} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{name}</span>
          <span className="block text-xs capitalize text-muted-foreground">{role}</span>
        </span>
        <ChevronsUpDown className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-56">
        <DropdownMenuLabel>Signed in (demo login)</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { setSession(null); router.replace('/login'); }}><LogOut /> Switch user</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function CoordShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const sessionId = useSessionId();
  const { snap, error, refresh } = useData();
  const [menu, setMenu] = useState(false);
  const me = snap?.volunteers.find((v) => v.id === sessionId);

  useEffect(() => {
    if (sessionId === null) router.replace('/login');
    else if (snap && sessionId && me?.role === 'volunteer') router.replace('/me');
    else if (snap && sessionId && !me) { setSession(null); router.replace('/login'); }
  }, [sessionId, snap, me, router]);

  // escalation ticker: every 5 s any coordinator page asks the server to escalate overdue issues
  useEffect(() => {
    const t = setInterval(() => { void post('/api/escalate/tick').catch(() => undefined); }, 5000);
    return () => clearInterval(t);
  }, []);

  const runChaos = async () => {
    const id = toast.loading('Dropping volunteers and raising a medical issue...');
    try {
      const r = await post<{ dropped: { volunteer: string }[] }>('/api/simulate');
      toast.success(`Chaos: ${r.dropped.length} dropouts and a medical issue`, { id });
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Chaos failed', { id }); }
  };

  if (error && !snap) {
    return <div className="mx-auto max-w-lg p-8"><ErrorState message={`${error.message}. Check .env.local and that the seed has been run.`} onRetry={() => void refresh()} /></div>;
  }
  if (!snap || !me || me.role === 'volunteer') return <div className="p-6 lg:p-8"><PageSkeleton /></div>;

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 border-r bg-sidebar p-3 lg:flex">
        <div className="pt-2"><Brand /></div>
        <div className="flex-1 overflow-y-auto"><NavList /></div>
        <PersonMenu name={me.name} role={me.role} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-md sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMenu(true)} aria-label="Open menu"><Menu /></Button>
          <div className="lg:hidden"><Brand /></div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground md:inline">{snap.event.name}</span>
            <ClockControl onChaos={runChaos} />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent side="left" className="w-72 gap-6 p-3">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="pt-2"><Brand /></div>
          <div className="flex-1"><NavList onNavigate={() => setMenu(false)} /></div>
          <PersonMenu name={me.name} role={me.role} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
