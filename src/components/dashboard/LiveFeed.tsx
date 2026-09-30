'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCheck, Megaphone, ListChecks, LogIn, UserMinus, UserPlus, Radio } from 'lucide-react';
import type { FeedItem } from '@/lib/data';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/common/kit';
import { ScrollArea } from '@/components/ui/scroll-area';

const ICON = { checkin: LogIn, drop: UserMinus, issue: AlertTriangle, announce: Megaphone, task: ListChecks, assign: UserPlus } as const;
const TONE = { info: 'bg-info/15 text-info', good: 'bg-covered/15 text-covered', warn: 'bg-partial/15 text-partial', bad: 'bg-gap/15 text-gap' } as const;

export function ago(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export function LiveFeed({ items, real }: { items: FeedItem[]; real: Date }) {
  if (!items.length) return <EmptyState icon={Radio} title="Waiting for activity" description="Check-ins, dropouts, issues and announcements will appear here live." className="py-10" />;
  return (
    <ScrollArea className="h-[22rem] pr-3">
      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {items.map((it) => {
            const Icon = ICON[it.kind] ?? CheckCheck;
            return (
              <motion.li key={it.id} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex items-start gap-2.5">
                <span className={cn('mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full', TONE[it.tone])}><Icon className="size-3.5" /></span>
                <div className="min-w-0">
                  <p className="text-sm leading-snug">{it.text}</p>
                  <p className="text-[11px] text-muted-foreground tabular">{ago(real.getTime() - it.at)}</p>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </ScrollArea>
  );
}
