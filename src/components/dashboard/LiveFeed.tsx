'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCheck, Megaphone, ListChecks, LogIn, MessageSquareWarning, UserCheck, UserMinus, UserPlus, Radio } from 'lucide-react';
import type { FeedItem } from '@/lib/data';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/common/kit';
import { ScrollArea } from '@/components/ui/scroll-area';

const ICON = { checkin: LogIn, drop: UserMinus, issue: AlertTriangle, announce: Megaphone, task: ListChecks, assign: UserPlus, complaint: MessageSquareWarning, join: UserCheck } as const;
const TONE = { info: 'bg-info/12 text-info', good: 'bg-covered/12 text-covered', warn: 'bg-partial/15 text-partial', bad: 'bg-gap/12 text-gap' } as const;

export function ago(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function LiveFeed({ items, real, height = 'h-[26rem]' }: { items: FeedItem[]; real: Date; height?: string }) {
  if (!items.length) return <EmptyState icon={Radio} title="Quiet for now" description="Check-ins, dropouts, issues, complaints and announcements appear here live." className="border-0 bg-transparent py-6" />;
  return (
    <ScrollArea className={cn(height, '-mr-3 pr-3')}>
      <ul className="relative space-y-4 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-border">
        <AnimatePresence initial={false}>
          {items.map((it) => {
            const Icon = ICON[it.kind] ?? CheckCheck;
            return (
              <motion.li key={it.id} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="relative flex items-start gap-3">
                <span className={cn('relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-card', TONE[it.tone])}><Icon className="size-4" /></span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm leading-snug">{it.text}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground tabular">{ago(real.getTime() - it.at)}</p>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </ScrollArea>
  );
}
