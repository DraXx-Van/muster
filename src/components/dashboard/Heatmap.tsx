'use client';
import type { CoverageCell, Shift, Zone } from '@/lib/types';
import { STATUS_STYLE, blockKey, timeBlocks } from '@/lib/derive';
import { cn } from '@/lib/utils';
import { ms } from '@/lib/engine/time';
import { ZoneBadge } from '@/components/common/visual';

function Seats({ present, required, status }: { present: number; required: number; status: CoverageCell['status'] }) {
  const st = STATUS_STYLE[status];
  const shown = Math.min(required, 8);
  return (
    <span className="flex flex-wrap items-center justify-center gap-1">
      {Array.from({ length: shown }).map((_, i) => (
        <span key={i} className={cn('size-2.5 rounded-full border-[1.5px]', i < present ? st.solid : 'bg-transparent')} style={{ borderColor: st.var }} />
      ))}
      {required > shown && <span className="text-[10px] font-medium text-muted-foreground">+{required - shown}</span>}
    </span>
  );
}

/** Zones (rows) x time blocks (columns). Seats are dots: filled when someone is there, hollow when open. */
export function Heatmap({ zones, shifts, cells, now, onCell }: {
  zones: Zone[]; shifts: Shift[]; cells: CoverageCell[]; now: Date; onCell?: (shiftId: string) => void;
}) {
  const blocks = timeBlocks(shifts);
  const cellByShift = new Map(cells.map((c) => [c.shift_id, c]));
  const shiftAt = (zoneId: string, key: string) => shifts.find((s) => s.zone_id === zoneId && blockKey(s) === key);
  const t = now.getTime();
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[520px] border-separate border-spacing-y-1.5 text-sm">
        <thead>
          <tr>
            <th className="w-44 text-left" />
            {blocks.map((b) => {
              const live = ms(b.start) <= t && t < ms(b.end);
              return (
                <th key={b.key} className="px-1 pb-1 text-center">
                  <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', live ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>{b.label}{live && <span className="size-1.5 animate-pulse rounded-full bg-white" />}</span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {zones.map((z) => (
            <tr key={z.id}>
              <td className="pr-3 text-left text-sm font-medium"><ZoneBadge name={z.name} color={z.color} /></td>
              {blocks.map((b) => {
                const s = shiftAt(z.id, b.key);
                const c = s ? cellByShift.get(s.id) : undefined;
                if (!s || !c) return <td key={b.key} className="px-1"><span className="block rounded-xl bg-muted/40 py-3 text-center text-xs text-muted-foreground">-</span></td>;
                const st = STATUS_STYLE[c.status];
                return (
                  <td key={b.key} className="px-1">
                    <button onClick={() => onCell?.(s.id)} title={`${z.name}, ${b.label}: ${c.present} of ${c.required} seats (${st.label})`}
                      className={cn('w-full rounded-xl border px-2 py-2.5 transition-all hover:-translate-y-px hover:shadow-card', st.bg, st.border, c.status === 'gap' && 'pulse-gap')}>
                      <Seats present={c.present} required={c.required} status={c.status} />
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
