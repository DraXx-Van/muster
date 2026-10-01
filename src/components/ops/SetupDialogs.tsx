'use client';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SKILLS, type Shift, type Snapshot, type Zone } from '@/lib/types';
import { createShifts, createZone, updateShift, updateZone } from '@/lib/db/queries';
import { fmtTime } from '@/lib/engine';
import { autoLayout } from '@/lib/templates';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError, SimpleSelect } from '@/components/common/kit';

const COLORS = ['#6366f1', '#0ea5e9', '#a855f7', '#ef4444', '#14b8a6', '#f59e0b', '#64748b', '#22c55e', '#ec4899'];

// ---------------- zone ----------------
const zoneSchema = z.object({
  name: z.string().trim().min(2, 'Give the zone a name').max(40),
  color: z.string(),
  map_x: z.number({ error: 'Number' }).min(0).max(780),
  map_y: z.number({ error: 'Number' }).min(0).max(460),
  map_w: z.number({ error: 'Number' }).min(40, 'Min 40').max(780),
  map_h: z.number({ error: 'Number' }).min(40, 'Min 40').max(460),
  coordinator_id: z.string(),
});
type ZoneValues = z.infer<typeof zoneSchema>;
const NONE = 'none';

export function ZoneDialog({ open, onClose, snap, zone, onSaved }: { open: boolean; onClose: () => void; snap: Snapshot; zone: Zone | null; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const staff = snap.volunteers.filter((v) => v.role !== 'volunteer');
  const { register, handleSubmit, control, formState: { errors } } = useForm<ZoneValues>({
    resolver: zodResolver(zoneSchema),
    defaultValues: zone
      ? { name: zone.name, color: zone.color, map_x: zone.map_x, map_y: zone.map_y, map_w: zone.map_w, map_h: zone.map_h, coordinator_id: zone.coordinator_id ?? NONE }
      : { name: '', color: COLORS[snap.zones.length % COLORS.length], ...autoLayout(snap.zones.length + 1)[snap.zones.length], coordinator_id: NONE },
  });

  const submit = async (v: ZoneValues) => {
    setSaving(true);
    try {
      const row = { ...v, coordinator_id: v.coordinator_id === NONE ? null : v.coordinator_id };
      if (zone) await updateZone(zone.id, row);
      else await createZone({ ...row, event_id: snap.event.id });
      toast.success(zone ? 'Zone updated' : 'Zone created');
      onSaved();
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save the zone'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{zone ? 'Edit zone' : 'New zone'}</DialogTitle>
          <DialogDescription>A physical area. Its position sets where it appears on the venue map (800 x 480).</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="space-y-3" noValidate>
          <div>
            <Label htmlFor="z-name">Name</Label>
            <Input id="z-name" aria-invalid={!!errors.name} {...register('name')} />
            <FieldError message={errors.name?.message} />
          </div>
          <div>
            <Label>Colour</Label>
            <Controller control={control} name="color" render={({ field }) => (
              <div className="mt-1 flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button type="button" key={c} aria-label={c} aria-pressed={field.value === c} onClick={() => field.onChange(c)}
                    className={cn('size-7 rounded-full ring-offset-2 ring-offset-popover transition-all', field.value === c ? 'ring-2 ring-foreground' : 'opacity-70 hover:opacity-100')} style={{ background: c }} />
                ))}
              </div>
            )} />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(['map_x', 'map_y', 'map_w', 'map_h'] as const).map((k) => (
              <div key={k}>
                <Label htmlFor={k}>{k === 'map_x' ? 'X' : k === 'map_y' ? 'Y' : k === 'map_w' ? 'Width' : 'Height'}</Label>
                <Input id={k} type="number" {...register(k, { valueAsNumber: true })} />
                <FieldError message={errors[k]?.message} />
              </div>
            ))}
          </div>
          <div>
            <Label>Zone coordinator</Label>
            <Controller control={control} name="coordinator_id" render={({ field }) => (
              <SimpleSelect value={field.value} onChange={field.onChange} options={[{ value: NONE, label: 'Not assigned' }, ...staff.map((s) => ({ value: s.id, label: s.name }))]} />
            )} />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>{saving && <Loader2 className="animate-spin" />} {zone ? 'Save zone' : 'Create zone'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------- shift ----------------
const shiftSchema = z.object({
  zone_id: z.string().min(1, 'Pick a zone'),
  role_name: z.string().trim().min(2, 'Name the role').max(50),
  skills: z.array(z.string()),
  start: z.string().regex(/^\d{2}:\d{2}$/, 'Pick a start time'),
  end: z.string().regex(/^\d{2}:\d{2}$/, 'Pick an end time'),
  headcount: z.number({ error: 'Enter a number' }).int('Whole people only').min(1, 'At least 1').max(50),
}).refine((v) => v.end > v.start, { path: ['end'], message: 'End must be after start' });
type ShiftValues = z.infer<typeof shiftSchema>;

const dayOf = (snap: Snapshot) => new Date(snap.event.starts_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
export const atIST = (snap: Snapshot, hhmm: string) => new Date(`${dayOf(snap)}T${hhmm}:00+05:30`).toISOString();

export function ShiftDialog({ open, onClose, snap, shift, defaultZone, onSaved }: { open: boolean; onClose: () => void; snap: Snapshot; shift: Shift | null; defaultZone?: string; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, control, formState: { errors } } = useForm<ShiftValues>({
    resolver: zodResolver(shiftSchema),
    defaultValues: shift
      ? { zone_id: shift.zone_id, role_name: shift.role_name, skills: shift.required_skills, start: fmtTime(shift.starts_at), end: fmtTime(shift.ends_at), headcount: shift.headcount }
      : { zone_id: defaultZone ?? '', role_name: '', skills: [], start: '09:00', end: '12:00', headcount: 2 },
  });

  const submit = async (v: ShiftValues) => {
    setSaving(true);
    try {
      const row = { zone_id: v.zone_id, role_name: v.role_name, required_skills: v.skills, starts_at: atIST(snap, v.start), ends_at: atIST(snap, v.end), headcount: v.headcount };
      if (shift) await updateShift(shift.id, row);
      else await createShifts([{ ...row, event_id: snap.event.id }]);
      toast.success(shift ? 'Shift updated' : 'Shift created', { description: 'It is already in the dashboard and the assignment engine.' });
      onSaved();
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save the shift'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{shift ? 'Edit shift' : 'New shift'}</DialogTitle>
          <DialogDescription>Each seat of the headcount is filled by a volunteer with all the required skills.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="space-y-3" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Zone</Label>
              <Controller control={control} name="zone_id" render={({ field }) => <SimpleSelect value={field.value} onChange={field.onChange} placeholder="Pick a zone" options={snap.zones.map((z) => ({ value: z.id, label: z.name }))} />} />
              <FieldError message={errors.zone_id?.message} />
            </div>
            <div>
              <Label htmlFor="s-role">Role</Label>
              <Input id="s-role" placeholder="e.g. Gate Steward" aria-invalid={!!errors.role_name} {...register('role_name')} />
              <FieldError message={errors.role_name?.message} />
            </div>
          </div>
          <div>
            <Label>Required skills (all of them)</Label>
            <Controller control={control} name="skills" render={({ field }) => (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {SKILLS.map((s) => {
                  const on = field.value.includes(s);
                  return (
                    <button type="button" key={s} aria-pressed={on} onClick={() => field.onChange(on ? field.value.filter((x) => x !== s) : [...field.value, s])}
                      className={cn('rounded-full border px-2.5 py-1 text-xs transition-colors', on ? 'border-primary bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>{s}</button>
                  );
                })}
              </div>
            )} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label htmlFor="s-start">Starts</Label><Input id="s-start" type="time" {...register('start')} /><FieldError message={errors.start?.message} /></div>
            <div><Label htmlFor="s-end">Ends</Label><Input id="s-end" type="time" {...register('end')} /><FieldError message={errors.end?.message} /></div>
            <div><Label htmlFor="s-hc">Headcount</Label><Input id="s-hc" type="number" {...register('headcount', { valueAsNumber: true })} /><FieldError message={errors.headcount?.message} /></div>
          </div>
          <Button type="submit" className="w-full" disabled={saving}>{saving && <Loader2 className="animate-spin" />} {shift ? 'Save shift' : 'Create shift'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
