'use client';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { updateProfile } from '@/lib/db/queries';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AvatarUploader } from './AvatarUploader';

/** Edit your own account: photo, name and phone. Used from every signed-in area. */
export function AccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, reloadProfile } = useAuth();
  if (!profile) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Your account</DialogTitle>
          <DialogDescription>{profile.email} · {profile.account_type} account</DialogDescription>
        </DialogHeader>
        <AccountForm key={profile.id} onSaved={onClose} reload={reloadProfile} />
      </DialogContent>
    </Dialog>
  );
}

function AccountForm({ onSaved, reload }: { onSaved: () => void; reload: () => Promise<void> }) {
  const { profile } = useAuth();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);
  if (!profile) return null;

  const save = async () => {
    if (name.trim().length < 2) { toast.error('Enter your full name'); return; }
    setSaving(true);
    try {
      await updateProfile(profile.id, { full_name: name.trim(), phone: phone.trim() || null });
      await reload();
      toast.success('Account updated');
      onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <AvatarUploader name={profile.full_name} src={profile.avatar_url} onUploaded={() => void reload()} />
      <div><Label htmlFor="acc-name">Full name</Label><Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div><Label htmlFor="acc-phone">Phone</Label><Input id="acc-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
      <Button className="w-full" onClick={save} disabled={saving}>{saving && <Loader2 className="animate-spin" />} Save changes</Button>
    </div>
  );
}
