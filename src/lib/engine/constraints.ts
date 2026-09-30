// Hard constraints (PRD section 5). A seat is ineligible if any of these fail.
import type { AssignmentStatus, Shift, Volunteer } from '../types';
import { TRAVEL_BUFFER_MS, hoursOf, ms } from './time';

const ACTIVE: AssignmentStatus[] = ['assigned', 'confirmed', 'checked_in', 'completed'];
export const isActiveStatus = (s: AssignmentStatus): boolean => ACTIVE.includes(s);

export type Rejection = 'skills' | 'availability' | 'overlap' | 'hours' | 'already';

export function hasSkills(v: Volunteer, shift: Shift): boolean {
  return shift.required_skills.every((s) => v.skills.includes(s));
}

/** True if ONE continuous availability window (after merging touching windows) covers the whole shift. */
export function isAvailable(v: Volunteer, shift: Shift): boolean {
  const start = ms(shift.starts_at);
  const end = ms(shift.ends_at);
  const wins = v.availability.map((w) => [ms(w.start), ms(w.end)] as const).sort((a, b) => a[0] - b[0]);
  if (wins.length === 0) return false;
  let [cs, ce] = wins[0];
  for (let i = 1; i < wins.length; i++) {
    const [ws, we] = wins[i];
    if (ws <= ce) ce = Math.max(ce, we);
    else {
      if (cs <= start && ce >= end) return true;
      cs = ws;
      ce = we;
    }
  }
  return cs <= start && ce >= end;
}

/** Overlap test. Different zones need a 15 min travel buffer; same-zone back-to-back shifts are fine. */
export function clashes(a: Shift, b: Shift): boolean {
  const gap = a.zone_id === b.zone_id ? 0 : TRAVEL_BUFFER_MS;
  return ms(a.starts_at) < ms(b.ends_at) + gap && ms(b.starts_at) < ms(a.ends_at) + gap;
}

export const totalHours = (shifts: Shift[]): number => shifts.reduce((h, s) => h + hoursOf(s), 0);

/** Returns why `v` cannot take `shift` given the shifts they already hold, or null if eligible. */
export function rejection(v: Volunteer, shift: Shift, current: Shift[]): Rejection | null {
  if (current.some((s) => s.id === shift.id)) return 'already';
  if (!hasSkills(v, shift)) return 'skills';
  if (!isAvailable(v, shift)) return 'availability';
  if (current.some((s) => clashes(s, shift))) return 'overlap';
  if (totalHours(current) + hoursOf(shift) > v.max_hours + 1e-9) return 'hours';
  return null;
}
