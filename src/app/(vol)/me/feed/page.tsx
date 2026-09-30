'use client';
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BellOff, Megaphone, MoveRight, TriangleAlert, UserCheck } from 'lucide-react';
import { useData } from '@/lib/data';
import { useSessionId } from '@/lib/session';
import { markNotificationsRead } from '@/lib/db/queries';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/common/kit';
import { ago } from '@/components/dashboard/LiveFeed';

const ICON = { announcement: Megaphone, assignment: UserCheck, issue: TriangleAlert, escalation: TriangleAlert } as const;

export default function FeedPage() {
  const { snap, real, refresh } = useData();
  const me = useSessionId();
  const items = snap?.notifications.filter((n) => n.volunteer_id === me) ?? [];
  const unread = items.filter((n) => !n.read).length;

  // opening the feed marks everything as read (the badge clears)
  useEffect(() => {
    if (me && unread > 0) {
      const t = setTimeout(() => { void markNotificationsRead(me).then(() => refresh()).catch(() => undefined); }, 1200);
      return () => clearTimeout(t);
    }
  }, [me, unread, refresh]);

  if (!snap) return null;
  return (
    <div>
      <h1 className="mb-3 text-lg font-semibold">Alerts and announcements</h1>
      {items.length === 0 ? (
        <EmptyState icon={BellOff} title="Nothing yet" description="Announcements from coordinators and changes to your shifts appear here instantly." />
      ) : (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {items.map((n) => {
              const Icon = ICON[n.kind] ?? MoveRight;
              const urgent = n.title.startsWith('URGENT') || n.kind === 'escalation';
              return (
                <motion.li key={n.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                  className={cn('surface flex gap-3 p-3', urgent && 'border-partial/40 bg-partial/5', !n.read && 'ring-1 ring-primary/40')}>
                  <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full', urgent ? 'bg-partial/15 text-partial' : 'bg-primary/15 text-primary')}><Icon className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">{n.title}</p>
                    {n.body && <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>}
                    <p className="mt-1 text-[11px] text-muted-foreground tabular">{ago(real.getTime() - new Date(n.created_at).getTime())}</p>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
