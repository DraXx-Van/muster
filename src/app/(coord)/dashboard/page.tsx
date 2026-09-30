'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckSquare, Gauge, Sparkles, UserCheck, Users } from 'lucide-react';
import { useData } from '@/lib/data';
import { computeKpis, coverageCells, volunteersOnly } from '@/lib/derive';
import { suggestMoves } from '@/lib/engine';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState, ErrorState, PageHeader, PageSkeleton, SectionCard, StatCard } from '@/components/common/kit';
import { VenueMap, type ZoneSummary } from '@/components/dashboard/VenueMap';
import { Heatmap } from '@/components/dashboard/Heatmap';
import { StaffingSuggestions } from '@/components/dashboard/StaffingSuggestions';
import { LiveFeed } from '@/components/dashboard/LiveFeed';
import { ZoneSheet } from '@/components/dashboard/ZoneSheet';
import { AttendanceChart, FairnessChart, IssuesChart } from '@/components/dashboard/Charts';
import { isActiveStatus } from '@/lib/engine';
import { focusShift } from '@/lib/derive';

export default function DashboardPage() {
  const { snap, error, refresh, now, real, feed } = useData();
  const [mode, setMode] = useState<'live' | 'planned'>('live');
  const [selected, setSelected] = useState<ZoneSummary | null>(null);

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

  const hasAssignments = snap.assignments.some((a) => isActiveStatus(a.status) || a.status === 'checked_in');
  const selectedLive = selected ? { ...selected, shift: focusShift(selected.zone.id, snap.shifts, now) ?? selected.shift } : null;
  const liveSelected = selectedLive ? { ...selectedLive, cell: cells.find((c) => c.shift_id === selectedLive.shift?.id) } : null;

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Live coordination"
        description={`${snap.event.name}. Coverage, attendance, issues and staffing suggestions, all following the demo clock.`}
        actions={
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'live' | 'planned')}>
            <TabsList><TabsTrigger value="live">Live</TabsTrigger><TabsTrigger value="planned">Planned</TabsTrigger></TabsList>
          </Tabs>
        }
      />

      {!hasAssignments && (
        <EmptyState className="mb-6" icon={Sparkles} title="Nobody is scheduled yet" description="Every zone is red until shifts are staffed. Run the assignment engine to fill them in milliseconds."
          action={<Link href="/assignments"><Button><Sparkles /> Go to auto-assign</Button></Link>} />
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Coverage" value={kpis.coverage} decimals={0} suffix="%" icon={Gauge} tone={kpis.coverage >= 95 ? 'good' : kpis.coverage >= 75 ? 'warn' : 'bad'} hint="Seats filled, remaining shifts" />
        <StatCard label="Checked in now" value={kpis.checkedIn} icon={UserCheck} tone="info" hint={`${volunteersOnly(snap).length} volunteers registered`} />
        <StatCard label="Attendance" value={kpis.attendance ?? 0} suffix="%" icon={Users} empty={kpis.attendance === null ? '-' : undefined} tone={kpis.attendance === null ? 'default' : kpis.attendance >= 85 ? 'good' : 'warn'} hint={kpis.attendance === null ? 'No shift has started yet' : 'Of expected, started shifts'} />
        <StatCard label="Open issues" value={kpis.openIssues} icon={AlertTriangle} tone={kpis.openIssues ? 'bad' : 'good'} hint={kpis.openIssues ? 'Needs a coordinator' : 'All clear'} />
        <StatCard label="Tasks done" value={kpis.tasksTotal ? (kpis.tasksDone / kpis.tasksTotal) * 100 : 0} suffix="%" icon={CheckSquare} hint={`${kpis.tasksDone} of ${kpis.tasksTotal} resolved`} empty={kpis.tasksTotal ? undefined : '-'} />
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-3">
        <SectionCard title="Venue map" description="Click a zone to see who is there, gaps, tasks and issues" className="xl:col-span-2">
          <VenueMap zones={snap.zones} shifts={snap.shifts} cells={cells} now={now} issuesByZone={issuesByZone}
            onSelect={(z) => setSelected(z)} />
        </SectionCard>
        <SectionCard title="Live feed" description="Check-ins, dropouts, issues, announcements">
          <LiveFeed items={feed} real={real} />
        </SectionCard>
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-3">
        <SectionCard title="Coverage heatmap" description="Filled / required seats per zone and time block" className="xl:col-span-2">
          <Heatmap zones={snap.zones} shifts={snap.shifts} cells={cells} now={now}
            onCell={(shiftId) => {
              const s = snap.shifts.find((x) => x.id === shiftId)!;
              const z = snap.zones.find((x) => x.id === s.zone_id)!;
              setSelected({ zone: z, shift: s, cell: cells.find((c) => c.shift_id === shiftId), openIssues: issuesByZone.get(z.id) ?? 0 });
            }} />
        </SectionCard>
        <SectionCard title="Staffing suggestions" description="Move people from over-staffed to short zones">
          <StaffingSuggestions moves={moves} volunteers={snap.volunteers} zones={snap.zones} onApplied={() => void refresh()} />
        </SectionCard>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Attendance by time block"><AttendanceChart snap={snap} /></SectionCard>
        <SectionCard title="Fair hours"><FairnessChart snap={snap} now={now} /></SectionCard>
        <SectionCard title="Issues by category"><IssuesChart snap={snap} /></SectionCard>
      </motion.div>

      <ZoneSheet summary={liveSelected} snap={snap} onClose={() => setSelected(null)} />
    </div>
  );
}
