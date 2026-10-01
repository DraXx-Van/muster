'use client';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleDashed, Loader2, UserMinus, UserX, Zap } from 'lucide-react';
import { toast } from 'sonner';
import type { Assignment, ReplacementSuggestion, Shift, Snapshot } from '@/lib/types';
import { fmtRange } from '@/lib/engine';
import { post } from '@/lib/post';
import { useData } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PersonAvatar, SkillTags } from '@/components/common/kit';

export type DropTarget = { kind: 'assignment'; assignment: Assignment } | { kind: 'seat'; shift: Shift };

interface RebalanceResult { shift_id: string; suggestions: ReplacementSuggestion[]; computeMs: number }

/** Dropout / no-show flow: confirm -> ranked replacement suggestions -> one-click assign. */
type Props = { target: DropTarget | null; snap: Snapshot; onClose: () => void; onChanged: (ms?: number) => void };

export function DropoutDialog(props: Props) {
  const { target, onClose } = props;
  const key = target ? (target.kind === 'seat' ? 'seat-' + target.shift.id : 'as-' + target.assignment.id) : 'none';
  return (
    <Dialog open={!!target} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg">{target && <DropoutBody key={key} {...props} target={target} />}</DialogContent>
    </Dialog>
  );
}

function DropoutBody({ target, snap, onClose, onChanged }: Omit<Props, 'target'> & { target: DropTarget }) {
  const { eventId } = useData();
  const [step, setStep] = useState<'confirm' | 'loading' | 'results'>(target.kind === 'seat' ? 'loading' : 'confirm');
  const [result, setResult] = useState<RebalanceResult | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);

  const shift = target ? (target.kind === 'seat' ? target.shift : snap.shifts.find((s) => s.id === target.assignment.shift_id)) : undefined;
  const zone = snap.zones.find((z) => z.id === shift?.zone_id);
  const dropper = target?.kind === 'assignment' ? snap.volunteers.find((v) => v.id === target.assignment.volunteer_id) : undefined;

  type Body = { assignmentId?: string; status?: 'dropped' | 'no_show'; shiftId?: string };
  const run = (body: Body) => { setStep('loading'); return load(body); };
  const load = async (body: Body) => {
    try {
      const r = await post<RebalanceResult>('/api/rebalance', { eventId, ...body });
      setResult(r);
      setStep('results');
      onChanged(r.computeMs);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not compute replacements');
      setStep('confirm');
    }
  };

  // open seats skip the confirm step and go straight to suggestions
  const seatId = target.kind === 'seat' ? target.shift.id : null;
  useEffect(() => {
    if (seatId) void load({ shiftId: seatId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seatId]);
  const assign = async (s: ReplacementSuggestion) => {
    if (!shift) return;
    setAssigning(s.volunteer_id);
    try {
      await post('/api/assign/apply', { eventId, assignments: [{ shift_id: shift.id, volunteer_id: s.volunteer_id, score: s.score, reason: s.reason }] });
      const name = snap.volunteers.find((v) => v.id === s.volunteer_id)?.name;
      toast.success(`${name} assigned to ${zone?.name}`, { description: `Re-optimized in ${result?.computeMs ?? 0} ms` });
      onChanged();
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not assign'); }
    finally { setAssigning(null); }
  };

  return (
    <>
        <DialogHeader>
          <DialogTitle>{target.kind === 'seat' ? 'Fill open seat' : 'Volunteer dropped out'}</DialogTitle>
          <DialogDescription>{zone?.name} · {shift?.role_name} · {shift && fmtRange(shift)}</DialogDescription>
        </DialogHeader>

        {step === 'confirm' && target?.kind === 'assignment' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <PersonAvatar name={dropper?.name ?? '?'} src={dropper?.avatar_url} size="lg" />
              <div><p className="font-medium">{dropper?.name}</p><SkillTags skills={dropper?.skills ?? []} /></div>
            </div>
            <p className="text-sm text-muted-foreground">The seat opens up and the engine ranks the best replacements instantly.</p>
            <div className="flex gap-2">
              <Button variant="destructive" className="flex-1" onClick={() => run({ assignmentId: target.assignment.id, status: 'dropped' })}><UserMinus /> Dropped out</Button>
              <Button variant="destructive" className="flex-1" onClick={() => run({ assignmentId: target.assignment.id, status: 'no_show' })}><UserX /> No-show</Button>
            </div>
          </div>
        )}

        {step === 'loading' && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Re-optimizing...</div>
        )}

        {step === 'results' && result && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-covered/15 px-2.5 py-1 text-xs font-medium text-covered"><Zap className="size-3" /> Re-optimized in {result.computeMs} ms</span>
              <span className="text-xs text-muted-foreground">{result.suggestions.length} candidate{result.suggestions.length === 1 ? '' : 's'}</span>
            </div>
            {result.suggestions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gap/40 bg-gap/5 p-4 text-center text-sm">
                <CircleDashed className="mx-auto mb-1 size-5 text-gap" />
                <p className="font-medium text-gap">Nobody is eligible right now</p>
                <p className="text-muted-foreground">Everyone with {shift?.required_skills.join(' + ') || 'the right skills'} is busy, unavailable or at max hours. Check the dashboard for staffing moves.</p>
              </div>
            ) : (
              <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
                <AnimatePresence initial={false}>
                  {result.suggestions.map((s, i) => {
                    const v = snap.volunteers.find((x) => x.id === s.volunteer_id);
                    return (
                      <motion.li key={s.volunteer_id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: i * 0.04 }} className="rounded-lg border p-2.5">
                        <div className="flex items-center gap-3">
                          <PersonAvatar name={v?.name ?? '?'} src={v?.avatar_url} />
                          <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-2 text-sm font-medium">{v?.name}{i === 0 && <span className="rounded bg-primary/15 px-1.5 text-[10px] font-semibold uppercase text-primary">Best match</span>}</p>
                            <SkillTags skills={v?.skills ?? []} highlight={shift?.required_skills} />
                          </div>
                          <Button size="sm" disabled={assigning !== null} onClick={() => assign(s)}>{assigning === s.volunteer_id ? <Loader2 className="animate-spin" /> : null} Assign</Button>
                        </div>
                        <p className="mt-1.5 text-xs text-muted-foreground">{s.reason}</p>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            )}
          </div>
        )}
    </>
  );
}
