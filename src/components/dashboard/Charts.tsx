'use client';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Snapshot } from '@/lib/types';
import { hoursByVolunteer, stdDev, timeBlocks, blockKey, volunteersOnly } from '@/lib/derive';
import { EmptyState } from '@/components/common/kit';
import { BarChart3 } from 'lucide-react';

const tooltipStyle = {
  contentStyle: { background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, color: 'var(--foreground)' },
  cursor: { fill: 'oklch(1 0 0 / 5%)' },
  labelStyle: { color: 'var(--muted-foreground)' },
};
const axis = { stroke: 'var(--muted-foreground)', fontSize: 11, tickLine: false, axisLine: false } as const;

/** Expected vs checked-in people per time block. */
export function AttendanceChart({ snap }: { snap: Snapshot }) {
  const blocks = timeBlocks(snap.shifts);
  const shiftBlock = new Map(snap.shifts.map((s) => [s.id, blockKey(s)]));
  const data = blocks.map((b) => {
    const mine = snap.assignments.filter((a) => shiftBlock.get(a.shift_id) === b.key && a.status !== 'dropped' && a.status !== 'no_show');
    return { block: b.label, Expected: mine.length, 'Checked in': mine.filter((a) => a.status === 'checked_in' || a.status === 'completed').length };
  });
  if (!data.some((d) => d.Expected)) return <EmptyState icon={BarChart3} title="No assignments yet" description="Run auto-assign to see attendance." className="py-8" />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barGap={4}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="block" {...axis} /><YAxis {...axis} allowDecimals={false} width={28} />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="Expected" fill="var(--chart-5)" fillOpacity={0.35} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        <Bar dataKey="Checked in" fill="var(--chart-3)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Fairness: how many volunteers carry 0, 3, 6, 9+ scheduled hours, and the spread. */
export function FairnessChart({ snap, now }: { snap: Snapshot; now: Date }) {
  const hours = hoursByVolunteer(snap, now);
  const vols = volunteersOnly(snap);
  const scheduled = vols.map((v) => hours.get(v.id)?.scheduled ?? 0);
  const buckets = [0, 3, 6, 9].map((h) => ({ label: h === 9 ? '9h+' : `${h}h`, count: scheduled.filter((x) => (h === 9 ? x >= 9 : Math.round(x) === h)).length }));
  if (!scheduled.some((h) => h > 0)) return <EmptyState icon={BarChart3} title="No hours scheduled" description="Fair-hours spread shows up after auto-assign." className="py-8" />;
  const sd = stdDev(scheduled);
  return (
    <div>
      <ResponsiveContainer width="100%" height={190}>
        <BarChart data={buckets}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" {...axis} /><YAxis {...axis} allowDecimals={false} width={28} />
          <Tooltip {...tooltipStyle} formatter={(v) => [`${v} volunteers`, 'Count']} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {buckets.map((_, i) => <Cell key={i} fill="var(--chart-1)" />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-1 text-center text-xs text-muted-foreground">Hours per volunteer, spread (std dev) <span className="font-semibold text-foreground tabular">{sd.toFixed(2)}h</span>, lower is fairer</p>
    </div>
  );
}

export function IssuesChart({ snap }: { snap: Snapshot }) {
  const cats = ['medical', 'crowd_surge', 'missing_equipment', 'security', 'other'] as const;
  const data = cats.map((c) => ({ category: c.replace('_', ' '), Open: snap.issues.filter((i) => i.category === c && i.status !== 'resolved').length, Resolved: snap.issues.filter((i) => i.category === c && i.status === 'resolved').length }));
  if (!snap.issues.length) return <EmptyState icon={BarChart3} title="No issues raised" description="Issues by category appear as they come in." className="py-8" />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 12 }}>
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis type="number" {...axis} allowDecimals={false} /><YAxis type="category" dataKey="category" {...axis} width={96} />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="Open" stackId="a" fill="var(--chart-5)" isAnimationActive={false} />
        <Bar dataKey="Resolved" stackId="a" fill="var(--chart-3)" radius={[0, 4, 4, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
