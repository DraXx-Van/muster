'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { CalendarPlus, Check, ChevronsUpDown, LayoutGrid } from 'lucide-react';
import { listCoordinatorEvents } from '@/lib/db/queries';
import { useAuth } from '@/lib/auth';
import type { EventRow } from '@/lib/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EventCover } from '@/components/common/visual';
import { PhaseBadge } from '@/components/common/EventBits';

/** The current event, and a quick way to jump to another one. */
export function EventSwitcher({ event }: { event: EventRow }) {
  const { user } = useAuth();
  const router = useRouter();
  const { data } = useSWR(user ? ['my-events', user.id] : null, () => listCoordinatorEvents(user!.id), { refreshInterval: 30000 });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<button className="flex w-full items-center gap-3 rounded-2xl border bg-card p-2.5 text-left shadow-card transition-colors hover:bg-muted/50" aria-label="Switch event" />}>
        <EventCover event={event} overlay={false} className="size-11 shrink-0 rounded-xl" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold leading-tight">{event.name}</span>
          <span className="mt-1 block"><PhaseBadge event={event} /></span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Your events</DropdownMenuLabel>
          {(data ?? []).map(({ event: e }) => (
            <DropdownMenuItem key={e.id} onClick={() => router.push(`/e/${e.id}/dashboard`)} className="gap-3 py-2">
              <EventCover event={e} overlay={false} className="size-8 shrink-0 rounded-lg" />
              <span className="min-w-0 flex-1 truncate">{e.name}</span>
              {e.id === event.id && <Check className="size-4 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/events')}><LayoutGrid /> All events</DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/events/new')}><CalendarPlus /> Create a new event</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function BackToEvents() {
  return <Link href="/events" className="text-xs text-muted-foreground hover:text-foreground">All events</Link>;
}
