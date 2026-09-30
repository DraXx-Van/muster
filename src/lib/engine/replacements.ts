// Dropout / no-show rebalancing: ranked replacement suggestions for ONE seat.
import type { Assignment, AutoAssignInput, ReplacementSuggestion } from '../types';
import { MIN, fmtTime, ms } from './time';
import { describe, scoreAssignment } from './score';
import { buildState, canTake } from './state';

export function suggestReplacements(input: AutoAssignInput, dropped: Assignment, now: Date, limit = 5): ReplacementSuggestion[] {
  const shift = input.shifts.find((s) => s.id === dropped.shift_id);
  if (!shift || ms(shift.ends_at) <= now.getTime()) return [];

  // The dropped row stays in `existing` as 'dropped' so that person is never suggested for the same seat again.
  const existing = input.existing.map((a) => (a.id === dropped.id && a.status !== 'no_show' ? { ...a, status: 'dropped' as const } : a));
  const st = buildState({ ...input, existing });

  const startsInMin = Math.round((ms(shift.starts_at) - now.getTime()) / MIN);
  const when = startsInMin > 0 ? `shift starts ${fmtTime(shift.starts_at)}` : 'shift already under way';

  return input.volunteers
    .filter((v) => canTake(v, shift, st))
    .map((v) => {
      const b = scoreAssignment(v, shift, st.volShifts.get(v.id)!, st.ctx);
      return { volunteer_id: v.id, score: Math.round(b.total * 100) / 100, reason: `${describe(shift, b, v)}; free (${when})` };
    })
    .sort((a, b) => b.score - a.score || a.volunteer_id.localeCompare(b.volunteer_id))
    .slice(0, limit);
}
