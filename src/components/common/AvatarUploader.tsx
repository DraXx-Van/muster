'use client';
import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { resizeToSquare } from '@/lib/image';
import { upload } from '@/lib/post';
import { Button } from '@/components/ui/button';
import { PersonAvatar } from './kit';

/** Photo picker: resizes in the browser, uploads through /api/avatar, reports the new URL. */
export function AvatarUploader({ name, src, volunteerId, onUploaded }: { name: string; src?: string | null; volunteerId?: string; onUploaded: (url: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const blob = await resizeToSquare(file);
      const form = new FormData();
      form.append('file', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
      if (volunteerId) form.append('volunteerId', volunteerId);
      const { url } = await upload<{ url: string }>('/api/avatar', form);
      onUploaded(url);
      toast.success('Photo updated');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not upload the photo'); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <PersonAvatar name={name || '?'} src={src} size="xl" />
        {busy && <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50"><Loader2 className="size-5 animate-spin" /></span>}
      </div>
      <div>
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}><Camera /> {src ? 'Change photo' : 'Add a photo'}</Button>
        <p className="mt-1 text-xs text-muted-foreground">JPG or PNG. We crop it to a square.</p>
        <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
      </div>
    </div>
  );
}
