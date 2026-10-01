'use client';
import { motion } from 'framer-motion';
import type { CoverageCell, Shift, Zone } from '@/lib/types';
import { STATUS_STYLE, focusShift } from '@/lib/derive';

export interface ZoneSummary { zone: Zone; shift: Shift | undefined; cell: CoverageCell | undefined; openIssues: number }

/** Custom SVG floor plan. Each zone is tinted by live coverage; seats are dots; red zones pulse. Click opens the zone sheet. */
export function VenueMap({ zones, shifts, cells, now, issuesByZone, onSelect }: {
  zones: Zone[]; shifts: Shift[]; cells: CoverageCell[]; now: Date; issuesByZone: Map<string, number>; onSelect: (z: ZoneSummary) => void;
}) {
  const cellByShift = new Map(cells.map((c) => [c.shift_id, c]));
  return (
    <div className="grid-dots rounded-2xl border bg-muted/30 p-2 sm:p-3">
      <svg viewBox="0 0 800 480" className="h-auto w-full" role="img" aria-label="Venue floor plan coloured by staffing coverage">
        {zones.map((z, i) => {
          const shift = focusShift(z.id, shifts, now);
          const cell = shift ? cellByShift.get(shift.id) : undefined;
          const st = STATUS_STYLE[cell?.status ?? 'gap'];
          const issues = issuesByZone.get(z.id) ?? 0;
          const gap = cell?.status === 'gap';
          const seats = Math.min(cell?.required ?? 0, 12);
          const small = z.map_h < 120;
          return (
            <motion.g
              key={z.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: i * 0.03 }}
              className="cursor-pointer outline-none" tabIndex={0} role="button" aria-label={`${z.name}: ${cell ? `${cell.present} of ${cell.required} seats` : 'no shift'}`}
              onClick={() => onSelect({ zone: z, shift, cell, openIssues: issues })}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect({ zone: z, shift, cell, openIssues: issues }); }}
            >
              <rect
                x={z.map_x} y={z.map_y} width={z.map_w} height={z.map_h} rx="16"
                className={gap ? 'pulse-gap' : undefined}
                style={{ fill: `color-mix(in oklch, ${st.var} 13%, var(--card))`, stroke: st.var, strokeWidth: gap ? 2.5 : 1.75, transition: 'fill 0.3s, stroke 0.3s' }}
              />
              <rect x={z.map_x + 14} y={z.map_y + 16} width="10" height="10" rx="3" style={{ fill: z.color }} />
              <text x={z.map_x + 32} y={z.map_y + 26} className="fill-foreground" style={{ fontSize: 15, fontWeight: 600 }}>{z.name}</text>
              {shift && <text x={z.map_x + 14} y={z.map_y + 46} className="fill-muted-foreground" style={{ fontSize: 12 }}>{shift.role_name}</text>}
              {/* seats as dots: filled = covered, outlined = still open */}
              <g transform={`translate(${z.map_x + 14}, ${z.map_y + z.map_h - (small ? 30 : 34)})`}>
                {Array.from({ length: seats }).map((_, k) => {
                  const filled = k < (cell?.present ?? 0);
                  const cols = Math.max(1, Math.floor((z.map_w - 28) / 20));
                  return <circle key={k} cx={(k % cols) * 20 + 7} cy={Math.floor(k / cols) * 18 + 7} r="6.5" style={{ fill: filled ? st.var : 'transparent', stroke: st.var, strokeWidth: 1.75 }} />;
                })}
              </g>
              <text x={z.map_x + z.map_w - 14} y={z.map_y + z.map_h - 14} textAnchor="end" style={{ fill: st.var, fontSize: 12, fontWeight: 600 }}>{cell ? st.label : 'No shift'}</text>
              {issues > 0 && (
                <g transform={`translate(${z.map_x + z.map_w - 34}, ${z.map_y + 12})`}>
                  <rect width="22" height="22" rx="11" style={{ fill: 'var(--gap)' }} className="pulse-ring" />
                  <text x="11" y="16" textAnchor="middle" style={{ fill: 'white', fontSize: 12, fontWeight: 700 }}>{issues}</text>
                </g>
              )}
            </motion.g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 px-1.5 text-xs text-muted-foreground">
        {(['covered', 'partial', 'gap'] as const).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5"><span className={`size-2.5 rounded-full ${STATUS_STYLE[s].solid}`} />{STATUS_STYLE[s].label}</span>
        ))}
        <span className="ml-auto">Each dot is a seat · showing the running or next shift</span>
      </div>
    </div>
  );
}
