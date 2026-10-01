'use client';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SKILLS, type Snapshot, type Volunteer } from '@/lib/types';
import { createVolunteer, updateVolunteer } from '@/lib/db/queries';
import { useAuth } from '@/lib/auth';
import { timeBlocks } from '@/lib/derive';
import { ms } from '@/lib/engine/time';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AvatarUploader } from '@/components/common/AvatarUploader';
import { FieldError } from '@/components/common/kit';

const schema = z.object({
  name: z.string().trim().min(2, 'Enter the full name').max(80),
  phone: z.string().trim().refine((v) => v === '' || /^\+?[\d\s-]{10,15}$/.test(v), 'Enter a valid phone number (10+ digits)'),
  email: z.string().trim().refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Enter a valid email address'),
  skills: z.array(z.string()),
  blocks: z.array(z.string()).min(1, 'Pick at least one time block they can work'),
  zones: z.array(z.string()),
  max_hours: z.number({ error: 'Enter a number' }).min(1, 'At least 1 hour').max(16, 'At most 16 hours'),
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

/** Which time blocks does this volunteer's availability fully cover? */
function coveredBlocks(v: Volunteer, snap: Snapshot): string[] {
  return timeBlocks(snap.shifts).filter((b) => v.availability.some((w) => ms(w.start) <= ms(b.start) && ms(w.end) >= ms(b.end))).map((b) => b.key);
}

const dayFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', weekday: 'short' });

type Mode = 'create' | 'edit' | 'self';

/**
 * Volunteer form. create: a coordinator adds a roster entry. edit: a coordinator edits one.
 * self: a volunteer edits their own skills, availability, preferred zones and hours (name and photo live in their account).
 */
export function VolunteerForm({ snap, mode, volunteer, onDone }: { snap: Snapshot; mode: Mode; volunteer?: Volunteer | null; onDone: () => void }) {
  const [saving, setSaving] = useState(false);
  const { reloadProfile, profile } = useAuth();
  const blocks = useMemo(() => timeBlocks(snap.shifts), [snap.shifts]);
  const multiDay = blocks.length > 0 && Date.parse(blocks[blocks.length - 1].end) - Date.parse(blocks[0].start) > 24 * 3_600_000;
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: volunteer
      ? { name: volunteer.name, phone: volunteer.phone ?? '', email: volunteer.email ?? '', skills: volunteer.skills, blocks: coveredBlocks(volunteer, snap), zones: volunteer.preferred_zone_ids, max_hours: volunteer.max_hours }
      : { name: '', phone: '', email: '', skills: [], blocks: [], zones: [], max_hours: 6 },
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
      const common = { skills: v.skills, availability: windows, preferred_zone_ids: v.zones, max_hours: v.max_hours };
      if (mode === 'create') {
        await createVolunteer({ ...common, event_id: snap.event.id, name: v.name, phone: v.phone || null, email: v.email || null, role: 'volunteer', reliability: 1, verified: false });
        toast.success(`${v.name} added to the roster`, { description: 'Run auto-assign to place them.' });
        reset();
      } else if (mode === 'edit' && volunteer) {
        await updateVolunteer(volunteer.id, { ...common, name: v.name, phone: v.phone || null, email: v.email || null });
        toast.success('Volunteer updated');
      } else if (volunteer) {
        await updateVolunteer(volunteer.id, common);
        toast.success('Saved. Coordinators will use this when assigning shifts.');
      }
      onDone();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save'); }
    finally { setSaving(false); }
  };

  const showContact = mode !== 'self';
  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      {mode === 'self' && profile && <AvatarUploader name={profile.full_name} src={profile.avatar_url} onUploaded={() => void reloadProfile()} />}
      {mode === 'edit' && volunteer && <AvatarUploader name={volunteer.name} src={volunteer.avatar_url} volunteerId={volunteer.id} onUploaded={onDone} />}
      {showContact && (
        <>
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
        </>
      )}
      <div>
        <Label>Skills</Label>
        <Controller control={control} name="skills" render={({ field }) => <Chips options={SKILLS.map((s) => ({ value: s, label: s }))} value={field.value} onChange={field.onChange} />} />
        <p className="mt-1 text-xs text-muted-foreground">Shifts that need a skill are only given to people who have it.</p>
      </div>
      <div>
        <Label>Available during</Label>
        <Controller control={control} name="blocks" render={({ field }) => (
          <>
            {blocks.length === 0 ? <p className="text-sm text-muted-foreground">No shifts exist yet. The coordinator needs to set them up first.</p> : <Chips options={blocks.map((b) => ({ value: b.key, label: multiDay ? `${dayFmt.format(new Date(b.start))} ${b.label}` : b.label }))} value={field.value} onChange={field.onChange} />}
            {blocks.length > 0 && <button type="button" className="mt-1.5 text-xs text-primary hover:underline" onClick={() => field.onChange(blocks.map((b) => b.key))}>Select everything</button>}
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
      <Button type="submit" className="w-full" disabled={saving}>{saving && <Loader2 className="animate-spin" />} {mode === 'create' ? 'Add to roster' : 'Save'}</Button>
    </form>
  );
}

export function VolunteerDialog({ open, onClose, snap, volunteer, onCreated }: { open: boolean; onClose: () => void; snap: Snapshot; volunteer?: Volunteer | null; onCreated: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{volunteer ? `Edit ${volunteer.name}` : 'Add a volunteer by hand'}</DialogTitle>
          <DialogDescription>{volunteer ? 'Skills and availability drive automatic shift assignment.' : 'For people without a login. Volunteers can also sign up themselves with your join code.'}</DialogDescription>
        </DialogHeader>
        {open && <VolunteerForm key={volunteer?.id ?? 'new'} snap={snap} mode={volunteer ? 'edit' : 'create'} volunteer={volunteer} onDone={() => { onCreated(); onClose(); }} />}
      </DialogContent>
    </Dialog>
  );
}
