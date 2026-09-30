'use client';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Snapshot } from '@/lib/types';
import { createTask } from '@/lib/db/queries';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FieldError, SimpleSelect } from '@/components/common/kit';

const schema = z.object({
  title: z.string().trim().min(3, 'Give the task a short title (3+ characters)').max(120),
  zone_id: z.string().min(1, 'Pick a zone'),
  priority: z.enum(['low', 'medium', 'high']),
  assignee_id: z.string(),
  description: z.string().max(500),
});
type Values = z.infer<typeof schema>;

const NONE = 'none';

export function TaskDialog({ open, onClose, snap, defaultZone, createdBy, onCreated }: {
  open: boolean; onClose: () => void; snap: Snapshot; defaultZone?: string; createdBy: string | null; onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', zone_id: defaultZone ?? '', priority: 'medium', assignee_id: NONE, description: '' },
  });

  const submit = async (v: Values) => {
    setSaving(true);
    try {
      await createTask({
        event_id: snap.event.id, title: v.title, zone_id: v.zone_id, priority: v.priority,
        assignee_id: v.assignee_id === NONE ? null : v.assignee_id, description: v.description || null, created_by: createdBy,
      });
      toast.success('Task created');
      reset({ title: '', zone_id: v.zone_id, priority: 'medium', assignee_id: NONE, description: '' });
      onCreated();
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not create the task'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>On-ground work for a zone. Everyone in that zone can see it.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="space-y-3" noValidate>
          <div>
            <Label htmlFor="t-title">Title</Label>
            <Input id="t-title" placeholder="e.g. Restock water at the Food Court" aria-invalid={!!errors.title} {...register('title')} />
            <FieldError message={errors.title?.message} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Zone</Label>
              <Controller control={control} name="zone_id" render={({ field }) => (
                <SimpleSelect value={field.value} onChange={field.onChange} placeholder="Pick a zone" options={snap.zones.map((z) => ({ value: z.id, label: z.name }))} />
              )} />
              <FieldError message={errors.zone_id?.message} />
            </div>
            <div>
              <Label>Priority</Label>
              <Controller control={control} name="priority" render={({ field }) => (
                <SimpleSelect value={field.value} onChange={field.onChange} options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]} />
              )} />
            </div>
          </div>
          <div>
            <Label>Assign to (optional)</Label>
            <Controller control={control} name="assignee_id" render={({ field }) => (
              <SimpleSelect value={field.value} onChange={field.onChange}
                options={[{ value: NONE, label: 'Unassigned' }, ...snap.volunteers.map((v) => ({ value: v.id, label: v.name }))]} />
            )} />
          </div>
          <div>
            <Label htmlFor="t-desc">Notes (optional)</Label>
            <Textarea id="t-desc" rows={2} {...register('description')} />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>{saving && <Loader2 className="animate-spin" />} Create task</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
