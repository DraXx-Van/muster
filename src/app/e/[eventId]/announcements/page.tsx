'use client';
import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, Globe2, HandHeart, Loader2, MapPin, Megaphone, Send, Ticket, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '@/lib/data';
import { post } from '@/lib/post';
import { recipientCount, volunteerName, zoneName } from '@/lib/derive';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState, ErrorState, FieldError, PageHeader, PageSkeleton, SectionCard, SimpleSelect } from '@/components/common/kit';
import { ago } from '@/components/dashboard/LiveFeed';

const schema = z.object({
  audience: z.enum(['all', 'volunteers', 'attendees', 'zone', 'role']),
  zone_id: z.string(),
  role_name: z.string(),
  title: z.string().trim().min(3, 'Add a short headline (3+ characters)').max(80),
  body: z.string().trim().min(5, 'Write the message (5+ characters)').max(400),
  urgent: z.boolean(),
}).superRefine((v, ctx) => {
  if (v.audience === 'zone' && !v.zone_id) ctx.addIssue({ code: 'custom', path: ['zone_id'], message: 'Pick a zone' });
  if (v.audience === 'role' && !v.role_name) ctx.addIssue({ code: 'custom', path: ['role_name'], message: 'Pick a role' });
});
type Values = z.infer<typeof schema>;

const AUDIENCES = [
  { value: 'all', label: 'Everyone', icon: Globe2 },
  { value: 'volunteers', label: 'Volunteers', icon: HandHeart },
  { value: 'attendees', label: 'Attendees', icon: Ticket },
  { value: 'zone', label: 'A zone', icon: MapPin },
  { value: 'role', label: 'A role', icon: UserCog },
] as const;

export default function AnnouncementsPage() {
  const { snap, error, refresh, real, eventId, me } = useData();
  const [sending, setSending] = useState(false);
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { audience: 'all', zone_id: '', role_name: '', title: '', body: '', urgent: false },
  });
  const v = useWatch({ control });
  const roles = useMemo(() => [...new Set(snap?.shifts.map((s) => s.role_name) ?? [])].sort(), [snap]);

  if (error && !snap) return <ErrorState message={error.message} onRetry={() => void refresh()} />;
  if (!snap) return <PageSkeleton />;

  const reach = recipientCount(snap, v.audience ?? 'all', v.zone_id ?? '', v.role_name ?? '', me?.id);

  const send = async (vals: Values) => {
    setSending(true);
    try {
      const r = await post<{ recipients: number; attendees: number }>('/api/announce', { eventId, ...vals, zone_id: vals.audience === 'zone' ? vals.zone_id : null, role_name: vals.audience === 'role' ? vals.role_name : null });
      const total = r.recipients + r.attendees;
      toast.success(`Sent to ${total} ${total === 1 ? 'person' : 'people'}`, { description: vals.urgent ? 'Marked urgent' : undefined });
      reset({ ...vals, title: '', body: '', urgent: false });
      await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not send the announcement'); }
    finally { setSending(false); }
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-5">
      <div className="lg:col-span-5"><PageHeader icon={Megaphone} title="Announcements" description="Broadcast to everyone, one zone or one role. Each recipient gets a live alert on their phone." /></div>

      <SectionCard title="New announcement" className="lg:col-span-2 lg:self-start">
        <form onSubmit={handleSubmit(send)} className="space-y-4" noValidate>
          <div>
            <Label>Send to</Label>
            <Controller control={control} name="audience" render={({ field }) => (
              <div className="mt-1 flex flex-wrap gap-1.5 rounded-lg bg-muted/50 p-1">
                {AUDIENCES.map((a) => (
                  <button type="button" key={a.value} onClick={() => field.onChange(a.value)}
                    className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors', field.value === a.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                    <a.icon className="size-3.5" />{a.label}
                  </button>
                ))}
              </div>
            )} />
          </div>
          {v.audience === 'zone' && (
            <div>
              <Label>Zone</Label>
              <Controller control={control} name="zone_id" render={({ field }) => <SimpleSelect value={field.value} onChange={field.onChange} placeholder="Pick a zone" options={snap.zones.map((z) => ({ value: z.id, label: z.name }))} />} />
              <FieldError message={errors.zone_id?.message} />
            </div>
          )}
          {v.audience === 'role' && (
            <div>
              <Label>Role</Label>
              <Controller control={control} name="role_name" render={({ field }) => <SimpleSelect value={field.value} onChange={field.onChange} placeholder="Pick a role" options={roles.map((r) => ({ value: r, label: r }))} />} />
              <FieldError message={errors.role_name?.message} />
            </div>
          )}
          <div>
            <Label htmlFor="a-title">Headline</Label>
            <Input id="a-title" placeholder="e.g. Stage schedule moved up by 15 minutes" aria-invalid={!!errors.title} {...register('title')} />
            <FieldError message={errors.title?.message} />
          </div>
          <div>
            <Label htmlFor="a-body">Message</Label>
            <Textarea id="a-body" rows={4} aria-invalid={!!errors.body} {...register('body')} />
            <FieldError message={errors.body?.message} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div><p className="text-sm font-medium">Mark as urgent</p><p className="text-xs text-muted-foreground">Shown with a warning on phones</p></div>
            <Controller control={control} name="urgent" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Reaches <span className="font-semibold text-foreground tabular">{reach}</span> {reach === 1 ? 'person' : 'people'}</p>
            <Button type="submit" disabled={sending || reach === 0}>{sending ? <Loader2 className="animate-spin" /> : <Send />} Send</Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="History" description={`${snap.announcements.length} sent`} className="lg:col-span-3">
        {snap.announcements.length === 0 ? (
          <EmptyState icon={Megaphone} title="No announcements yet" description="Your first broadcast will show up here, and on every recipient's phone." className="py-10" />
        ) : (
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {snap.announcements.map((a) => (
                <motion.li key={a.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className={cn('rounded-lg border p-3', a.urgent && 'border-partial/40 bg-partial/5')}>
                  <div className="flex items-center gap-2">
                    {a.urgent && <BellRing className="size-4 text-partial" />}
                    <p className="font-medium">{a.title}</p>
                    <span className="ml-auto text-xs text-muted-foreground tabular">{ago(real.getTime() - new Date(a.created_at).getTime())}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="rounded-md border px-1.5 py-0.5">{a.audience === 'all' ? 'Everyone' : a.audience === 'volunteers' ? 'Volunteers' : a.audience === 'attendees' ? 'Attendees' : a.audience === 'zone' ? zoneName(snap.zones, a.zone_id) : a.role_name}</span>
                    {a.created_by && <span>by {volunteerName(snap.volunteers, a.created_by)}</span>}
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
