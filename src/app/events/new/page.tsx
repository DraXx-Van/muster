'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Check, Layers, Loader2, Sparkles, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useRequireAccount } from '@/lib/auth';
import { post } from '@/lib/post';
import { CREW_SIZES, TEMPLATES, buildFromTemplate, type CrewSize } from '@/lib/templates';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FieldError, SimpleSelect } from '@/components/common/kit';
import { TopBar } from '@/components/common/TopBar';
import { EventCover } from '@/components/common/visual';

const schema = z.object({
  templateId: z.string().min(1),
  name: z.string().trim().min(3, 'Give the event a name (3+ characters)').max(80),
  venue: z.string().trim().max(120),
  description: z.string().trim().max(400),
  date: z.string().min(1, 'Pick the event date'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Set the start time'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Set the end time'),
  crew: z.enum(['test', 'small', 'medium', 'large']),
  blockHours: z.string(),
  zones: z.array(z.string()),
});
type Values = z.infer<typeof schema>;

const tomorrow = () => new Date(Date.now() + 86_400_000 + 5.5 * 3_600_000).toISOString().slice(0, 10);

export default function NewEventPage() {
  const profile = useRequireAccount('coordinator');
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const first = TEMPLATES[0];
  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      templateId: first.id, name: '', venue: '', description: '', date: tomorrow(), startTime: first.defaultStart, endTime: first.defaultEnd,
      crew: 'small', blockHours: String(first.blockHours), zones: first.zones.map((z) => z.name),
    },
  });
  const v = useWatch({ control });
  const template = TEMPLATES.find((t) => t.id === v.templateId) ?? first;

  const pickTemplate = (id: string) => {
    const t = TEMPLATES.find((x) => x.id === id)!;
    setValue('templateId', id);
    setValue('startTime', t.defaultStart);
    setValue('endTime', t.defaultEnd);
    setValue('blockHours', String(t.blockHours));
    setValue('zones', t.zones.map((z) => z.name));
  };

  // live preview of what will be generated
  const plan = useMemo(() => {
    if (!v.date || !v.startTime || !v.endTime) return null;
    const start = new Date(`${v.date}T${v.startTime}:00+05:30`);
    let end = new Date(`${v.date}T${v.endTime}:00+05:30`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    if (end <= start) end = new Date(end.getTime() + 86_400_000);
    return buildFromTemplate(template, { startISO: start.toISOString(), endISO: end.toISOString(), crew: (v.crew ?? 'small') as CrewSize, zones: v.zones as string[], blockHours: Number(v.blockHours) || template.blockHours });
  }, [v.date, v.startTime, v.endTime, v.crew, v.zones, v.blockHours, template]);

  const blocks = plan ? new Set(plan.shifts.map((s) => s.starts_at)).size : 0;

  const submit = async (vals: Values) => {
    setSaving(true);
    try {
      const r = await post<{ eventId: string }>('/api/events', { ...vals, blockHours: Number(vals.blockHours) });
      toast.success('Event created', { description: 'Share the join code so volunteers can sign up.' });
      router.push(`/e/${r.eventId}/dashboard`);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not create the event'); setSaving(false); }
  };

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-6xl px-4 py-9 sm:px-6">
        <Link href="/events" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> All events</Link>
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight">Create an event</h1>
        <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">Pick a template to pre-fill zones, shifts and starter tasks. You can add, rename or remove anything afterwards in Event setup.</p>

        {!profile ? null : (
          <form onSubmit={handleSubmit(submit)} className="mt-6 grid gap-6 lg:grid-cols-3" noValidate>
            <div className="space-y-8 lg:col-span-2">
              {/* 1 template */}
              <section>
                <h2 className="mb-3 text-sm font-semibold"><span className="mr-2 inline-flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">1</span>Choose a template</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {TEMPLATES.map((t) => (
                    <button type="button" key={t.id} aria-pressed={v.templateId === t.id} onClick={() => pickTemplate(t.id)}
                      className={cn('relative overflow-hidden rounded-2xl border bg-card text-left shadow-card transition-all', v.templateId === t.id ? 'border-primary ring-2 ring-primary/25' : 'hover:shadow-pop')}>
                      <EventCover event={{ id: t.id, name: t.name, template_id: t.id }} className="h-16" overlay={false} />
                      {v.templateId === t.id && <span className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow"><Check className="size-3.5" /></span>}
                      <div className="p-4">
                        <p className="font-semibold tracking-tight">{t.name}</p>
                        <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{t.description}</p>
                        <p className="mt-2.5 text-xs font-medium text-muted-foreground">{t.zones.length ? `${t.zones.length} zones · ${t.blockHours}-hour shifts` : 'No zones, build your own'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              {/* 2 details */}
              <section className="space-y-4">
                <h2 className="text-sm font-semibold"><span className="mr-2 inline-flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">2</span>Event details</h2>
                <div>
                  <Label htmlFor="ev-name">Event name</Label>
                  <Input id="ev-name" placeholder="e.g. TSEC Fest 2026" aria-invalid={!!errors.name} {...register('name')} />
                  <FieldError message={errors.name?.message} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label htmlFor="ev-venue">Venue</Label><Input id="ev-venue" placeholder="Where is it?" {...register('venue')} /></div>
                  <div><Label htmlFor="ev-date">Date</Label><Input id="ev-date" type="date" aria-invalid={!!errors.date} {...register('date')} /><FieldError message={errors.date?.message} /></div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div><Label htmlFor="ev-start">Starts</Label><Input id="ev-start" type="time" {...register('startTime')} /><FieldError message={errors.startTime?.message} /></div>
                  <div><Label htmlFor="ev-end">Ends</Label><Input id="ev-end" type="time" {...register('endTime')} /></div>
                  <div>
                    <Label>Shift length</Label>
                    <Controller control={control} name="blockHours" render={({ field }) => (
                      <SimpleSelect value={field.value} onChange={field.onChange} options={['1', '2', '3', '4', '6'].map((h) => ({ value: h, label: `${h} hour${h === '1' ? '' : 's'}` }))} />
                    )} />
                  </div>
                </div>
                <p className="-mt-2 text-xs text-muted-foreground">Times are in IST. If the end is earlier than the start, the event runs past midnight.</p>
                <div><Label htmlFor="ev-desc">Description (optional)</Label><Textarea id="ev-desc" rows={2} placeholder="Shown to volunteers and attendees" {...register('description')} /></div>
              </section>

              {/* 3 crew and zones */}
              {template.zones.length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-sm font-semibold"><span className="mr-2 inline-flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">3</span>Crew size and zones</h2>
                  <Controller control={control} name="crew" render={({ field }) => (
                    <div className="grid gap-2 sm:grid-cols-4">
                      {CREW_SIZES.map((c) => (
                        <button type="button" key={c.id} aria-pressed={field.value === c.id} onClick={() => field.onChange(c.id)}
                          className={cn('rounded-xl border p-3 text-left transition-colors', field.value === c.id ? 'border-primary bg-primary/10' : 'hover:bg-muted/50')}>
                          <p className="text-sm font-medium">{c.label}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{c.hint}</p>
                        </button>
                      ))}
                    </div>
                  )} />
                  <div>
                    <Label>Zones to include</Label>
                    <Controller control={control} name="zones" render={({ field }) => (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {template.zones.map((z) => {
                          const on = field.value.includes(z.name);
                          return (
                            <button type="button" key={z.name} aria-pressed={on} onClick={() => field.onChange(on ? field.value.filter((n) => n !== z.name) : [...field.value, z.name])}
                              className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors', on ? 'border-primary bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted')}>
                              <span className="size-2 rounded-full" style={{ background: z.color }} />{z.name}
                            </button>
                          );
                        })}
                      </div>
                    )} />
                  </div>
                </section>
              )}
            </div>

            {/* summary */}
            <aside className="lg:sticky lg:top-20 lg:self-start">
              <div className="surface space-y-4 p-5">
                <p className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4 text-primary" /> What you will get</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    [Layers, plan?.zones.length ?? 0, 'zones'],
                    [Sparkles, plan?.shifts.length ?? 0, 'shifts'],
                    [Users, plan?.seats ?? 0, 'seats'],
                  ].map(([Icon, n, label], i) => {
                    const I = Icon as typeof Layers;
                    return <div key={i} className="rounded-lg bg-muted/40 p-2.5"><I className="mx-auto mb-1 size-4 text-muted-foreground" /><p className="text-xl font-semibold tabular">{n as number}</p><p className="text-[11px] text-muted-foreground">{label as string}</p></div>;
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {plan && plan.zones.length ? `${blocks} time block${blocks === 1 ? '' : 's'} per zone, plus ${plan.tasks.length} starter task${plan.tasks.length === 1 ? '' : 's'}. ` : 'An empty event: add zones and shifts in Event setup. '}
                  A join code is generated for volunteers and attendees.
                </p>
                {plan && plan.seats > 0 && <p className="rounded-lg bg-info/10 p-2.5 text-xs text-info">At the default 6 hour limit per volunteer you need at least {Math.ceil(plan.seats / Math.max(1, Math.floor(6 / (Number(v.blockHours) || template.blockHours))))} volunteers to staff every seat.</p>}
                <Button type="submit" size="lg" className="h-10 w-full" disabled={saving}>{saving && <Loader2 className="animate-spin" />} Create event</Button>
              </div>
            </aside>
          </form>
        )}
      </main>
    </div>
  );
}
