'use client';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Loader2, MoveRight } from 'lucide-react';
import { toast } from 'sonner';
import type { MoveSuggestion, Volunteer, Zone } from '@/lib/types';
import { post } from '@/lib/post';
import { Button } from '@/components/ui/button';
import { EmptyState, PersonAvatar } from '@/components/common/kit';

/** Move people from over-staffed zones to short ones. Apply re-points their assignment (and notifies them). */
export function StaffingSuggestions({ moves, volunteers, zones, onApplied }: { moves: MoveSuggestion[]; volunteers: Volunteer[]; zones: Zone[]; onApplied: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const name = (id: string) => zones.find((z) => z.id === id)?.name ?? '?';

  const apply = async (m: MoveSuggestion) => {
    setBusy(m.volunteer_id + m.to_shift_id);
    try {
      await post('/api/move', { volunteer_id: m.volunteer_id, from_zone_id: m.from_zone_id, to_shift_id: m.to_shift_id });
      toast.success(`Moved ${volunteers.find((v) => v.id === m.volunteer_id)?.name} to ${name(m.to_zone_id)}`);
      onApplied();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not apply the move'); }
    finally { setBusy(null); }
  };

  if (!moves.length) {
    return <EmptyState icon={CheckCircle2} title="No moves needed" description="Nothing is short where another zone has a spare person with the right skills." className="py-8" />;
  }
  return (
    <ul className="space-y-2">
      <AnimatePresence initial={false}>
        {moves.map((m) => {
          const v = volunteers.find((x) => x.id === m.volunteer_id);
          const key = m.volunteer_id + m.to_shift_id;
          return (
            <motion.li key={key} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}
              className="flex items-center gap-3 rounded-lg border bg-background/40 p-2.5">
              <PersonAvatar name={v?.name ?? '?'} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{v?.name}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground"><span>{name(m.from_zone_id)}</span><ArrowRight className="size-3" /><span className="text-foreground">{name(m.to_zone_id)}</span></p>
                <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{m.reason}</p>
              </div>
              <Button size="sm" disabled={busy === key} onClick={() => apply(m)}>{busy === key ? <Loader2 className="animate-spin" /> : <MoveRight />} Apply</Button>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
