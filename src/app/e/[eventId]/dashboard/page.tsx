'use client';
import { useMemo, useState } from 'react';
import { BarChart3, CheckSquare, ChevronDown, UserCheck } from 'lucide-react';
import { useData } from '@/lib/data';
import { computeKpis, coverageCells, focusShift, openSeats, volunteersOnly, zoneName } from '@/lib/derive';
import { fmtRange, isActiveStatus, suggestMoves } from '@/lib/engine';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorState, PageSkeleton, SectionCard } from '@/components/common/kit';
import { EventHero } from '@/components/dashboard/EventHero';
import { AttentionCards, attentionIcons, type AttentionItem } from '@/components/dashboard/AttentionCards';
import { VenueMap, type ZoneSummary } from '@/components/dashboard/VenueMap';
import { Heatmap } from '@/components/dashboard/Heatmap';
import { StaffingSuggestions } from '@/components/dashboard/StaffingSuggestions';
import { LiveFeed } from '@/components/dashboard/LiveFeed';
import { ZoneSheet } from '@/components/dashboard/ZoneSheet';
import { AttendanceChart, FairnessChart, IssuesChart } from '@/components/dashboard/Charts';

function Meter({ icon: Icon, label, value, total, caption }: { icon: typeof UserCheck; label: string; value: number; total: number; caption: string }) {
  const pct = total ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div className="surface p-4">
      <div className="flex items-center gap-2.5"><span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span><p className="text-sm font-medium">{label}</p></div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} /></div>
      <p className="mt-2 text-[13px] text-muted-foreground">{caption}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { snap, error, refresh, now, real, feed, eventId } = useData();
  const [mode, setMode] = useState<'live' | 'planned'>('live');
  const [selected, setSelected] = useState<ZoneSummary | null>(null);
  const [insights, setInsights] = useState(false);

  const cells = useMemo(() => (snap ? coverageCells(snap, mode === 'live' ? 'live' : 'planned', now) : []), [snap, mode, now]);
  const kpis = useMemo(() => (snap ? computeKpis(snap, cells, now) : null), [snap, cells, now]);
  const moves = useMemo(
    () => (snap ? suggestMoves(cells, snap.volunteers.filter((v) => v.role === 'volunteer'), snap.shifts, snap.assignments, now, snap.zones) : []),
    [snap, cells, now],
  );
  const issuesByZone = useMemo(() => {
    const m = new Map<string, number>();
    snap?.issues.filter((i) => i.status !== 'resolved').forEach((i) => i.zone_id && m.set(i.zone_id, (m.get(i.zone_id) ?? 0) + 1));
    return m;
  }, [snap]);

  if (error && !snap) return <ErrorState message={error.message} onRetry={() => void refresh()} />;
  if (!snap || !kpis) return <PageSkeleton />;

  const volunteers = volunteersOnly(snap);
  const hasAssignments = snap.assignments.some((a) => isActiveStatus(a.status) || a.status === 'checked_in');
  const required = snap.shifts.reduce((n, s) => n + s.headcount, 0);
  const seats = openSeats(snap);
  const missing = seats.reduce((n, g) => n + g.missing, 0);
  const filled = required - missing;
  const planned = required ? ((required - missing) / required) * 100 : 0;
  const readiness = mode === 'planned' || !hasAssignments ? planned : kpis.coverage;

  const openIssues = snap.issues.filter((i) => i.status === 'open');
  const openComplaints = snap.complaints.filter((c) => c.status === 'open');
  const attention: AttentionItem[] = [];
  if (openIssues.length) attention.push({
    key: 'issues', icon: attentionIcons.issue, tone: 'bad', href: `/e/${eventId}/issues`, cta: 'Respond now',
    title: `${openIssues.length} ${openIssues.length === 1 ? 'issue needs' : 'issues need'} a response`,
    detail: `${openIssues[0].severity} ${openIssues[0].category.replace('_', ' ')} in ${zoneName(snap.zones, openIssues[0].zone_id)}: ${openIssues[0].description}`,
  });
  if (missing > 0 && snap.shifts.length) {
    const g = seats[0];
    attention.push({
      key: 'seats', icon: attentionIcons.seats, tone: 'warn', href: `/e/${eventId}/assignments`, cta: hasAssignments ? 'Fill the seats' : 'Auto-assign crew',
      title: `${missing} ${missing === 1 ? 'seat has' : 'seats have'} nobody assigned`,
      detail: hasAssignments ? `Next up: ${zoneName(snap.zones, g.shift.zone_id)}, ${g.shift.role_name}, ${fmtRange(g.shift)}` : 'Run auto-assign to staff every shift in one go.',
    });
  }
  if (openComplaints.length) attention.push({
    key: 'complaints', icon: attentionIcons.complaint, tone: 'warn', href: `/e/${eventId}/complaints`, cta: 'Review',
    title: `${openComplaints.length} new ${openComplaints.length === 1 ? 'complaint' : 'complaints'}`,
    detail: `${openComplaints[0].submitter_name}: ${openComplaints[0].description}`,
  });
  if (moves.length) attention.push({
    key: 'moves', icon: attentionIcons.move, tone: 'info', href: '#staffing', cta: 'See suggestions',
    title: `${moves.length} staffing ${moves.length === 1 ? 'move' : 'moves'} suggested`,
    detail: moves[0].reason,
  });

  const checkedIn = kpis.checkedIn;
  const activeVols = new Set(snap.assignments.filter((a) => isActiveStatus(a.status) || a.status === 'checked_in').map((a) => a.volunteer_id)).size;
  const selectedLive = selected ? { ...selected, shift: focusShift(selected.zone.id, snap.shifts, now) ?? selected.shift } : null;
  const liveSelected = selectedLive ? { ...selectedLive, cell: cells.find((c) => c.shift_id === selectedLive.shift?.id) } : null;

  return (
    <div className="mx-auto max-w-[1360px] space-y-7">
      <EventHero event={snap.event} eventId={eventId} coverage={readiness} filled={filled} required={required} volunteers={volunteers.length} attendees={snap.attendees.length} hasAssignments={hasAssignments} />

      <AttentionCards items={attention} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Meter icon={UserCheck} label="Volunteers on shift" value={checkedIn} total={Math.max(activeVols, 1)} caption={activeVols ? `${checkedIn} of ${activeVols} scheduled volunteers checked in` : 'Nobody is scheduled yet'} />
        <Meter icon={CheckSquare} label="Tasks" value={kpis.tasksDone} total={Math.max(kpis.tasksTotal, 1)} caption={kpis.tasksTotal ? `${kpis.tasksDone} of ${kpis.tasksTotal} tasks done` : 'No tasks yet'} />
        <Meter icon={BarChart3} label="Attendance" value={kpis.attendance ?? 0} total={100} caption={kpis.attendance === null ? 'No shift has started yet' : `${Math.round(kpis.attendance)}% of expected volunteers showed up`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <SectionCard title="Venue map" description="Tap a zone to see who is there, open seats, tasks and issues" className="xl:col-span-2"
          actions={<Tabs value={mode} onValueChange={(v) => setMode(v as 'live' | 'planned')}><TabsList><TabsTrigger value="live">Live</TabsTrigger><TabsTrigger value="planned">Planned</TabsTrigger></TabsList></Tabs>}>
          {snap.zones.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No zones yet. Add them in Event setup.</p>
          ) : (
            <VenueMap zones={snap.zones} shifts={snap.shifts} cells={cells} now={now} issuesByZone={issuesByZone} onSelect={(z) => setSelected(z)} />
          )}
        </SectionCard>
        <SectionCard title="Live activity" description="Everything happening, as it happens">
          <LiveFeed items={feed} real={real} />
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <SectionCard title="Coverage by time" description="Each dot is a seat. Filled means someone is there." className="xl:col-span-2">
          <Heatmap zones={snap.zones} shifts={snap.shifts} cells={cells} now={now}
            onCell={(shiftId) => {
              const s = snap.shifts.find((x) => x.id === shiftId)!;
              const z = snap.zones.find((x) => x.id === s.zone_id)!;
              setSelected({ zone: z, shift: s, cell: cells.find((c) => c.shift_id === shiftId), openIssues: issuesByZone.get(z.id) ?? 0 });
            }} />
        </SectionCard>
        <div id="staffing" className="scroll-mt-24">
          <SectionCard title="Staffing suggestions" description="Move people from over-staffed to short zones" className="h-full">
            <StaffingSuggestions moves={moves} volunteers={snap.volunteers} zones={snap.zones} onApplied={() => void refresh()} />
          </SectionCard>
        </div>
      </div>

      <div>
        <Button variant="ghost" size="sm" onClick={() => setInsights((v) => !v)} className="mb-3"><BarChart3 /> {insights ? 'Hide insights' : 'Show insights'}<ChevronDown className={cn('transition-transform', insights && 'rotate-180')} /></Button>
        {insights && (
          <div className="grid gap-5 lg:grid-cols-3">
            <SectionCard title="Attendance by time block"><AttendanceChart snap={snap} /></SectionCard>
            <SectionCard title="Workload balance" description="How evenly hours are shared"><FairnessChart snap={snap} now={now} /></SectionCard>
            <SectionCard title="Issues by type"><IssuesChart snap={snap} /></SectionCard>
          </div>
        )}
      </div>

      <ZoneSheet summary={liveSelected} snap={snap} onClose={() => setSelected(null)} />
    </div>
  );
}
