'use client';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, LogIn, LogOut, Mail, Pencil, Phone, Search, Ticket, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { SKILLS, type Volunteer } from '@/lib/types';
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
import { JoinCode } from '@/components/common/EventBits';
import { ASSIGNMENT_TONE } from '@/components/dashboard/ZoneSheet';

type Status = 'all' | 'on_shift' | 'scheduled' | 'unassigned';

const STATUS_PILL = {
  on_shift: { label: 'On shift', cls: 'bg-covered/12 text-covered' },
  scheduled: { label: 'Scheduled', cls: 'bg-info/12 text-info' },
  unassigned: { label: 'Not scheduled', cls: 'bg-muted text-muted-foreground' },
} as const;

export default function VolunteersPage() {
  const { snap, error, refresh, now } = useData();
  const [tab, setTab] = useState<'directory' | 'attendance' | 'attendees'>('directory');
  const [q, setQ] = useState('');
  const [skill, setSkill] = useState('all');
  const [status, setStatus] = useState<Status>('all');
  const [dialog, setDialog] = useState<{ volunteer: Volunteer | null } | null>(null);
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
        icon={Users}
        title="Volunteers"
        description="Your crew: skills, availability and hours. Volunteers join with the join code; you can also add people by hand."
        actions={<Button onClick={() => setDialog({ volunteer: null })}><UserPlus /> Add volunteer</Button>}
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-5">
        <TabsList>
          <TabsTrigger value="directory">Crew ({vols.length})</TabsTrigger>
          <TabsTrigger value="attendance">Check-in ({attendance.length})</TabsTrigger>
          <TabsTrigger value="attendees">Attendees ({snap.attendees.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'directory' && (
        <>
          <div className="mb-4 flex flex-wrap gap-2.5">
            <div className="relative min-w-56 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="h-10 bg-card pl-9" placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="w-44"><SimpleSelect className="h-10" value={skill} onChange={setSkill} options={[{ value: 'all', label: 'All skills' }, ...SKILLS.map((s) => ({ value: s, label: s }))]} /></div>
            <div className="w-44"><SimpleSelect className="h-10" value={status} onChange={(v) => setStatus(v as Status)} options={[{ value: 'all', label: 'Any status' }, { value: 'on_shift', label: 'On shift' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'unassigned', label: 'Not scheduled' }]} /></div>
          </div>
          {vols.length === 0 ? (
            <EmptyState icon={Users} title="No volunteers yet" description="Share the join code so volunteers can sign up, or add people by hand."
              action={<div className="flex flex-col items-center gap-3"><JoinCode code={snap.event.join_code} /><Button variant="outline" onClick={() => setDialog({ volunteer: null })}><UserPlus /> Add volunteer by hand</Button></div>} />
          ) : filtered.length === 0 ? (
            <EmptyState icon={Search} title="No volunteers match" description="Try a different search or clear the filters." action={<Button variant="outline" onClick={() => { setQ(''); setSkill('all'); setStatus('all'); }}>Clear filters</Button>} />
          ) : (
            <ul className="space-y-2.5">
              {filtered.map((v) => {
                const h = hours.get(v.id);
                const st = STATUS_PILL[stateOf(v.id)];
                const pct = Math.min(100, ((h?.scheduled ?? 0) / Math.max(v.max_hours, 1)) * 100);
                return (
                  <li key={v.id} className="surface flex flex-wrap items-center gap-x-5 gap-y-3 p-4">
                    <div className="flex min-w-60 flex-1 items-center gap-3.5">
                      <PersonAvatar name={v.name} src={v.avatar_url} size="lg" />
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-semibold leading-tight">{v.name}{!v.user_id && <span className="rounded-md border px-1.5 text-[10px] font-medium text-muted-foreground" title="Added by hand, has no login">roster</span>}</p>
                        <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                          {v.phone && <span className="flex items-center gap-1"><Phone className="size-3" />{v.phone}</span>}
                          {v.email && <span className="flex items-center gap-1"><Mail className="size-3" />{v.email}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="min-w-44 flex-1">{v.skills.length ? <SkillTags skills={v.skills} limit={3} /> : <span className="text-xs text-muted-foreground">No skills added yet</span>}</div>
                    <div className="w-36 shrink-0">
                      <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Hours</span><span className="font-medium tabular">{(h?.live ?? 0).toFixed(1)} / {(h?.scheduled ?? 0).toFixed(1)}h</span></div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
                    </div>
                    <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', st.cls)}>{st.label}</span>
                    <Button variant="ghost" size="icon-sm" aria-label={`Edit ${v.name}`} onClick={() => setDialog({ volunteer: v })}><Pencil /></Button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {tab === 'attendance' && (
        attendance.length === 0 ? (
          <EmptyState icon={Clock} title="Nobody to check in right now" description="People appear here from 15 minutes before their shift starts. Use the demo tools clock to jump to a shift." />
        ) : (
          <ul className="space-y-2.5">
            <AnimatePresence initial={false}>
              {attendance.map((a) => {
                const v = snap.volunteers.find((x) => x.id === a.volunteer_id);
                const s = shiftById.get(a.shift_id)!;
                return (
                  <motion.li key={a.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="surface flex flex-wrap items-center gap-3 p-4">
                    <PersonAvatar name={v?.name ?? '?'} src={v?.avatar_url} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{v?.name}</p>
                      <p className="text-sm text-muted-foreground">{zoneName(snap.zones, s.zone_id)} · {s.role_name} · {fmtRange(s)}</p>
                    </div>
                    <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium capitalize', ASSIGNMENT_TONE[a.status])}>{a.status.replace('_', ' ')}</span>
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

      {tab === 'attendees' && (
        snap.attendees.length === 0 ? (
          <EmptyState icon={Ticket} title="No attendees yet" description="Attendees scan the event QR code and pick a name. They show up here as they join."
            action={<a href={`/e/${snap.event.id}/qr`}><Button><Ticket /> Open the QR poster</Button></a>} />
        ) : (
          <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {snap.attendees.map((a) => (
              <li key={a.id} className="surface flex items-center gap-3 p-3.5">
                <PersonAvatar name={a.name} size="lg" />
                <div className="min-w-0"><p className="truncate font-semibold">{a.name}</p><p className="text-xs text-muted-foreground">Joined by QR code</p></div>
              </li>
            ))}
          </ul>
        )
      )}

      {dialog && <VolunteerDialog open onClose={() => setDialog(null)} snap={snap} volunteer={dialog.volunteer} onCreated={() => void refresh()} />}
    </div>
  );
}
