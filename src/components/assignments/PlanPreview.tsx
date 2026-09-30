'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Info, Loader2, TrendingDown, TrendingUp, X } from 'lucide-react';
import type { AssignStats, AutoAssignResult, Snapshot } from '@/lib/types';
import { fmtRange } from '@/lib/engine';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState, PersonAvatar, SectionCard, SkillTags } from '@/components/common/kit';

export interface Plan { engine: AutoAssignResult; naive: AutoAssignResult }

function Metric({ label, value, better }: { label: string; value: string; better?: boolean }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('text-xl font-semibold tabular', better === true && 'text-covered', better === false && 'text-muted-foreground')}>{value}</p>
    </div>
  );
}

function StatsCard({ title, stats, tone, winner }: { title: string; stats: AssignStats; tone: 'engine' | 'naive'; winner?: { coverage: boolean; fairness: boolean } }) {
  return (
    <div className={cn('rounded-xl border p-4', tone === 'engine' ? 'border-primary/40 bg-primary/5' : 'bg-card/50')}>
      <p className={cn('mb-3 text-sm font-semibold', tone === 'engine' && 'text-primary')}>{title}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Metric label="Coverage" value={`${stats.coveragePct}%`} better={winner?.coverage} />
        <Metric label="Unfilled seats" value={String(stats.requiredSeats - stats.filledSeats)} />
        <Metric label="Hours spread (σ)" value={`${stats.hoursStdDev}h`} better={winner?.fairness} />
        <Metric label="Compute" value={`${stats.computeMs} ms`} />
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div className={cn('h-full rounded-full', tone === 'engine' ? 'bg-primary' : 'bg-muted-foreground')} initial={{ width: 0 }} animate={{ width: `${stats.coveragePct}%` }} transition={{ duration: 0.3 }} />
      </div>
    </div>
  );
}

