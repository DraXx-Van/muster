// Coverage per shift (planning or live) and staffing move suggestions.
import type {
  Assignment, CoverageCell, CoverageStatus, MoveSuggestion, Shift, Volunteer, Zone,
} from '../types';
import { isActiveStatus, isAvailable, hasSkills } from './constraints';
import { MIN, ms } from './time';

const LIVE_GRACE_MS = 15 * MIN; // volunteers have 15 min after shift start to check in before the shift counts as short

function statusOf(present: number, required: number): CoverageStatus {
  if (present >= required) return 'covered';
  return present > 0 ? 'partial' : 'gap';
}

/**
 * planned: active assignments count. live: before start+15min the plan counts,
 * afterwards only people actually checked in (or already completed once the shift is over).
 */
export function computeCoverage(shifts: Shift[], assignments: Assignment[], mode: 'planned' | 'live', now: Date): CoverageCell[] {
  const byShift = new Map<string, Assignment[]>();
  for (const a of assignments) {
    if (!byShift.has(a.shift_id)) byShift.set(a.shift_id, []);
    byShift.get(a.shift_id)!.push(a);
  }
  const t = now.getTime();
  return shifts.map((s) => {
    const list = byShift.get(s.id) ?? [];
    let present: number;
    if (mode === 'planned' || t < ms(s.starts_at) + LIVE_GRACE_MS) {
      present = list.filter((a) => isActiveStatus(a.status)).length;
    } else if (t >= ms(s.ends_at)) {
      present = list.filter((a) => a.status === 'checked_in' || a.status === 'completed').length;
    } else {
      present = list.filter((a) => a.status === 'checked_in').length;
    }
    return { zone_id: s.zone_id, shift_id: s.id, required: s.headcount, present, status: statusOf(present, s.headcount) };
  });
}

/**
 * Suggest moving people from over-staffed shifts to short ones running at the same time.
 * Only people in a shift whose window contains the target shift are suggested (they stay in that window).
 */
export function suggestMoves(
  cells: CoverageCell[], volunteers: Volunteer[], shifts: Shift[], assignments: Assignment[], now: Date, zones: Zone[] = [],
): MoveSuggestion[] {
  const shiftById = new Map(shifts.map((s) => [s.id, s]));
  const volById = new Map(volunteers.map((v) => [v.id, v]));
  const zoneName = (id: string) => zones.find((z) => z.id === id)?.name ?? id.slice(0, 6);
  const active = assignments.filter((a) => isActiveStatus(a.status) || a.status === 'checked_in');
  const heldBy = new Map<string, Shift[]>();
  for (const a of active) {
    const s = shiftById.get(a.shift_id);
    if (s) heldBy.set(a.volunteer_id, [...(heldBy.get(a.volunteer_id) ?? []), s]);
  }

  const short = cells.filter((c) => c.present < c.required && ms(shiftById.get(c.shift_id)!.ends_at) > now.getTime());
  const surplus = new Map(cells.filter((c) => c.present > c.required).map((c) => [c.shift_id, c.present - c.required]));
  const moved = new Set<string>();
  const out: MoveSuggestion[] = [];

  for (const cell of short.sort((a, b) => b.required - b.present - (a.required - a.present))) {
    const target = shiftById.get(cell.shift_id)!;
    let need = cell.required - cell.present;
    while (need > 0) {
      let best: { v: Volunteer; from: Shift; score: number } | null = null;
      for (const a of active) {
        const from = shiftById.get(a.shift_id);
        if (!from || from.zone_id === target.zone_id || (surplus.get(from.id) ?? 0) <= 0) continue;
        if (moved.has(a.volunteer_id)) continue;
        if (ms(from.starts_at) > ms(target.starts_at) || ms(from.ends_at) < ms(target.ends_at)) continue;
        const v = volById.get(a.volunteer_id);
        if (!v || !hasSkills(v, target) || !isAvailable(v, target)) continue;
        // must not already be in another shift that clashes with the target (other than the one they leave)
        if ((heldBy.get(v.id) ?? []).some((s) => s.id !== from.id && ms(s.starts_at) < ms(target.ends_at) && ms(target.starts_at) < ms(s.ends_at))) continue;
        const score = (v.preferred_zone_ids.includes(target.zone_id) ? 15 : 0) + 5 * v.reliability + (surplus.get(from.id) ?? 0);
        if (!best || score > best.score) best = { v, from, score };
      }
      if (!best) break;
      moved.add(best.v.id);
      surplus.set(best.from.id, (surplus.get(best.from.id) ?? 0) - 1);
      const fromCell = cells.find((c) => c.shift_id === best!.from.id)!;
      out.push({
        volunteer_id: best.v.id,
        from_zone_id: best.from.zone_id,
        to_zone_id: target.zone_id,
        to_shift_id: target.id,
        reason: `${best.v.name} (${zoneName(best.from.zone_id)}, +${fromCell.present - fromCell.required} over) -> ${zoneName(target.zone_id)} (-${cell.required - cell.present}). Has ${target.required_skills.join(' + ') || 'the needed skills'}.`,
      });
      need--;
    }
  }
  return out;
}
