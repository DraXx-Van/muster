'use client';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Snapshot } from '@/lib/types';
import { post } from '@/lib/post';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FieldError, SimpleSelect } from '@/components/common/kit';
import { ACK_SECONDS } from '@/lib/engine';
import { CATEGORY } from './IssueParts';

const schema = z.object({
  category: z.enum(['medical', 'crowd_surge', 'missing_equipment', 'security', 'other']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  zone_id: z.string().min(1, 'Pick the zone it is happening in'),
  description: z.string().trim().min(5, 'Describe what is happening (5+ characters)').max(400),
});
type Values = z.infer<typeof schema>;

/** Raise an issue. It is routed to the zone coordinator server-side and escalates if nobody acknowledges it. */
export function IssueDialog({ open, onClose, snap, raisedBy, defaultZone, onCreated }: {
  open: boolean; onClose: () => void; snap: Snapshot; raisedBy: string | null; defaultZone?: string; onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'medical', severity: 'high', zone_id: defaultZone ?? '', description: '' },
  });
  const severity = useWatch({ control, name: 'severity' });

  const submit = async (v: Values) => {
    setSaving(true);
    try {
      await post('/api/issues', { ...v, raised_by: raisedBy });
      toast.success('Issue raised', { description: 'The zone coordinator has been alerted.' });
      reset({ category: 'medical', severity: 'high', zone_id: v.zone_id, description: '' });
      onCreated();
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not raise the issue'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Raise an issue</DialogTitle>
          <DialogDescription>Auto-routed to the right coordinator. Unacknowledged issues escalate by themselves.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="space-y-3" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Controller control={control} name="category" render={({ field }) => (
                <SimpleSelect value={field.value} onChange={field.onChange} options={Object.entries(CATEGORY).map(([value, c]) => ({ value, label: c.label }))} />
              )} />
            </div>
            <div>
              <Label>Severity</Label>
              <Controller control={control} name="severity" render={({ field }) => (
                <SimpleSelect value={field.value} onChange={field.onChange} options={['low', 'medium', 'high', 'critical'].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))} />
              )} />
            </div>
          </div>
          <p className="-mt-1 text-xs text-muted-foreground">Acknowledge window for {severity}: <span className="font-medium text-foreground">{ACK_SECONDS[severity]} s</span> (compressed for the demo)</p>
          <div>
            <Label>Zone</Label>
            <Controller control={control} name="zone_id" render={({ field }) => (
              <SimpleSelect value={field.value} onChange={field.onChange} placeholder="Where is it happening?" options={snap.zones.map((z) => ({ value: z.id, label: z.name }))} />
            )} />
            <FieldError message={errors.zone_id?.message} />
          </div>
          <div>
            <Label htmlFor="i-desc">What is happening?</Label>
            <Textarea id="i-desc" rows={3} placeholder="Short and specific, e.g. 'Two people need a first aider at the north barricade'" aria-invalid={!!errors.description} {...register('description')} />
            <FieldError message={errors.description?.message} />
          </div>
          <Button type="submit" variant="destructive" className="w-full" disabled={saving}>{saving && <Loader2 className="animate-spin" />} Raise issue</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
