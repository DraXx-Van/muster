'use client';
import Link from 'next/link';
import { AlertTriangle, Bell, CheckCircle2, MessageSquareWarning, UserRoundX } from 'lucide-react';
import { useData } from '@/lib/data';
import { openSeats } from '@/lib/derive';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/** Everything that needs a coordinator right now, in one place. */
export function AttentionBell() {
  const { snap, eventId } = useData();
  if (!snap) return null;
  const issues = snap.issues.filter((i) => i.status === 'open').length;
  const complaints = snap.complaints.filter((c) => c.status === 'open').length;
  const seats = openSeats(snap).reduce((n, g) => n + g.missing, 0);
  const total = issues + complaints;
  const rows = [
    { n: issues, icon: AlertTriangle, label: issues === 1 ? 'issue needs a response' : 'issues need a response', href: `/e/${eventId}/issues`, tone: 'text-gap bg-gap/10' },
    { n: complaints, icon: MessageSquareWarning, label: complaints === 1 ? 'new complaint' : 'new complaints', href: `/e/${eventId}/complaints`, tone: 'text-partial bg-partial/15' },
    { n: seats, icon: UserRoundX, label: seats === 1 ? 'seat has nobody assigned' : 'seats have nobody assigned', href: `/e/${eventId}/assignments`, tone: 'text-info bg-info/10' },
  ].filter((r) => r.n > 0);

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="icon" className="relative rounded-full" aria-label="Needs attention" />}>
        <Bell />
        {total > 0 && <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-gap text-[10px] font-bold text-white tabular">{total > 9 ? '9+' : total}</span>}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3"><p className="text-sm font-semibold">Needs attention</p></div>
        {rows.length === 0 ? (
          <div className="flex items-center gap-3 px-4 py-5 text-sm text-muted-foreground"><span className="flex size-9 items-center justify-center rounded-full bg-covered/12 text-covered"><CheckCircle2 className="size-5" /></span>All clear. Nothing is waiting on you.</div>
        ) : (
          <ul className="p-1.5">
            {rows.map((r) => (
              <li key={r.href}>
                <Link href={r.href} className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm transition-colors hover:bg-muted">
                  <span className={`flex size-9 items-center justify-center rounded-full ${r.tone}`}><r.icon className="size-4" /></span>
                  <span><span className="font-semibold tabular">{r.n}</span> {r.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
