'use client';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, LogIn, LogOut, Mail, Phone, Search, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { SKILLS } from '@/lib/types';
import { useData } from '@/lib/data';
import { setAssignmentStatus } from '@/lib/db/queries';
import { hoursByVolunteer, inCheckWindow, volunteersOnly, zoneName } from '@/lib/derive';
import { fmtRange, isActiveStatus } from '@/lib/engine';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState, ErrorState, PageHeader, PageSkeleton, PersonAvatar, SimpleSelect, SkillTags } from '@/components/common/kit';
import { VolunteerDialog } from '@/components/ops/VolunteerDialog';
import { ASSIGNMENT_TONE } from '@/components/dashboard/ZoneSheet';

type Status = 'all' | 'on_shift' | 'scheduled' | 'unassigned';

export default function VolunteersPage() {
  const { snap, error, refresh, now } = useData();
  const [tab, setTab] = useState<'directory' | 'attendance'>('directory');
  const [q, setQ] = useState('');
  const [skill, setSkill] = useState('all');
  const [status, setStatus] = useState<Status>('all');
  const [dialog, setDialog] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const hours = useMemo(() => (snap ? hoursByVolunteer(snap, now) : new Map()), [snap, now]);

  if (error && !snap) return <ErrorState message={error.message} onRetry={() => void refresh()} />;
  if (!snap) return <PageSkeleton />;

  const vols = volunteersOnly(snap);
  const stateOf = (id: string): Exclude<Status, 'all'> => {
    const mine = snap.assignments.filter((a) => a.volunteer_id === id);
    if (mine.some((a) => a.status === 'checked_in')) return 'on_shift';
    return mine.some((a) => isActiveStatus(a.status)) ? 'scheduled' : 'unassigned';
  };
  const filtered = vols.filter((v) =>
    (!q || v.name.toLowerCase().includes(q.toLowerCase())) &&
    (skill === 'all' || v.skills.includes(skill)) &&
    (status === 'all' || stateOf(v.id) === status),
  );

  const shiftById = new Map(snap.shifts.map((s) => [s.id, s]));
  const attendance = snap.assignments
    .filter((a) => {
      const s = shiftById.get(a.shift_id);
      return s && (a.status === 'checked_in' || (isActiveStatus(a.status) && a.status !== 'completed' && inCheckWindow(s, now)));
    })
    .sort((a, b) => shiftById.get(a.shift_id)!.starts_at.localeCompare(shiftById.get(b.shift_id)!.starts_at));

  const toggle = async (id: string, to: 'checked_in' | 'completed') => {
    setBusy(id);
    try {
      await setAssignmentStatus(id, to, now);
      toast.success(to === 'checked_in' ? 'Checked in' : 'Checked out');
      await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not update attendance'); }
    finally { setBusy(null); }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Volunteers"
        description={`${vols.length} registered. Directory with skills and hours, plus a live attendance table for check-in and check-out.`}
        actions={<Button onClick={() => setDialog(true)}><UserPlus /> Register volunteer</Button>}
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-4">
        <TabsList>
          <TabsTrigger value="directory">Directory</TabsTrigger>
          <TabsTrigger value="attendance">Attendance ({attendance.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'directory' && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <div className="relative min-w-56 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="w-44"><SimpleSelect value={skill} onChange={setSkill} options={[{ value: 'all', label: 'All skills' }, ...SKILLS.map((s) => ({ value: s, label: s }))]} /></div>
            <div className="w-40"><SimpleSelect value={status} onChange={(v) => setStatus(v as Status)} options={[{ value: 'all', label: 'Any status' }, { value: 'on_shift', label: 'On shift' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'unassigned', label: 'Unassigned' }]} /></div>
          </div>
          {filtered.length === 0 ? (
            <EmptyState icon={Users} title="No volunteers match" description="Try a different search or clear the filters." action={<Button variant="outline" onClick={() => { setQ(''); setSkill('all'); setStatus('all'); }}>Clear filters</Button>} />
          ) : (
            <div className="surface overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="border-b">
                    <th className="px-4 py-2.5 text-left font-medium">Volunteer</th><th className="px-3 py-2.5 text-left font-medium">Skills</th>
                    <th className="px-3 py-2.5 text-left font-medium">Status</th><th className="px-3 py-2.5 text-right font-medium">Hours</th>
                    <th className="px-3 py-2.5 text-left font-medium">Reliability</th><th className="px-3 py-2.5 text-left font-medium">Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((v) => {
                    const h = hours.get(v.id);
                    const st = stateOf(v.id);
                    return (
                      <tr key={v.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-2"><span className="flex items-center gap-2.5"><PersonAvatar name={v.name} /><span className="font-medium">{v.name}</span></span></td>
                        <td className="px-3 py-2"><SkillTags skills={v.skills} limit={3} /></td>
                        <td className="px-3 py-2"><span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', st === 'on_shift' ? 'bg-covered/15 text-covered' : st === 'scheduled' ? 'bg-info/15 text-info' : 'bg-muted text-muted-foreground')}>{st === 'on_shift' ? 'On shift' : st === 'scheduled' ? 'Scheduled' : 'Unassigned'}</span></td>
                        <td className="px-3 py-2 text-right tabular"><span className="font-medium">{(h?.live ?? 0).toFixed(1)}</span><span className="text-muted-foreground"> / {(h?.scheduled ?? 0).toFixed(1)}h</span></td>
                        <td className="px-3 py-2"><div className="flex items-center gap-2"><div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${v.reliability * 100}%` }} /></div><span className="text-xs tabular text-muted-foreground">{Math.round(v.reliability * 100)}%</span></div></td>
                        <td className="px-3 py-2 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Phone className="size-3" />{v.phone}</span><span className="flex items-center gap-1"><Mail className="size-3" />{v.email}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'attendance' && (
        attendance.length === 0 ? (
          <EmptyState icon={Clock} title="Nobody to check in right now" description="People appear here from 15 minutes before their shift starts. Use the demo clock to jump to a shift." />
        ) : (
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {attendance.map((a) => {
                const v = snap.volunteers.find((x) => x.id === a.volunteer_id);
                const s = shiftById.get(a.shift_id)!;
                return (
                  <motion.li key={a.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="surface flex items-center gap-3 p-3">
                    <PersonAvatar name={v?.name ?? '?'} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{v?.name}</p>
                      <p className="text-xs text-muted-foreground">{zoneName(snap.zones, s.zone_id)} · {s.role_name} · {fmtRange(s)}</p>
                    </div>
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium capitalize', ASSIGNMENT_TONE[a.status])}>{a.status.replace('_', ' ')}</span>
                    {a.status === 'checked_in'
                      ? <Button size="sm" variant="outline" disabled={busy === a.id} onClick={() => toggle(a.id, 'completed')}><LogOut /> Check out</Button>
                      : <Button size="sm" disabled={busy === a.id} onClick={() => toggle(a.id, 'checked_in')}><LogIn /> Check in</Button>}
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )
      )}

      <VolunteerDialog open={dialog} onClose={() => setDialog(false)} snap={snap} onCreated={() => void refresh()} />
    </div>
  );
}
