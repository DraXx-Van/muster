// Soft scoring (PRD section 5). Higher is better. Every term is returned so the UI can explain "why".
import type { Shift, Volunteer } from '../types';
import { totalHours } from './constraints';
import { TRAVEL_BUFFER_MS, hoursOf, ms } from './time';

export interface ScoreContext {
  targetHours: number;       // average hours per volunteer if seats were spread evenly
  scarceSkills: Set<string>; // skills held by very few volunteers: don't waste them on seats that don't need them
}

export interface ScoreBreakdown {
  skillFit: number;     // -12 per scarce skill this volunteer has that the shift does not need
  preference: number;   // +15 if the shift's zone is preferred
  fairness: number;     // -4 per hour above target after this seat, plus a tiny pull towards less-loaded people
  reliability: number;  // +5 * reliability
  continuity: number;   // +8 if they work the adjacent block in the same zone
  total: number;
  hoursAfter: number;
  targetHours: number;
  wastedScarce: string[];
}

/** Skills that few volunteers have (<= 12% of the pool, at least 2). */
export function findScarceSkills(volunteers: Volunteer[]): Set<string> {
  const counts = new Map<string, number>();
  for (const v of volunteers) for (const s of v.skills) counts.set(s, (counts.get(s) ?? 0) + 1);
  const limit = Math.max(2, Math.floor(volunteers.length * 0.12));
  return new Set([...counts].filter(([, n]) => n <= limit).map(([s]) => s));
}

export function scoreAssignment(v: Volunteer, shift: Shift, current: Shift[], ctx: ScoreContext): ScoreBreakdown {
  const wastedScarce = v.skills.filter((s) => ctx.scarceSkills.has(s) && !shift.required_skills.includes(s));
  const skillFit = -12 * wastedScarce.length;
  const preference = v.preferred_zone_ids.includes(shift.zone_id) ? 15 : 0;
  const hoursAfter = totalHours(current) + hoursOf(shift);
  const fairness = -4 * Math.max(0, hoursAfter - ctx.targetHours) - 0.5 * hoursAfter;
  const reliability = 5 * v.reliability;
  const continuity = current.some(
    (s) =>
      s.zone_id === shift.zone_id &&
      (Math.abs(ms(s.ends_at) - ms(shift.starts_at)) <= TRAVEL_BUFFER_MS ||
        Math.abs(ms(shift.ends_at) - ms(s.starts_at)) <= TRAVEL_BUFFER_MS),
  )
    ? 8
    : 0;
  const total = skillFit + preference + fairness + reliability + continuity;
  return { skillFit, preference, fairness, reliability, continuity, total, hoursAfter, targetHours: ctx.targetHours, wastedScarce };
}

/** Human-readable reason, e.g. "Has First Aid; prefers this zone; 3.0h total (at or below avg 5.2h); 92% reliable". */
export function describe(shift: Shift, b: ScoreBreakdown, v: Volunteer): string {
  const parts: string[] = [];
  parts.push(shift.required_skills.length ? `Has ${shift.required_skills.join(' + ')}` : 'No special skills needed');
  if (b.preference > 0) parts.push('prefers this zone');
  if (b.continuity > 0) parts.push('continues from previous block in same zone');
  parts.push(`${b.hoursAfter.toFixed(1)}h total (${b.hoursAfter > b.targetHours ? 'above' : 'at or below'} avg ${b.targetHours.toFixed(1)}h)`);
  parts.push(`${Math.round(v.reliability * 100)}% reliable`);
  if (b.wastedScarce.length) parts.push(`uses scarce skill ${b.wastedScarce.join(', ')} here`);
  return parts.join('; ');
}
