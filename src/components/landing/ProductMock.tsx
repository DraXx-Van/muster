// Illustration of the product for the landing page: coordinator dashboard + attendee phone. Purely decorative, no real data.
import { BellRing, Check, HeartPulse, LayoutDashboard, LifeBuoy, Megaphone, Sparkles, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const ZONES = [
  { c: 'bg-emerald-500/15 border-emerald-500/50', dot: 'bg-emerald-500', span: 'col-span-2 row-span-2' },
  { c: 'bg-emerald-500/15 border-emerald-500/50', dot: 'bg-emerald-500', span: '' },
  { c: 'bg-red-500/15 border-red-500/60 pulse-gap', dot: 'bg-red-500', span: '' },
  { c: 'bg-emerald-500/15 border-emerald-500/50', dot: 'bg-emerald-500', span: 'row-span-2' },
  { c: 'bg-amber-500/15 border-amber-500/60', dot: 'bg-amber-500', span: '' },
  { c: 'bg-emerald-500/15 border-emerald-500/50', dot: 'bg-emerald-500', span: 'col-span-2' },
];

const PEOPLE = ['from-indigo-500 to-violet-500', 'from-emerald-500 to-teal-500', 'from-amber-500 to-orange-500', 'from-sky-500 to-blue-500'];

export function ProductMock() {
  return (
    <div className="relative mx-auto w-full max-w-[620px] pb-10 pr-6 pt-4 lg:pr-0" aria-hidden>
      {/* soft glow */}
      <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-linear-to-br from-indigo-500/15 via-sky-400/10 to-transparent blur-2xl" />

      {/* dashboard window */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-pop">
        <div className="flex items-center gap-1.5 border-b bg-muted/50 px-3.5 py-2.5">
          <span className="size-2.5 rounded-full bg-red-400/80" /><span className="size-2.5 rounded-full bg-amber-400/80" /><span className="size-2.5 rounded-full bg-emerald-400/80" />
          <span className="mx-auto h-4 w-40 rounded-md bg-muted" />
        </div>
        <div className="grid grid-cols-[52px_1fr]">
          <div className="space-y-2 border-r bg-muted/30 p-2.5">
            {[LayoutDashboard, Sparkles, Users, Megaphone, LifeBuoy].map((Icon, i) => (
              <span key={i} className={cn('flex size-8 items-center justify-center rounded-lg', i === 0 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}><Icon className="size-4" /></span>
            ))}
          </div>
          <div className="space-y-3.5 p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5"><div className="h-3 w-32 rounded bg-foreground/80" /><div className="h-2 w-44 rounded bg-muted-foreground/30" /></div>
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-600">Live now</span>
            </div>
            <div className="grid h-40 grid-cols-4 grid-rows-3 gap-2">
              {ZONES.map((z, i) => (
                <div key={i} className={cn('relative rounded-xl border', z.c, z.span)}>
                  <span className={cn('absolute left-2 top-2 size-2 rounded-full', z.dot)} />
                  <div className="absolute bottom-2 left-2 flex gap-1">{[0, 1, 2].map((d) => <span key={d} className={cn('size-1.5 rounded-full', d === 2 && i === 2 ? 'border border-red-500' : z.dot)} />)}</div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {[0, 1].map((r) => (
                <div key={r} className="flex items-center gap-2.5 rounded-xl border bg-background p-2">
                  <span className={cn('size-6 rounded-full bg-linear-to-br', PEOPLE[r])} />
                  <div className="space-y-1.5"><div className="h-2 w-36 rounded bg-foreground/70" /><div className="h-1.5 w-20 rounded bg-muted-foreground/30" /></div>
                  <span className="ml-auto h-5 w-12 rounded-md bg-primary/15" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* floating confirmation */}
      <div className="float-slow absolute -left-2 bottom-24 hidden items-center gap-2 rounded-xl border bg-card px-3 py-2 text-xs font-medium shadow-pop sm:flex lg:-left-8">
        <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600"><Check className="size-3.5" /></span>
        Replacement found, zone covered
      </div>

      {/* attendee phone */}
      <div className="absolute -bottom-2 right-0 w-[196px] rotate-[3deg] rounded-[30px] border-[6px] border-slate-900 bg-background shadow-pop dark:border-slate-700">
        <div className="mx-auto mt-1.5 h-1.5 w-14 rounded-full bg-slate-900/80 dark:bg-slate-600" />
        <div className="space-y-2.5 p-3 pt-2.5">
          <div className="h-16 rounded-2xl brand-gradient" />
          <div className="flex gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-2">
            <BellRing className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
            <div className="space-y-1"><p className="text-[10px] font-semibold leading-tight">Gates open at 5:00</p><div className="h-1.5 w-24 rounded bg-muted-foreground/30" /></div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-2"><HeartPulse className="size-3.5 text-red-600" /><p className="mt-1 text-[9px] font-semibold leading-tight">Medical help</p></div>
            <div className="rounded-xl border border-primary/30 bg-primary/10 p-2"><LifeBuoy className="size-3.5 text-primary" /><p className="mt-1 text-[9px] font-semibold leading-tight">Report a problem</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}
