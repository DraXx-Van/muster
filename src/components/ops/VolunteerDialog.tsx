'use client';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SKILLS, type Snapshot } from '@/lib/types';
import { createVolunteer } from '@/lib/db/queries';
import { timeBlocks } from '@/lib/derive';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/common/kit';

const schema = z.object({
  name: z.string().trim().min(2, 'Enter the full name').max(80),
  phone: z.string().trim().regex(/^\+?[\d\s-]{10,15}$/, 'Enter a valid phone number (10+ digits)'),
  email: z.string().trim().email('Enter a valid email address'),
  skills: z.array(z.string()).min(1, 'Pick at least one skill'),
  blocks: z.array(z.string()).min(1, 'Pick at least one time block they can work'),
  zones: z.array(z.string()),
  max_hours: z.number({ error: 'Enter a number' }).min(1, 'At least 1 hour').max(12, 'At most 12 hours'),
});
type Values = z.infer<typeof schema>;

function Chips({ options, value, onChange }: { options: { value: string; label: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button type="button" key={o.value} aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== o.value) : [...value, o.value])}
            className={cn('rounded-full border px-2.5 py-1 text-xs transition-colors', on ? 'border-primary bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Register a volunteer: skills, availability (as event time blocks), preferred zones, max hours. */
export function VolunteerDialog({ open, onClose, snap, onCreated }: { open: boolean; onClose: () => void; snap: Snapshot; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const blocks = useMemo(() => timeBlocks(snap.shifts), [snap.shifts]);
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', email: '', skills: [], blocks: [], zones: [], max_hours: 6 },
  });

  const submit = async (v: Values) => {
    setSaving(true);
    try {
      // merge touching blocks into continuous availability windows
      const chosen = blocks.filter((b) => v.blocks.includes(b.key)).sort((a, b) => a.start.localeCompare(b.start));
      const windows: { start: string; end: string }[] = [];
      for (const b of chosen) {
        const last = windows[windows.length - 1];
        if (last && last.end === b.start) last.end = b.end;
        else windows.push({ start: b.start, end: b.end });
      }
      await createVolunteer({
        event_id: snap.event.id, name: v.name, phone: v.phone, email: v.email, role: 'volunteer', skills: v.skills,
        availability: windows, preferred_zone_ids: v.zones, max_hours: v.max_hours, reliability: 1, verified: false,
      });
      toast.success(`${v.name} registered`, { description: 'Run auto-assign to place them.' });
      reset();
      onCreated();
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not register the volunteer'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Register volunteer</DialogTitle>
          <DialogDescription>Skills and availability drive automatic shift assignment.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="v-name">Full name</Label>
            <Input id="v-name" aria-invalid={!!errors.name} {...register('name')} />
            <FieldError message={errors.name?.message} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="v-phone">Phone</Label>
              <Input id="v-phone" inputMode="tel" placeholder="+91 98765 43210" aria-invalid={!!errors.phone} {...register('phone')} />
              <FieldError message={errors.phone?.message} />
            </div>
            <div>
              <Label htmlFor="v-email">Email</Label>
              <Input id="v-email" type="email" aria-invalid={!!errors.email} {...register('email')} />
              <FieldError message={errors.email?.message} />
            </div>
          </div>
          <div>
            <Label>Skills</Label>
            <Controller control={control} name="skills" render={({ field }) => <Chips options={SKILLS.map((s) => ({ value: s, label: s }))} value={field.value} onChange={field.onChange} />} />
            <FieldError message={errors.skills?.message} />
          </div>
          <div>
            <Label>Available during</Label>
            <Controller control={control} name="blocks" render={({ field }) => (
              <>
                <Chips options={blocks.map((b) => ({ value: b.key, label: b.label }))} value={field.value} onChange={field.onChange} />
                <button type="button" className="mt-1.5 text-xs text-primary hover:underline" onClick={() => field.onChange(blocks.map((b) => b.key))}>Select the whole day</button>
              </>
            )} />
            <FieldError message={errors.blocks?.message} />
          </div>
          <div>
            <Label>Preferred zones (optional)</Label>
            <Controller control={control} name="zones" render={({ field }) => <Chips options={snap.zones.map((z) => ({ value: z.id, label: z.name }))} value={field.value} onChange={field.onChange} />} />
          </div>
          <div className="w-40">
            <Label htmlFor="v-max">Max hours</Label>
            <Input id="v-max" type="number" step="0.5" aria-invalid={!!errors.max_hours} {...register('max_hours', { valueAsNumber: true })} />
            <FieldError message={errors.max_hours?.message} />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>{saving && <Loader2 className="animate-spin" />} Register volunteer</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
