'use client';
import { useMemo, useState } from 'react';
import { Gauge, Loader2, PackageOpen, Sparkles, Timer, UserRoundX, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '@/lib/data';
import { post } from '@/lib/post';
import { hoursByVolunteer, openSeats, stdDev, volunteersOnly } from '@/lib/derive';
import { Button } from '@/components/ui/button';
import { ErrorState, PageHeader, PageSkeleton, SectionCard, StatCard } from '@/components/common/kit';
import { PlanPreview, type Plan } from '@/components/assignments/PlanPreview';
import { ScheduleBoard } from '@/components/assignments/ScheduleBoard';
import { DropoutDialog, type DropTarget } from '@/components/assignments/DropoutDialog';

export default function AssignmentsPage() {
  const { snap, error, refresh, now, eventId } = useData();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [running, setRunning] = useState(false);
  const [applying, setApplying] = useState(false);
  const [lastMs, setLastMs] = useState<number | null>(null);
  const [target, setTarget] = useState<DropTarget | null>(null);

  const stats = useMemo(() => {
    if (!snap) return null;
    const seats = openSeats(snap);
    const required = snap.shifts.reduce((n, s) => n + s.headcount, 0);
    const open = seats.reduce((n, g) => n + g.missing, 0);
    const hours = hoursByVolunteer(snap, now);
    const scheduled = volunteersOnly(snap).map((v) => hours.get(v.id)?.scheduled ?? 0);
    return { required, open, coverage: required ? ((required - open) / required) * 100 : 100, sd: stdDev(scheduled), anyAssigned: scheduled.some((h) => h > 0) };
  }, [snap, now]);

  if (error && !snap) return <ErrorState message={error.message} onRetry={() => void refresh()} />;
  if (!snap || !stats) return <PageSkeleton />;

  const run = async () => {
    setRunning(true);
    try {
      const r = await post<Plan>('/api/assign', { eventId });
      setPlan(r);
      setLastMs(r.engine.stats.computeMs);
      if (!r.engine.assignments.length) toast.info('Nothing new to assign', { description: 'Every fillable seat is already staffed.' });
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Auto-assign failed'); }
    finally { setRunning(false); }
  };

  const apply = async (p: Plan) => {
    setApplying(true);
    try {
      await post('/api/assign/apply', { eventId, assignments: p.engine.assignments });
      await refresh();
      toast.success(`Applied ${p.engine.assignments.length} assignments`, { description: `${p.engine.stats.coveragePct}% coverage, volunteers notified` });
      setPlan(null);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not apply the plan'); }
    finally { setApplying(false); }
  };

  /** Auto-fill all: run the engine against the current state and apply it straight away. */
  const autoFill = async () => {
    setRunning(true);
    try {
      const r = await post<Plan>('/api/assign', { eventId });
      setLastMs(r.engine.stats.computeMs);
      if (!r.engine.assignments.length) { toast.info('No seat can be filled right now', { description: r.engine.gaps[0]?.reason }); return; }
      await post('/api/assign/apply', { eventId, assignments: r.engine.assignments });
      await refresh();
      toast.success(`Filled ${r.engine.assignments.length} seats`, { description: `Re-optimized in ${r.engine.stats.computeMs} ms` });
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Auto-fill failed'); }
    finally { setRunning(false); }
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        icon={Sparkles}
        title="Assignments"
        description="Skills, availability, overlaps, fair hours and zone preferences solved together, then re-solved the moment someone drops."
        actions={
          <>
            <Button variant="outline" onClick={autoFill} disabled={running || stats.open === 0}><Wand2 /> Auto-fill open seats</Button>
            <Button onClick={run} disabled={running}>{running ? <Loader2 className="animate-spin" /> : <Sparkles />} Auto-assign</Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Coverage" value={stats.coverage} decimals={1} suffix="%" icon={Gauge} tone={stats.coverage >= 95 ? 'good' : stats.coverage >= 75 ? 'warn' : 'bad'} hint={`${stats.required - stats.open} of ${stats.required} seats filled`} />
        <StatCard label="Unfilled seats" value={stats.open} icon={UserRoundX} tone={stats.open ? 'bad' : 'good'} hint={stats.open ? 'Click an open seat below' : 'Fully staffed'} />
        <StatCard label="Hours spread (σ)" value={stats.sd} decimals={2} suffix="h" icon={Timer} hint="Lower means fairer" empty={stats.anyAssigned ? undefined : '-'} />
        <StatCard label="Last compute" value={lastMs ?? 0} decimals={1} suffix=" ms" icon={Sparkles} tone="info" hint="Engine run time" empty={lastMs === null ? '-' : undefined} />
      </div>

      {plan && <div className="mb-6"><PlanPreview plan={plan} snap={snap} applying={applying} onApply={() => void apply(plan)} onDiscard={() => setPlan(null)} /></div>}

      <SectionCard title="Current schedule" description="Click a volunteer for the reasoning or to mark a dropout. Click an open seat to find a replacement.">
        {!stats.anyAssigned && !plan ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary"><PackageOpen className="size-5" /></div>
            <p className="font-medium">No one is scheduled yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">{volunteersOnly(snap).length} volunteers and {snap.shifts.length} shifts are waiting. Run auto-assign to preview a plan.</p>
            <Button className="mt-4" onClick={run} disabled={running}>{running ? <Loader2 className="animate-spin" /> : <Sparkles />} Auto-assign</Button>
          </div>
        ) : (
          <ScheduleBoard snap={snap} onDrop={setTarget} />
        )}
      </SectionCard>

      <DropoutDialog target={target} snap={snap} onClose={() => setTarget(null)} onChanged={(ms) => { if (ms !== undefined) setLastMs(ms); void refresh(); }} />
    </div>
  );
}
