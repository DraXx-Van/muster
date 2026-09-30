'use client';
import type { CoverageCell, Shift, Zone } from '@/lib/types';
import { STATUS_STYLE, blockKey, timeBlocks } from '@/lib/derive';
import { cn } from '@/lib/utils';
import { ms } from '@/lib/engine/time';

/** Zones (rows) x time blocks (columns). Each cell shows filled/required; the running block is outlined. */
export function Heatmap({ zones, shifts, cells, now, onCell }: {
  zones: Zone[]; shifts: Shift[]; cells: CoverageCell[]; now: Date; onCell?: (shiftId: string) => void;
}) {
  const blocks = timeBlocks(shifts);
  const cellByShift = new Map(cells.map((c) => [c.shift_id, c]));
  const shiftAt = (zoneId: string, key: string) => shifts.find((s) => s.zone_id === zoneId && blockKey(s) === key);
  const t = now.getTime();
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[460px] border-separate border-spacing-1.5 text-sm">
        <thead>
          <tr>
            <th className="w-36 text-left text-xs font-medium text-muted-foreground" />
            {blocks.map((b) => {
              const live = ms(b.start) <= t && t < ms(b.end);
              return <th key={b.key} className={cn('rounded-md py-1 text-xs font-medium', live ? 'bg-primary/15 text-primary' : 'text-muted-foreground')}>{b.label}{live && <span className="ml-1 text-[10px] uppercase">now</span>}</th>;
            })}
          </tr>
        </thead>
        <tbody>
          {zones.map((z) => (
            <tr key={z.id}>
              <td className="pr-2 text-left text-xs font-medium"><span className="mr-2 inline-block size-2 rounded-full align-middle" style={{ background: z.color }} />{z.name}</td>
              {blocks.map((b) => {
                const s = shiftAt(z.id, b.key);
                const c = s ? cellByShift.get(s.id) : undefined;
                if (!s || !c) return <td key={b.key} className="rounded-md bg-muted/30 text-center text-xs text-muted-foreground">-</td>;
                const st = STATUS_STYLE[c.status];
                return (
                  <td key={b.key}>
                    <button
                      onClick={() => onCell?.(s.id)}
                      title={`${z.name} ${b.label}: ${c.present} of ${c.required} (${st.label})`}
                      className={cn('w-full rounded-md border py-1.5 text-center text-xs font-semibold tabular-nums transition-colors hover:brightness-125', st.bg, st.border, st.text, c.status === 'gap' && 'pulse-gap')}
                    >
                      {c.present}/{c.required}
                    </button>
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
