'use client';
import { useRef, useState } from 'react';
import { ImagePlus, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import type { EventRow } from '@/lib/types';
import { resizeToCover } from '@/lib/image';
import { upload } from '@/lib/post';
import { updateEvent } from '@/lib/db/queries';
import { Button } from '@/components/ui/button';
import { EventCover } from './visual';

/** Event cover: upload a banner image, or fall back to the generated art. */
export function CoverUploader({ event, onChanged }: { event: EventRow; onChanged: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const blob = await resizeToCover(file);
      const form = new FormData();
      form.append('file', new File([blob], 'cover.jpg', { type: 'image/jpeg' }));
      form.append('eventId', event.id);
      await upload('/api/cover', form);
      toast.success('Cover updated');
      onChanged();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not upload the cover'); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  };

  const reset = async () => {
    setBusy(true);
    try { await updateEvent(event.id, { cover_url: null }); toast.success('Using the generated cover'); onChanged(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not reset the cover'); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border">
        <EventCover event={event} className="h-36" overlay={false} />
        {busy && <span className="absolute inset-0 flex items-center justify-center bg-black/40"><Loader2 className="size-6 animate-spin text-white" /></span>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}><ImagePlus /> {event.cover_url ? 'Change cover' : 'Upload a cover image'}</Button>
        {event.cover_url && <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={reset}><RotateCcw /> Use generated art</Button>}
        <p className="text-xs text-muted-foreground">A wide photo works best. It shows on your events list, dashboard and the attendee page.</p>
      </div>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
    </div>
  );
}