/** Preview of an auto-assign run: benchmark vs naive, proposed assignments with "why", gaps, Apply. */
export function PlanPreview({ plan, snap, applying, onApply, onDiscard }: { plan: Plan; snap: Snapshot; applying: boolean; onApply: () => void; onDiscard: () => void }) {
  const [view, setView] = useState<'engine' | 'naive' | 'both'>('both');
  const res = view === 'naive' ? plan.naive : plan.engine;
  const e = plan.engine.stats;
  const n = plan.naive.stats;
  const covDelta = Math.round((e.coveragePct - n.coveragePct) * 10) / 10;
  const fairDelta = n.hoursStdDev > 0 ? Math.round(((n.hoursStdDev - e.hoursStdDev) / n.hoursStdDev) * 100) : 0;

  const shiftById = new Map(snap.shifts.map((s) => [s.id, s]));
  const rows = [...res.assignments].sort((a, b) => {
    const sa = shiftById.get(a.shift_id)!, sb = shiftById.get(b.shift_id)!;
    return snap.zones.findIndex((z) => z.id === sa.zone_id) - snap.zones.findIndex((z) => z.id === sb.zone_id) || sa.starts_at.localeCompare(sb.starts_at);
  });

  return (
    <SectionCard
      title="Preview: proposed plan"
      description={`${plan.engine.assignments.length} new assignments. Nothing is saved until you apply.`}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onDiscard} disabled={applying}><X /> Discard</Button>
          <Button size="sm" onClick={onApply} disabled={applying || plan.engine.assignments.length === 0}>
            {applying ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Apply {plan.engine.assignments.length} assignments
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* headline benchmark */}
        <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 to-transparent p-4">
          <p className="text-sm">
            CrewPulse fills <span className="font-semibold text-covered tabular">{e.coveragePct}%</span> of seats vs <span className="font-semibold tabular">{n.coveragePct}%</span> for first-come-first-served
            {covDelta > 0 && <span className="ml-1 inline-flex items-center gap-0.5 text-covered"><TrendingUp className="size-3.5" />+{covDelta} pts</span>}
            {fairDelta > 0 && <>, with hours spread down <span className="font-semibold text-covered tabular">{fairDelta}%</span><TrendingDown className="ml-0.5 inline size-3.5 text-covered" /></>}
            <span className="text-muted-foreground"> in {e.computeMs} ms.</span>
          </p>
        </div>

        <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
          <TabsList>
            <TabsTrigger value="both">Side by side</TabsTrigger>
            <TabsTrigger value="engine">CrewPulse engine</TabsTrigger>
            <TabsTrigger value="naive">Naive (first come)</TabsTrigger>
          </TabsList>
        </Tabs>

        {view === 'both' && (
          <div className="grid gap-3 md:grid-cols-2">
            <StatsCard title="CrewPulse engine" stats={e} tone="engine" winner={{ coverage: e.coveragePct >= n.coveragePct, fairness: e.hoursStdDev <= n.hoursStdDev }} />
            <StatsCard title="Naive (first come first served)" stats={n} tone="naive" winner={{ coverage: n.coveragePct > e.coveragePct, fairness: n.hoursStdDev < e.hoursStdDev }} />
          </div>
        )}

        {/* gaps */}
        {res.gaps.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Gaps the engine could not fill ({res.gaps.reduce((a, g) => a + g.seatsMissing, 0)} seats)</h3>
            <ul className="space-y-1.5">
              {res.gaps.map((g) => {
                const s = shiftById.get(g.shift_id)!;
                const z = snap.zones.find((x) => x.id === s.zone_id);
                return (
                  <li key={g.shift_id} className="flex items-start gap-2 rounded-lg border border-gap/30 bg-gap/5 p-2.5 text-sm">
                    <span className="mt-0.5 rounded bg-gap/20 px-1.5 text-xs font-semibold text-gap">{g.seatsMissing} seat{g.seatsMissing > 1 ? 's' : ''}</span>
                    <div><p className="font-medium">{z?.name} · {s.role_name} · {fmtRange(s)}</p><p className="text-xs text-muted-foreground">{g.reason}</p></div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* proposed assignments */}
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{view === 'naive' ? 'Naive' : 'Proposed'} assignments ({rows.length})</h3>
          {rows.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Nothing to assign" description="Every seat that can be filled already is." className="py-8" />
          ) : (
            <div className="max-h-96 overflow-y-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card text-xs text-muted-foreground">
                  <tr><th className="px-3 py-2 text-left font-medium">Volunteer</th><th className="px-3 py-2 text-left font-medium">Zone and shift</th><th className="px-3 py-2 text-right font-medium">Score</th><th className="w-10" /></tr>
                </thead>
                <tbody>
                  {rows.map((a) => {
                    const s = shiftById.get(a.shift_id)!;
                    const z = snap.zones.find((x) => x.id === s.zone_id);
                    const v = snap.volunteers.find((x) => x.id === a.volunteer_id);
                    return (
                      <tr key={a.shift_id + a.volunteer_id} className="border-t">
                        <td className="px-3 py-1.5"><span className="flex items-center gap-2"><PersonAvatar name={v?.name ?? '?'} size="sm" />{v?.name}</span></td>
                        <td className="px-3 py-1.5 text-muted-foreground"><span className="text-foreground">{z?.name}</span> · {fmtRange(s)}</td>
                        <td className="px-3 py-1.5 text-right tabular">{view === 'naive' ? '-' : a.score}</td>
                        <td className="px-1 py-1.5">
                          <Popover>
                            <PopoverTrigger render={<Button variant="ghost" size="icon-xs" aria-label="Why this assignment" />}><Info /></PopoverTrigger>
                            <PopoverContent align="end" className="w-80 space-y-2">
                              <p className="text-sm font-medium">Why {v?.name}?</p>
                              <SkillTags skills={v?.skills ?? []} limit={6} highlight={s.required_skills} />
                              <ul className="space-y-0.5 text-xs text-muted-foreground">{a.reason.split('; ').map((r, i) => <li key={i}>• {r}</li>)}</ul>
                              {view !== 'naive' && <p className="text-xs">Score <span className="font-semibold text-primary tabular">{a.score}</span></p>}
                            </PopoverContent>
                          </Popover>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
