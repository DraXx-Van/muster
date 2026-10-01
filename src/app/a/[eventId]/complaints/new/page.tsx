'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Pencil, Send, Siren } from 'lucide-react';
import { toast } from 'sonner';
import { useAttendee } from '@/lib/attendee';
import { post } from '@/lib/post';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FieldError, PersonAvatar, SimpleSelect } from '@/components/common/kit';
import { COMPLAINT_CATEGORIES } from '@/components/common/complaint';
import { AttendeeNameDialog } from '@/components/attendee/AttendeeNameDialog';

const schema = z.object({
  category: z.enum(['medical', 'safety', 'facilities', 'food', 'crowd', 'staff', 'lost_found', 'other']),
  zone_id: z.string(),
  description: z.string().trim().min(5, 'Tell us what is happening (5+ characters)').max(500),
});
type Values = z.infer<typeof schema>;
const ANY = 'any';

function NewReportForm() {
  const router = useRouter();
  const { zones, eventId, refresh, identity } = useAttendee();
  const [sending, setSending] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  // the home screen's quick buttons pass ?type=medical etc.
  const params = useSearchParams();
  const type = params.get('type');
  const initial: Values['category'] = COMPLAINT_CATEGORIES.some((c) => c.value === type) ? (type as Values['category']) : 'facilities';
  const { register, handleSubmit, control, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { category: initial, zone_id: ANY, description: '' },
  });
  const category = useWatch({ control, name: 'category' });
  const urgent = COMPLAINT_CATEGORIES.find((c) => c.value === category)?.urgent;
  if (!identity) return null;

  const submit = async (v: Values) => {
    setSending(true);
    try {
      const r = await post<{ urgent: boolean }>('/api/complaints', {
        eventId, attendeeId: identity.id, token: identity.token, category: v.category, zone_id: v.zone_id === ANY ? null : v.zone_id, description: v.description,
      });
      toast.success(r.urgent ? 'Alert sent. The on-site team has been notified.' : 'Sent. We will update you here.');
      await refresh();
      router.push(`/a/${eventId}/complaints`);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not send your report'); setSending(false); }
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-5" noValidate>
      <div>
        <h1 className="text-[22px] font-semibold leading-tight tracking-tight">{urgent ? 'Send an alert' : 'Report a problem'}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Tell the organizers what is happening. You can follow progress under My reports.</p>
      </div>

      <button type="button" onClick={() => setNameOpen(true)} className="flex w-full items-center gap-3 rounded-2xl border bg-card p-3 text-left shadow-sm transition-colors hover:bg-muted/50">
        <PersonAvatar name={identity.name} />
        <span className="min-w-0 flex-1"><span className="block text-xs text-muted-foreground">Sending as</span><span className="block truncate font-semibold">{identity.name}</span></span>
        <span className="flex items-center gap-1 text-xs font-medium text-primary"><Pencil className="size-3" /> Change</span>
      </button>
      <p className="-mt-3 px-1 text-xs text-muted-foreground">The organizers see this name next to your report, so they know who to help.</p>

      <div>
        <Label>What is it about?</Label>
        <Controller control={control} name="category" render={({ field }) => (
          <div className="mt-1 grid grid-cols-2 gap-2.5">
            {COMPLAINT_CATEGORIES.map((c) => (
              <button type="button" key={c.value} aria-pressed={field.value === c.value} onClick={() => field.onChange(c.value)}
                className={cn('flex flex-col items-start gap-1.5 rounded-2xl border bg-card p-3 text-left transition-all', field.value === c.value ? (c.urgent ? 'border-gap bg-gap/5 ring-2 ring-gap/20' : 'border-primary bg-primary/5 ring-2 ring-primary/20') : 'hover:bg-muted/50')}>
                <c.icon className={cn('size-[18px]', field.value === c.value ? (c.urgent ? 'text-gap' : 'text-primary') : 'text-muted-foreground')} />
                <span className="text-sm font-semibold leading-tight">{c.label}</span>
                <span className="text-[11px] leading-tight text-muted-foreground">{c.hint}</span>
              </button>
            ))}
          </div>
        )} />
      </div>

      {urgent && (
        <p className="flex gap-2.5 rounded-2xl border border-gap/30 bg-gap/5 p-3 text-[13px] leading-snug"><Siren className="mt-0.5 size-4 shrink-0 text-gap" /><span>This is treated as <span className="font-semibold">urgent</span> and goes straight to the on-site coordinators. In an emergency, also tell the nearest volunteer or the first aid point.</span></p>
      )}

      <div>
        <Label>Where are you?</Label>
        <Controller control={control} name="zone_id" render={({ field }) => (
          <SimpleSelect value={field.value} onChange={field.onChange} className="h-11" options={[{ value: ANY, label: 'Not sure or everywhere' }, ...zones.map((z) => ({ value: z.id, label: z.name }))]} />
        )} />
      </div>

      <div>
        <Label htmlFor="c-desc">What is happening?</Label>
        <Textarea id="c-desc" rows={4} placeholder="Be specific so the organizers can act on it quickly" aria-invalid={!!errors.description} {...register('description')} />
        <FieldError message={errors.description?.message} />
      </div>

      <Button type="submit" size="lg" variant={urgent ? 'destructive' : 'default'} className="h-12 w-full text-base" disabled={sending}>{sending ? <Loader2 className="animate-spin" /> : <Send />} {urgent ? 'Send alert now' : 'Send report'}</Button>
      <AttendeeNameDialog open={nameOpen} onClose={() => setNameOpen(false)} eventId={eventId} identity={identity} />
    </form>
  );
}

export default function NewReport() {
  return <Suspense><NewReportForm /></Suspense>;
}
