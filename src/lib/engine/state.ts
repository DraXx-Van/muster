// Shared planning state built from the current assignments. Internal to the engine.
import type { AutoAssignInput, Gap, Shift, Volunteer } from '../types';
import { isActiveStatus, rejection, type Rejection } from './constraints';
import { fmtRange, hoursOf } from './time';
import { findScarceSkills, type ScoreContext } from './score';

export interface PlanState {
  shiftsById: Map<string, Shift>;
  volShifts: Map<string, Shift[]>; // active shifts held per volunteer (existing + newly planned)
  filled: Map<string, number>;     // active seats per shift
  blocked: Set<string>;            // "shiftId|volunteerId" pairs with ANY existing row (incl. dropped/no_show)
  ctx: ScoreContext;
}

export function buildState(input: AutoAssignInput): PlanState {
  const { volunteers, shifts, existing } = input;
  const shiftsById = new Map(shifts.map((s) => [s.id, s]));
  const volShifts = new Map<string, Shift[]>(volunteers.map((v) => [v.id, []]));
  const filled = new Map<string, number>();
  const blocked = new Set<string>();
  for (const a of existing) {
    const shift = shiftsById.get(a.shift_id);
    if (!shift) continue;
    blocked.add(`${a.shift_id}|${a.volunteer_id}`);
    if (!isActiveStatus(a.status)) continue;
    filled.set(a.shift_id, (filled.get(a.shift_id) ?? 0) + 1);
    volShifts.get(a.volunteer_id)?.push(shift);
  }
  const seatHours = shifts.reduce((h, s) => h + s.headcount * hoursOf(s), 0);
  const ctx: ScoreContext = {
    targetHours: volunteers.length ? seatHours / volunteers.length : 0,
    scarceSkills: findScarceSkills(volunteers),
  };
  return { shiftsById, volShifts, filled, blocked, ctx };
}

export function canTake(v: Volunteer, shift: Shift, st: PlanState): boolean {
  if (st.blocked.has(`${shift.id}|${v.id}`)) return false;
  return rejection(v, shift, st.volShifts.get(v.id) ?? []) === null;
}

/** Why a seat stays empty, e.g. "No First Aid certified volunteer free 12:00-15:00". */
export function explainGap(shift: Shift, volunteers: Volunteer[], st: PlanState): string {
  const skillName = shift.required_skills.join(' + ') || 'the role';
  const tally: Record<Rejection | 'blocked', number> = { skills: 0, availability: 0, overlap: 0, hours: 0, already: 0, blocked: 0 };
  for (const v of volunteers) {
    if (st.blocked.has(`${shift.id}|${v.id}`)) { tally.blocked++; continue; }
    const why = rejection(v, shift, st.volShifts.get(v.id) ?? []);
    if (why) tally[why]++;
  }
  const n = volunteers.length;
  const range = fmtRange(shift);
  if (tally.skills === n) return `No volunteer has ${skillName}`;
  const skilled = n - tally.skills;
  if (tally.availability === skilled) return `${skilled} volunteer${skilled === 1 ? '' : 's'} with ${skillName}, but none available ${range}`;
  return `No ${skillName} volunteer free ${range}: all are already booked or at max hours`;
}

export function buildGaps(shifts: Shift[], volunteers: Volunteer[], st: PlanState): Gap[] {
  const gaps: Gap[] = [];
  for (const s of shifts) {
    const missing = s.headcount - (st.filled.get(s.id) ?? 0);
    if (missing > 0) gaps.push({ shift_id: s.id, seatsMissing: missing, reason: explainGap(s, volunteers, st) });
  }
  return gaps;
}
