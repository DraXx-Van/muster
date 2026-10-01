'use client';
import { AlertTriangle, CircleDashed, ListChecks } from 'lucide-react';
import type { Snapshot } from '@/lib/types';
import { STATUS_STYLE, volunteerName } from '@/lib/derive';
import { fmtRange, isActiveStatus } from '@/lib/engine';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { PersonAvatar, SkillTags } from '@/components/common/kit';
import type { ZoneSummary } from './VenueMap';

export const ASSIGNMENT_TONE: Record<string, string> = {
  assigned: 'bg-info/15 text-info', confirmed: 'bg-info/15 text-info', checked_in: 'bg-covered/15 text-covered',
  completed: 'bg-muted text-muted-foreground', dropped: 'bg-gap/15 text-gap', no_show: 'bg-gap/15 text-gap',
};

export function ZoneSheet({ summary, snap, onClose }: { summary: ZoneSummary | null; snap: Snapshot; onClose: () => void }) {
  const z = summary?.zone;
  const shift = summary?.shift;
  const people = shift ? snap.assignments.filter((a) => a.shift_id === shift.id && (isActiveStatus(a.status) || a.status === 'checked_in')) : [];
  const gone = shift ? snap.assignments.filter((a) => a.shift_id === shift.id && (a.status === 'dropped' || a.status === 'no_show')) : [];
  const missing = shift ? Math.max(0, shift.headcount - people.length) : 0;
  const tasks = z ? snap.tasks.filter((t) => t.zone_id === z.id && t.status !== 'resolved') : [];
  const issues = z ? snap.issues.filter((i) => i.zone_id === z.id && i.status !== 'resolved') : [];
  const st = STATUS_STYLE[summary?.cell?.status ?? 'gap'];

  return (
    <Sheet open={!!summary} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-md">
        {z && (
          <>
            <SheetHeader className="border-b">
              <SheetTitle className="flex items-center gap-2"><span className="size-3 rounded-full" style={{ background: z.color }} />{z.name}</SheetTitle>
              <SheetDescription>
                {shift ? <>{shift.role_name} · {fmtRange(shift)} · <span className={cn('font-medium', st.text)}>{summary?.cell?.present}/{summary?.cell?.required} {st.label.toLowerCase()}</span></> : 'No shifts in this zone'}
                {z.coordinator_id && <> · Coordinator {volunteerName(snap.volunteers, z.coordinator_id)}</>}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-5 p-4">
              <section>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">On this shift</h3>
                <ul className="space-y-2">
                  {people.map((a) => {
                    const v = snap.volunteers.find((x) => x.id === a.volunteer_id);
                    return (
                      <li key={a.id} className="flex items-center gap-3 rounded-lg border p-2">
                        <PersonAvatar name={v?.name ?? '?'} src={v?.avatar_url} />
                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{v?.name}</p><SkillTags skills={v?.skills ?? []} limit={2} highlight={shift?.required_skills} /></div>
                        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium capitalize', ASSIGNMENT_TONE[a.status])}>{a.status.replace('_', ' ')}</span>
                      </li>
                    );
                  })}
                  {Array.from({ length: missing }).map((_, i) => (
                    <li key={`gap${i}`} className="pulse-gap flex items-center gap-3 rounded-lg border border-dashed border-gap/60 bg-gap/5 p-2 text-sm text-gap">
                      <span className="flex size-8 items-center justify-center rounded-full bg-gap/15"><CircleDashed className="size-4" /></span>Open seat, needs {shift?.required_skills.join(' + ') || 'anyone'}
                    </li>
                  ))}
                  {!people.length && !missing && <p className="text-sm text-muted-foreground">Nobody scheduled.</p>}
                </ul>
                {gone.length > 0 && <p className="mt-2 text-xs text-muted-foreground">{gone.length} dropped or no-show: {gone.map((a) => volunteerName(snap.volunteers, a.volunteer_id)).join(', ')}</p>}
              </section>

              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground"><AlertTriangle className="size-3.5" /> Open issues</h3>
                {issues.length ? <ul className="space-y-1.5">{issues.map((i) => (
                  <li key={i.id} className="rounded-lg border border-gap/30 bg-gap/5 p-2 text-sm"><span className="font-medium capitalize">{i.severity} {i.category.replace('_', ' ')}</span><span className="block text-xs text-muted-foreground">{i.description}</span></li>
                ))}</ul> : <p className="text-sm text-muted-foreground">None.</p>}
              </section>

              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground"><ListChecks className="size-3.5" /> Open tasks</h3>
                {tasks.length ? <ul className="space-y-1.5">{tasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between rounded-lg border p-2 text-sm"><span>{t.title}</span><span className="text-xs capitalize text-muted-foreground">{t.status.replace('_', ' ')}</span></li>
                ))}</ul> : <p className="text-sm text-muted-foreground">All caught up.</p>}
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
