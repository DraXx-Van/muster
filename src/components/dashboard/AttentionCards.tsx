'use client';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, CheckCircle2, MessageSquareWarning, MoveRight, UserRoundX, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AttentionItem { key: string; icon: LucideIcon; tone: 'bad' | 'warn' | 'info'; title: string; detail: string; href: string; cta: string }

const TONE = {
  bad: { chip: 'bg-gap/12 text-gap', ring: 'border-gap/30' },
  warn: { chip: 'bg-partial/15 text-partial', ring: 'border-partial/30' },
  info: { chip: 'bg-info/12 text-info', ring: 'border-info/25' },
} as const;

export const attentionIcons = { issue: AlertTriangle, seats: UserRoundX, complaint: MessageSquareWarning, move: MoveRight };

/** What needs a coordinator right now. When there is nothing, say so clearly. */
export function AttentionCards({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) {
    return (
      <div className="surface flex items-center gap-4 border-covered/30 bg-covered/5 p-5">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-covered/15 text-covered"><CheckCircle2 className="size-6" /></span>
        <div><p className="font-semibold">Everything looks good</p><p className="text-sm text-muted-foreground">No open issues, complaints or empty seats. We will flag anything that needs you here.</p></div>
      </div>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((it) => {
        const t = TONE[it.tone];
        return (
          <Link key={it.key} href={it.href} className={cn('surface group flex flex-col gap-3 p-4 transition-shadow hover:shadow-pop', t.ring)}>
            <div className="flex items-start gap-3">
              <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', t.chip)}><it.icon className="size-5" /></span>
              <div className="min-w-0"><p className="font-semibold leading-snug">{it.title}</p><p className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground">{it.detail}</p></div>
            </div>
            <span className="flex items-center gap-1 text-sm font-medium text-primary">{it.cta}<ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></span>
          </Link>
        );
      })}
    </div>
  );
}
