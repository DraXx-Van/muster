'use client';
// Small shared building blocks: headers, empty/error/skeleton states, count-up stat cards, selects, avatars.
import { useEffect, type ReactNode } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { AlertTriangle, RotateCw, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { initials } from '@/lib/derive';

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center', className)}>
      <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground"><Icon className="size-5" /></div>
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry, className }: { message: string; onRetry?: () => void; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-xl border border-gap/30 bg-gap/5 px-6 py-10 text-center', className)}>
      <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-gap/15 text-gap"><AlertTriangle className="size-5" /></div>
      <p className="font-medium">Something went wrong</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      {onRetry && <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}><RotateCw /> Try again</Button>}
    </div>
  );
}

export function CardSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('surface space-y-3 p-4', className)}>
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2"><Skeleton className="h-7 w-56" /><Skeleton className="h-4 w-96 max-w-full" /></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      <div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-72 lg:col-span-2" /><Skeleton className="h-72" /></div>
    </div>
  );
}

/** Number that ticks up to its value (PRD: count-up animation). */
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
  default: 'text-foreground', good: 'text-covered', warn: 'text-partial', bad: 'text-gap', info: 'text-info',
} as const;

export function StatCard({ label, value, decimals = 0, suffix = '', icon: Icon, hint, tone = 'default', empty }: {
  label: string; value: number; decimals?: number; suffix?: string; icon: LucideIcon; hint?: ReactNode; tone?: keyof typeof TONES; empty?: string;
}) {
  return (
    <div className="surface relative overflow-hidden p-4">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        <Icon className="size-4" />
      </div>
      <div className={cn('mt-2 text-3xl font-semibold tracking-tight', TONES[tone])}>
        {empty ? <span className="text-muted-foreground">{empty}</span> : <CountUp value={value} decimals={decimals} suffix={suffix} />}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

/** Coloured initials, stable colour per name. */
export function PersonAvatar({ name, size = 'md', className }: { name: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  const dim = size === 'sm' ? 'size-6 text-[10px]' : size === 'lg' ? 'size-11 text-sm' : 'size-8 text-xs';
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white/95 ring-1 ring-white/10', dim, className)}
      style={{ backgroundColor: `oklch(0.5 0.12 ${h})` }}
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
        <span key={s} className={cn('rounded-md border px-1.5 py-0.5 text-[11px] leading-none', highlight.includes(s) ? 'border-primary/40 bg-primary/10 text-primary' : 'text-muted-foreground')}>{s}</span>
      ))}
      {skills.length > limit && <span className="rounded-md border px-1.5 py-0.5 text-[11px] leading-none text-muted-foreground">+{skills.length - limit}</span>}
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
      <SelectTrigger size={size} className={cn('w-full', className)}><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs text-gap">{message}</p> : null;
}

export function SectionCard({ title, description, actions, children, className }: { title: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('surface flex flex-col', className)}>
      <header className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </header>
      <div className="flex-1 p-4">{children}</div>
    </section>
  );
}
