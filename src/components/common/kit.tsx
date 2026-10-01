'use client';
// Shared building blocks: page headers, empty/error/skeleton states, stat tiles, selects, avatars.
import { useEffect, useState, type ReactNode } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { AlertTriangle, RotateCw, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { initials } from '@/lib/derive';
import { EmptyArt, skillTone } from './visual';

export function PageHeader({ title, description, actions, eyebrow, icon: Icon }: { title: string; description?: string; actions?: ReactNode; eyebrow?: string; icon?: LucideIcon }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="flex min-w-0 items-start gap-3.5">
        {Icon && <span className="mt-0.5 hidden size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:flex"><Icon className="size-5" /></span>}
        <div className="min-w-0">
          {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>}
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, description, action, className }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card/50 px-6 py-12 text-center', className)}>
      <EmptyArt icon={icon} className="mb-3 scale-90" />
      <p className="text-lg font-semibold tracking-tight">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry, className }: { message: string; onRetry?: () => void; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-2xl border border-gap/30 bg-gap/5 px-6 py-10 text-center', className)}>
      <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-gap/15 text-gap"><AlertTriangle className="size-6" /></div>
      <p className="font-semibold">Something went wrong</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      {onRetry && <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}><RotateCw /> Try again</Button>}
    </div>
  );
}

export function CardSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('surface space-y-3 p-5', className)}>
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-44 w-full rounded-3xl" />
      <div className="grid gap-4 sm:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      <div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-72 rounded-2xl lg:col-span-2" /><Skeleton className="h-72 rounded-2xl" /></div>
    </div>
  );
}

/** Number that ticks up to its value. */
export function CountUp({ value, decimals = 0, suffix = '' }: { value: number; decimals?: number; suffix?: string }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => `${v.toFixed(decimals)}${suffix}`);
  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.4, ease: 'easeOut' });
    return () => controls.stop();
  }, [value, mv]);
  return <motion.span className="tabular">{text}</motion.span>;
}

const TONES = {
  default: { text: 'text-foreground', chip: 'bg-muted text-muted-foreground' },
  good: { text: 'text-foreground', chip: 'bg-covered/12 text-covered' },
  warn: { text: 'text-foreground', chip: 'bg-partial/15 text-partial' },
  bad: { text: 'text-foreground', chip: 'bg-gap/12 text-gap' },
  info: { text: 'text-foreground', chip: 'bg-info/12 text-info' },
} as const;

/** Compact stat tile: icon chip, label, value, one line of context. */
export function StatCard({ label, value, decimals = 0, suffix = '', icon: Icon, hint, tone = 'default', empty }: {
  label: string; value: number; decimals?: number; suffix?: string; icon: LucideIcon; hint?: ReactNode; tone?: keyof typeof TONES; empty?: string;
}) {
  const t = TONES[tone];
  return (
    <div className="surface flex items-start gap-3.5 p-4">
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', t.chip)}><Icon className="size-[18px]" /></span>
      <div className="min-w-0">
        <p className="text-[13px] text-muted-foreground">{label}</p>
        <p className={cn('text-2xl font-semibold leading-tight tracking-tight', t.text)}>
          {empty ? <span className="text-muted-foreground">{empty}</span> : <CountUp value={value} decimals={decimals} suffix={suffix} />}
        </p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

/** Photo when there is one, otherwise coloured initials (stable colour per name). */
export function PersonAvatar({ name, src, size = 'md', className }: { name: string; src?: string | null; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  const dim = size === 'sm' ? 'size-6 text-[10px]' : size === 'lg' ? 'size-11 text-sm' : size === 'xl' ? 'size-20 text-xl' : 'size-8 text-xs';
  if (src && failed !== src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" loading="lazy" onError={() => setFailed(src)}
        className={cn('inline-block shrink-0 rounded-full object-cover ring-2 ring-card', dim, className)} />
    );
  }
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-card', dim, className)}
      style={{ backgroundImage: `linear-gradient(135deg, oklch(0.62 0.15 ${h}), oklch(0.52 0.16 ${(h + 40) % 360}))` }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function SkillTags({ skills, limit = 3, highlight = [] }: { skills: string[]; limit?: number; highlight?: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {skills.slice(0, limit).map((s) => (
        <span key={s} className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-none ring-1 ring-inset', skillTone(s), highlight.includes(s) && 'ring-2')}>{s}</span>
      ))}
      {skills.length > limit && <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium leading-none text-muted-foreground">+{skills.length - limit}</span>}
    </div>
  );
}

export interface Option { value: string; label: string }

/** shadcn Select with a simple options API (value -> label mapping handled for us). */
export function SimpleSelect({ value, onChange, options, placeholder, className, size }: {
  value: string | null | undefined; onChange: (v: string) => void; options: Option[]; placeholder?: string; className?: string; size?: 'sm' | 'default';
}) {
  return (
    <Select value={value ?? null} onValueChange={(v) => { if (v !== null) onChange(v as string); }} items={options}>
      <SelectTrigger size={size} className={cn('w-full bg-card', className)}><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs font-medium text-gap">{message}</p> : null;
}

export function SectionCard({ title, description, actions, children, className, bodyClassName }: { title: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn('surface flex flex-col overflow-hidden', className)}>
      <header className="flex items-start justify-between gap-3 px-5 pb-1 pt-4">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </header>
      <div className={cn('flex-1 p-5 pt-3', bodyClassName)}>{children}</div>
    </section>
  );
}
