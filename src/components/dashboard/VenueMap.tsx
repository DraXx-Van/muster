'use client';
import { motion } from 'framer-motion';
import type { CoverageCell, Shift, Zone } from '@/lib/types';
import { STATUS_STYLE, focusShift } from '@/lib/derive';

export interface ZoneSummary { zone: Zone; shift: Shift | undefined; cell: CoverageCell | undefined; openIssues: number }

/** Custom SVG floor plan. Each zone is coloured by live coverage; red zones pulse. Click opens the zone sheet. */
export function VenueMap({ zones, shifts, cells, now, issuesByZone, onSelect }: {
  zones: Zone[]; shifts: Shift[]; cells: CoverageCell[]; now: Date; issuesByZone: Map<string, number>; onSelect: (z: ZoneSummary) => void;
}) {
  const cellByShift = new Map(cells.map((c) => [c.shift_id, c]));
  return (
    <div className="grid-dots rounded-xl border bg-background/40 p-2 sm:p-3">
      <svg viewBox="0 0 800 480" className="h-auto w-full" role="img" aria-label="Venue floor plan coloured by staffing coverage">
        <rect x="6" y="6" width="788" height="468" rx="18" fill="none" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="6 6" />
        {zones.map((z, i) => {
          const shift = focusShift(z.id, shifts, now);
          const cell = shift ? cellByShift.get(shift.id) : undefined;
          const st = STATUS_STYLE[cell?.status ?? 'gap'];
          const issues = issuesByZone.get(z.id) ?? 0;
          const gap = cell?.status === 'gap';
          return (
            <motion.g
              key={z.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: i * 0.03 }}
              className="cursor-pointer" tabIndex={0} role="button" aria-label={`${z.name}: ${cell ? `${cell.present} of ${cell.required}` : 'no shift'}`}
              onClick={() => onSelect({ zone: z, shift, cell, openIssues: issues })}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect({ zone: z, shift, cell, openIssues: issues }); }}
            >
              <rect
                x={z.map_x} y={z.map_y} width={z.map_w} height={z.map_h} rx="14"
                className={gap ? 'pulse-gap' : undefined}
                style={{ fill: `color-mix(in oklch, ${st.var} 16%, transparent)`, stroke: st.var, strokeWidth: gap ? 2.5 : 1.5, transition: 'fill 0.3s, stroke 0.3s' }}
              />
              <rect x={z.map_x + 12} y={z.map_y + 14} width="6" height="6" rx="3" style={{ fill: z.color }} />
              <text x={z.map_x + 24} y={z.map_y + 21} className="fill-foreground text-[13px] font-semibold">{z.name}</text>
              <text x={z.map_x + 12} y={z.map_y + z.map_h - 34} className="fill-foreground text-[30px] font-semibold tabular-nums">
                {cell ? cell.present : '-'}<tspan className="fill-muted-foreground text-[16px] font-normal">{cell ? ` / ${cell.required}` : ''}</tspan>
              </text>
              <text x={z.map_x + 12} y={z.map_y + z.map_h - 12} className="text-[11px]" style={{ fill: st.var }}>
                {st.label}{shift ? ` · ${shift.role_name}` : ''}
              </text>
              {issues > 0 && (
                <g transform={`translate(${z.map_x + z.map_w - 26}, ${z.map_y + 10})`}>
                  <circle r="0" cx="8" cy="8" />
                  <rect width="18" height="18" rx="9" style={{ fill: 'var(--gap)' }} className="pulse-ring" />
                  <text x="9" y="13" textAnchor="middle" className="fill-white text-[11px] font-bold">{issues}</text>
                </g>
              )}
            </motion.g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground">
        {(['covered', 'partial', 'gap'] as const).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5"><span className={`size-2.5 rounded-sm ${STATUS_STYLE[s].solid}`} />{STATUS_STYLE[s].label}</span>
        ))}
        <span className="ml-auto">Showing the running or next shift per zone</span>
      </div>
    </div>
  );
}
