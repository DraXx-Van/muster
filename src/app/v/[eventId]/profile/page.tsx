'use client';
import { CalendarDays, MapPin } from 'lucide-react';
import { useData } from '@/lib/data';
import { useAuth } from '@/lib/auth';
import { VolunteerForm } from '@/components/ops/VolunteerDialog';
import { eventWhen } from '@/components/common/EventBits';

/** Volunteer self-service: skills, availability, preferred zones and hours for THIS event. */
export default function VolunteerProfilePage() {
  const { snap, me, refresh } = useData();
  const { profile } = useAuth();
  if (!snap || !me) return null;
  return (
    <div className="space-y-5">
      <div className="surface p-4">
        <h1 className="text-lg font-semibold">{snap.event.name}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><CalendarDays className="size-3.5" />{eventWhen(snap.event)}</p>
        {snap.event.venue && <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="size-3.5" />{snap.event.venue}</p>}
        {snap.event.description && <p className="mt-2 text-sm text-muted-foreground">{snap.event.description}</p>}
      </div>
      <div>
        <h2 className="text-lg font-semibold">Your profile</h2>
        <p className="mb-4 text-sm text-muted-foreground">{profile?.full_name}. Coordinators use this to give you the right shift. Update it any time.</p>
        <VolunteerForm key={`${me.id}-${me.skills.join()}-${me.availability.length}`} snap={snap} mode="self" volunteer={me} onDone={() => void refresh()} />
      </div>
    </div>
  );
}
