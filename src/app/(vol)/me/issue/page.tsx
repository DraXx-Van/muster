'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '@/lib/data';
import { useSessionId } from '@/lib/session';
import { post } from '@/lib/post';
import { ms } from '@/lib/engine/time';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FieldError, SimpleSelect } from '@/components/common/kit';
import { CATEGORY, SEVERITY } from '@/components/ops/IssueParts';

const schema = z.object({
  category: z.enum(['medical', 'crowd_surge', 'missing_equipment', 'security', 'other']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  zone_id: z.string().min(1, 'Pick the zone'),
  description: z.string().trim().min(5, 'Tell us what is happening (5+ characters)').max(400),
});
type Values = z.infer<typeof schema>;

export default function ReportIssuePage() {
  const router = useRouter();
  const { snap, now, refresh } = useData();
  const me = useSessionId();
  const [sending, setSending] = useState(false);

  // default to the zone of the volunteer's current (or next) shift
  const t = now.getTime();
  const myShift = snap?.assignments
    .filter((a) => a.volunteer_id === me)
    .map((a) => snap.shifts.find((s) => s.id === a.shift_id))
    .filter((s): s is NonNullable<typeof s> => !!s && ms(s.ends_at) > t)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];

  const { register, handleSubmit, control, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'medical', severity: 'high', zone_id: myShift?.zone_id ?? '', description: '' },
  });
  if (!snap) return null;

  const submit = async (v: Values) => {
    setSending(true);
    try {
      await post('/api/issues', { ...v, raised_by: me });
      toast.success('Issue sent', { description: 'Your zone coordinator has been alerted.' });
      await refresh();
      router.push('/me');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not send the issue'); }
    finally { setSending(false); }
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <div>
        <h1 className="text-lg font-semibold">Report an issue</h1>
        <p className="text-sm text-muted-foreground">It goes straight to the right coordinator. For life-threatening emergencies, also call the on-site number.</p>
      </div>

      <div>
        <Label>What kind of issue?</Label>
        <Controller control={control} name="category" render={({ field }) => (
          <div className="mt-1 grid grid-cols-2 gap-2">
            {Object.entries(CATEGORY).map(([value, c]) => (
              <button type="button" key={value} aria-pressed={field.value === value} onClick={() => field.onChange(value)}
                className={cn('flex items-center gap-2 rounded-xl border p-3 text-left text-sm transition-colors', field.value === value ? 'border-primary bg-primary/10' : 'hover:bg-muted/60')}>
                <c.icon className={cn('size-4', field.value === value ? 'text-primary' : 'text-muted-foreground')} />{c.label}
              </button>
            ))}
          </div>
        )} />
      </div>

      <div>
        <Label>How urgent?</Label>
        <Controller control={control} name="severity" render={({ field }) => (
          <div className="mt-1 grid grid-cols-4 gap-1.5">
            {(['low', 'medium', 'high', 'critical'] as const).map((s) => (
              <button type="button" key={s} aria-pressed={field.value === s} onClick={() => field.onChange(s)}
                className={cn('rounded-lg border py-2 text-xs font-medium capitalize transition-colors', field.value === s ? cn('border-transparent', SEVERITY[s].bg, SEVERITY[s].text) : 'text-muted-foreground hover:bg-muted/60')}>{s}</button>
            ))}
          </div>
        )} />
      </div>

      <div>
        <Label>Where?</Label>
        <Controller control={control} name="zone_id" render={({ field }) => (
          <SimpleSelect value={field.value} onChange={field.onChange} placeholder="Pick a zone" options={snap.zones.map((z) => ({ value: z.id, label: z.name }))} />
        )} />
        <FieldError message={errors.zone_id?.message} />
      </div>

      <div>
        <Label htmlFor="desc">What is happening?</Label>
        <Textarea id="desc" rows={4} placeholder="Short and specific helps coordinators act fast" aria-invalid={!!errors.description} {...register('description')} />
        <FieldError message={errors.description?.message} />
      </div>

      <Button type="submit" variant="destructive" size="lg" className="h-12 w-full text-base" disabled={sending}>{sending ? <Loader2 className="animate-spin" /> : <Send />} Send to coordinator</Button>
    </form>
  );
}
