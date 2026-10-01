'use client';
import { useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { post } from '@/lib/post';
import { saveIdentity, type AttendeeIdentity } from '@/lib/attendeeIdentity';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** Change the display name organizers see on your alerts and complaints. */
export function AttendeeNameDialog({ open, onClose, eventId, identity }: { open: boolean; onClose: () => void; eventId: string; identity: AttendeeIdentity }) {
  const [name, setName] = useState(identity.name);
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await post<{ name: string }>('/api/attendee/rename', { eventId, attendeeId: identity.id, token: identity.token, name });
      saveIdentity(eventId, { ...identity, name: r.name });
      toast.success(`You are now ${r.name}`);
      onClose();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not change the name'); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Your name</DialogTitle>
          <DialogDescription>This is how you appear to the organizers.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div><Label htmlFor="an-name">Name</Label><Input id="an-name" autoFocus maxLength={40} value={name} onChange={(e) => setName(e.target.value)} className="h-11" /></div>
          <p className="flex gap-2 rounded-xl bg-accent p-3 text-[13px] leading-snug text-accent-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />The organizers see this name when you send an alert or lodge a complaint. No account or email is needed.</p>
          <Button type="submit" className="w-full" disabled={busy || name.trim().length < 2}>{busy && <Loader2 className="animate-spin" />} Save name</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
