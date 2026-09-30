'use client';
import { useState } from 'react';
import { CalendarClock, CopyPlus, Layers, Loader2, MapPinned, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Shift, Zone } from '@/lib/types';
import { useData } from '@/lib/data';
import { createShifts, deleteShift, deleteZone, updateEvent } from '@/lib/db/queries';
import { blockKey, timeBlocks, volunteerName } from '@/lib/derive';
import { fmtRange } from '@/lib/engine';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState, ErrorState, PageHeader, PageSkeleton, SectionCard, SimpleSelect, SkillTags } from '@/components/common/kit';
import { ShiftDialog, ZoneDialog } from '@/components/ops/SetupDialogs';

interface Confirm { title: string; body: string; action: () => Promise<void> }

export default function SetupPage() {
  const { snap, error, refresh } = useData();
  const [tab, setTab] = useState<'event' | 'zones' | 'shifts'>('zones');
  const [zoneDlg, setZoneDlg] = useState<{ zone: Zone | null } | null>(null);
  const [shiftDlg, setShiftDlg] = useState<{ shift: Shift | null } | null>(null);
  const [zoneFilter, setZoneFilter] = useState('all');
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [working, setWorking] = useState(false);
  const [eventForm, setEventForm] = useState<{ name: string; venue: string } | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);

  if (error && !snap) return <ErrorState message={error.message} onRetry={() => void refresh()} />;
  if (!snap) return <PageSkeleton />;

  const blocks = timeBlocks(snap.shifts);
  const shifts = snap.shifts.filter((s) => zoneFilter === 'all' || s.zone_id === zoneFilter)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at) || (snap.zones.find((z) => z.id === a.zone_id)?.name ?? '').localeCompare(snap.zones.find((z) => z.id === b.zone_id)?.name ?? ''));
  const form = eventForm ?? { name: snap.event.name, venue: snap.event.venue ?? '' };

  const duplicate = async (s: Shift) => {
    const missing = blocks.filter((b) => !snap.shifts.some((x) => x.zone_id === s.zone_id && x.role_name === s.role_name && blockKey(x) === b.key));
    if (!missing.length) { toast.info('This shift already exists in every time block'); return; }
    try {
      await createShifts(missing.map((b) => ({ event_id: s.event_id, zone_id: s.zone_id, role_name: s.role_name, required_skills: s.required_skills, headcount: s.headcount, starts_at: b.start, ends_at: b.end })));
      toast.success(`Created ${missing.length} shift${missing.length > 1 ? 's' : ''}`, { description: `${s.role_name} now runs in every time block` });
      await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not duplicate the shift'); }
  };

  const run = async () => {
    if (!confirm) return;
    setWorking(true);
    try { await confirm.action(); await refresh(); setConfirm(null); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Action failed'); }
    finally { setWorking(false); }
  };

  const saveEvent = async () => {
    setSavingEvent(true);
    try {
      if (form.name.trim().length < 2) throw new Error('Event name is required');
      await updateEvent(snap.event.id, { name: form.name.trim(), venue: form.venue.trim() || null });
      toast.success('Event saved');
      setEventForm(null);
      await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save the event'); }
    finally { setSavingEvent(false); }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Event setup" description="Define the event, its zones, and the shifts with required skills and headcount. Changes show up instantly in the dashboard and the assignment engine." />
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-4">
        <TabsList>
          <TabsTrigger value="zones">Zones ({snap.zones.length})</TabsTrigger>
          <TabsTrigger value="shifts">Shifts ({snap.shifts.length})</TabsTrigger>
          <TabsTrigger value="event">Event</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'event' && (
        <SectionCard title="Event details" className="max-w-xl">
          <div className="space-y-3">
            <div><Label htmlFor="e-name">Name</Label><Input id="e-name" value={form.name} onChange={(e) => setEventForm({ ...form, name: e.target.value })} /></div>
            <div><Label htmlFor="e-venue">Venue</Label><Input id="e-venue" value={form.venue} onChange={(e) => setEventForm({ ...form, venue: e.target.value })} /></div>
            <p className="text-xs text-muted-foreground">Runs {new Date(snap.event.starts_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} to {new Date(snap.event.ends_at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', timeStyle: 'short' })} IST</p>
            <Button onClick={saveEvent} disabled={savingEvent || !eventForm}>{savingEvent && <Loader2 className="animate-spin" />} Save changes</Button>
          </div>
        </SectionCard>
      )}

      {tab === 'zones' && (
        <SectionCard title="Zones" description="Physical areas of the venue" actions={<Button size="sm" onClick={() => setZoneDlg({ zone: null })}><Plus /> New zone</Button>}>
          {snap.zones.length === 0 ? <EmptyState icon={MapPinned} title="No zones yet" description="Add the entry gate, stage, first aid and so on." action={<Button onClick={() => setZoneDlg({ zone: null })}><Plus /> New zone</Button>} className="py-8" /> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm">
              <thead className="text-xs text-muted-foreground"><tr className="border-b"><th className="py-2 text-left font-medium">Zone</th><th className="py-2 text-left font-medium">Coordinator</th><th className="py-2 text-right font-medium">Shifts</th><th className="py-2 text-right font-medium">Seats</th><th className="w-10" /></tr></thead>
              <tbody>
                {snap.zones.map((z) => {
                  const mine = snap.shifts.filter((s) => s.zone_id === z.id);
                  return (
                    <tr key={z.id} className="border-b last:border-0">
                      <td className="py-2"><span className="flex items-center gap-2 font-medium"><span className="size-3 rounded-full" style={{ background: z.color }} />{z.name}</span></td>
                      <td className="py-2 text-muted-foreground">{z.coordinator_id ? volunteerName(snap.volunteers, z.coordinator_id) : 'Not assigned'}</td>
                      <td className="py-2 text-right tabular">{mine.length}</td>
                      <td className="py-2 text-right tabular">{mine.reduce((n, s) => n + s.headcount, 0)}</td>
                      <td className="py-2 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${z.name}`} />}><MoreHorizontal /></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setZoneDlg({ zone: z })}><Pencil /> Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setZoneFilter(z.id); setTab('shifts'); }}><Layers /> View shifts</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setConfirm({ title: `Delete ${z.name}?`, body: `This also deletes its ${mine.length} shifts and their assignments.`, action: () => deleteZone(z.id) })}><Trash2 /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          )}
        </SectionCard>
      )}

      {tab === 'shifts' && (
        <SectionCard title="Shifts" description="Zone + role + time window + headcount + required skills"
          actions={<div className="flex items-center gap-2"><div className="w-44"><SimpleSelect size="sm" value={zoneFilter} onChange={setZoneFilter} options={[{ value: 'all', label: 'All zones' }, ...snap.zones.map((z) => ({ value: z.id, label: z.name }))]} /></div><Button size="sm" onClick={() => setShiftDlg({ shift: null })} disabled={!snap.zones.length}><Plus /> New shift</Button></div>}>
          {shifts.length === 0 ? <EmptyState icon={CalendarClock} title="No shifts here" description="Create a shift to start planning coverage." action={<Button onClick={() => setShiftDlg({ shift: null })}><Plus /> New shift</Button>} className="py-8" /> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm">
              <thead className="text-xs text-muted-foreground"><tr className="border-b"><th className="py-2 text-left font-medium">Time</th><th className="py-2 text-left font-medium">Zone</th><th className="py-2 text-left font-medium">Role</th><th className="py-2 text-left font-medium">Skills</th><th className="py-2 text-right font-medium">Headcount</th><th className="w-10" /></tr></thead>
              <tbody>
                {shifts.map((s) => {
                  const z = snap.zones.find((x) => x.id === s.zone_id);
                  return (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="py-2 tabular text-muted-foreground">{fmtRange(s)}</td>
                      <td className="py-2"><span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: z?.color }} />{z?.name}</span></td>
                      <td className="py-2 font-medium">{s.role_name}</td>
                      <td className="py-2">{s.required_skills.length ? <SkillTags skills={s.required_skills} limit={3} /> : <span className="text-xs text-muted-foreground">Anyone</span>}</td>
                      <td className="py-2 text-right tabular">{s.headcount}</td>
                      <td className="py-2 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Shift actions" />}><MoreHorizontal /></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setShiftDlg({ shift: s })}><Pencil /> Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicate(s)}><CopyPlus /> Duplicate to all time blocks</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setConfirm({ title: 'Delete this shift?', body: `${z?.name} · ${s.role_name} · ${fmtRange(s)}. Its assignments are removed too.`, action: () => deleteShift(s.id) })}><Trash2 /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          )}
        </SectionCard>
      )}

      {zoneDlg && <ZoneDialog key={zoneDlg.zone?.id ?? 'new'} open onClose={() => setZoneDlg(null)} snap={snap} zone={zoneDlg.zone} onSaved={() => void refresh()} />}
      {shiftDlg && <ShiftDialog key={shiftDlg.shift?.id ?? 'new'} open onClose={() => setShiftDlg(null)} snap={snap} shift={shiftDlg.shift} defaultZone={zoneFilter === 'all' ? undefined : zoneFilter} onSaved={() => void refresh()} />}

      <Dialog open={!!confirm} onOpenChange={(o) => { if (!o) setConfirm(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{confirm?.title}</DialogTitle><DialogDescription>{confirm?.body}</DialogDescription></DialogHeader>
          <DialogFooter className="gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setConfirm(null)} disabled={working}>Cancel</Button>
            <Button variant="destructive" onClick={run} disabled={working}>{working && <Loader2 className="animate-spin" />} Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
