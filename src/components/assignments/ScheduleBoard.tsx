'use client';
import { CircleDashed, Info, UserMinus } from 'lucide-react';
import type { Assignment, Shift, Snapshot } from '@/lib/types';
import { blockKey, timeBlocks } from '@/lib/derive';
import { fmtRange, isActiveStatus } from '@/lib/engine';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PersonAvatar, SkillTags } from '@/components/common/kit';
import type { DropTarget } from './DropoutDialog';

const DOT: Record<string, string> = { assigned: 'bg-info', confirmed: 'bg-info', checked_in: 'bg-covered', completed: 'bg-muted-foreground' };

/** Current schedule: zones x time blocks. Click a person for "why" and dropout; click an open seat to find a replacement. */
export function ScheduleBoard({ snap, onDrop }: { snap: Snapshot; onDrop: (t: DropTarget) => void }) {
  const blocks = timeBlocks(snap.shifts);
  const byShift = new Map<string, Assignment[]>();
  for (const a of snap.assignments) {
    if (!(isActiveStatus(a.status) || a.status === 'checked_in')) continue;
    byShift.set(a.shift_id, [...(byShift.get(a.shift_id) ?? []), a]);
  }
  const shiftAt = (zoneId: string, key: string): Shift | undefined => snap.shifts.find((s) => s.zone_id === zoneId && blockKey(s) === key);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[920px] border-separate border-spacing-2 text-sm">
        <thead>
          <tr>
            <th className="w-36" />
            {blocks.map((b) => <th key={b.key} className="text-left text-xs font-medium text-muted-foreground">{b.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {snap.zones.map((z) => (
            <tr key={z.id} className="align-top">
              <td className="pt-2 text-xs font-medium"><span className="mr-2 inline-block size-2 rounded-full align-middle" style={{ background: z.color }} />{z.name}</td>
              {blocks.map((b) => {
                const s = shiftAt(z.id, b.key);
                if (!s) return <td key={b.key} className="rounded-lg bg-muted/20" />;
                const list = byShift.get(s.id) ?? [];
                const open = Math.max(0, s.headcount - list.length);
                return (
                  <td key={b.key} className={cn('rounded-lg border p-1.5', open > 0 ? 'border-gap/30 bg-gap/5' : 'bg-card/50')}>
                    <div className="mb-1 flex items-center justify-between px-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      <span className="truncate">{s.role_name}</span>
                      <span className={cn('tabular font-semibold', open > 0 ? 'text-gap' : 'text-covered')}>{list.length}/{s.headcount}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {list.map((a) => {
                        const v = snap.volunteers.find((x) => x.id === a.volunteer_id);
                        return (
                          <Popover key={a.id}>
                            <PopoverTrigger render={<button className="inline-flex items-center gap-1 rounded-full border bg-background/60 py-0.5 pl-0.5 pr-2 text-xs transition-colors hover:border-primary/50 hover:bg-muted" />}>
                              <PersonAvatar name={v?.name ?? '?'} size="sm" />
                              <span className="max-w-20 truncate">{v?.name.split(' ')[0]}</span>
                              <span className={cn('size-1.5 rounded-full', DOT[a.status] ?? 'bg-muted-foreground')} />
                            </PopoverTrigger>
                            <PopoverContent className="w-80 space-y-3" align="start">
                              <div className="flex items-center gap-3">
                                <PersonAvatar name={v?.name ?? '?'} size="lg" />
                                <div className="min-w-0">
                                  <p className="truncate font-medium">{v?.name}</p>
                                  <p className="text-xs capitalize text-muted-foreground">{a.status.replace('_', ' ')} · {fmtRange(s)}</p>
                                </div>
                                {a.score !== null && <span className="ml-auto rounded-md bg-primary/15 px-2 py-1 text-xs font-semibold text-primary tabular" title="Engine score">{a.score}</span>}
                              </div>
                              <SkillTags skills={v?.skills ?? []} limit={5} highlight={s.required_skills} />
                              <div className="rounded-lg bg-muted/50 p-2.5">
                                <p className="mb-1 flex items-center gap-1 text-xs font-medium"><Info className="size-3.5 text-primary" /> Why this volunteer</p>
                                <ul className="space-y-0.5 text-xs text-muted-foreground">
                                  {(a.reason ?? 'Assigned manually').split('; ').map((r, i) => <li key={i}>• {r}</li>)}
                                </ul>
                              </div>
                              {(a.status === 'assigned' || a.status === 'confirmed') && (
                                <Button variant="destructive" size="sm" className="w-full" onClick={() => onDrop({ kind: 'assignment', assignment: a })}><UserMinus /> Mark dropped / no-show</Button>
                              )}
                            </PopoverContent>
                          </Popover>
                        );
                      })}
                      {Array.from({ length: open }).map((_, i) => (
                        <button key={i} onClick={() => onDrop({ kind: 'seat', shift: s })} title={`Open seat: needs ${s.required_skills.join(' + ')}`}
                          className="pulse-gap inline-flex items-center gap-1 rounded-full border border-dashed border-gap/70 px-2 py-0.5 text-xs text-gap transition-colors hover:bg-gap/15">
                          <CircleDashed className="size-3" /> Open
                        </button>
                      ))}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
