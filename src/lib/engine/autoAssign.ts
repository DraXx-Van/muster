// Constructive greedy (hardest shift first) + swap-based local search. Pure: no DB, no clock.
import type { AssignStats, AutoAssignInput, AutoAssignResult, NewAssignment, Shift, Volunteer } from '../types';
import { totalHours } from './constraints';
import { describe, scoreAssignment } from './score';
import { buildGaps, buildState, canTake, type PlanState } from './state';

const MAX_SWAP_ITERATIONS = 200;

interface Planned { a: NewAssignment }

function computeStats(input: AutoAssignInput, st: PlanState, t0: number): AssignStats {
  const requiredSeats = input.shifts.reduce((n, s) => n + s.headcount, 0);
  const filledSeats = input.shifts.reduce((n, s) => n + Math.min(s.headcount, st.filled.get(s.id) ?? 0), 0);
  const hours = input.volunteers.map((v) => totalHours(st.volShifts.get(v.id) ?? []));
  const avg = hours.length ? hours.reduce((a, b) => a + b, 0) / hours.length : 0;
  const variance = hours.length ? hours.reduce((a, h) => a + (h - avg) ** 2, 0) / hours.length : 0;
  return {
    coveragePct: requiredSeats ? Math.round((filledSeats / requiredSeats) * 1000) / 10 : 100,
    filledSeats,
    requiredSeats,
    hoursStdDev: Math.round(Math.sqrt(variance) * 100) / 100,
    avgHours: Math.round(avg * 100) / 100,
    computeMs: Math.round((performance.now() - t0) * 100) / 100,
  };
}

function place(st: PlanState, v: Volunteer, shift: Shift): void {
  st.volShifts.get(v.id)!.push(shift);
  st.filled.set(shift.id, (st.filled.get(shift.id) ?? 0) + 1);
}
function unplace(st: PlanState, v: Volunteer, shift: Shift): void {
  const list = st.volShifts.get(v.id)!;
  list.splice(list.findIndex((s) => s.id === shift.id), 1);
  st.filled.set(shift.id, (st.filled.get(shift.id) ?? 1) - 1);
}

/** Best eligible volunteer for one seat (ties broken by id so results are deterministic). */
function bestFor(shift: Shift, volunteers: Volunteer[], st: PlanState, skip?: string) {
  let best: { v: Volunteer; total: number; reason: string } | null = null;
  for (const v of volunteers) {
    if (v.id === skip || !canTake(v, shift, st)) continue;
    const b = scoreAssignment(v, shift, st.volShifts.get(v.id)!, st.ctx);
    if (!best || b.total > best.total + 1e-9 || (Math.abs(b.total - best.total) <= 1e-9 && v.id < best.v.id)) {
      best = { v, total: b.total, reason: describe(shift, b, v) };
    }
  }
  return best;
}

export function autoAssign(input: AutoAssignInput): AutoAssignResult {
  const t0 = performance.now();
  const { volunteers, shifts } = input;
  const st = buildState(input);
  const planned = new Map<string, Map<string, Planned>>(); // shiftId -> volunteerId -> assignment
  const volById = new Map(volunteers.map((v) => [v.id, v]));
  const missing = (s: Shift) => s.headcount - (st.filled.get(s.id) ?? 0);

  const add = (shift: Shift, v: Volunteer, total: number, reason: string) => {
    place(st, v, shift);
    if (!planned.has(shift.id)) planned.set(shift.id, new Map());
    planned.get(shift.id)!.set(v.id, { a: { shift_id: shift.id, volunteer_id: v.id, score: Math.round(total * 100) / 100, reason } });
  };

  // 1. Scarcity order: shifts with the fewest eligible volunteers per open seat go first.
  const open = shifts.filter((s) => missing(s) > 0);
  const scarcity = new Map(
    open.map((s) => [s.id, volunteers.filter((v) => canTake(v, s, st)).length / missing(s)]),
  );
  open.sort((a, b) => scarcity.get(a.id)! - scarcity.get(b.id)! || a.starts_at.localeCompare(b.starts_at) || a.id.localeCompare(b.id));

  // 2. Fill each seat with the best-scoring eligible volunteer.
  for (const shift of open) {
    while (missing(shift) > 0) {
      const pick = bestFor(shift, volunteers, st);
      if (!pick) break;
      add(shift, pick.v, pick.total, pick.reason);
    }
  }

  // 3. Local search: to fill an empty seat on S2, move a planned volunteer A from S1 to S2
  //    and backfill S1 with another eligible volunteer B. Every step adds one filled seat.
  let iterations = 0;
  let improved = true;
  while (improved && iterations < MAX_SWAP_ITERATIONS) {
    improved = false;
    for (const s2 of shifts) {
      if (missing(s2) <= 0) continue;
      let done = false;
      for (const [s1Id, byVol] of planned) {
        if (done) break;
        const s1 = st.shiftsById.get(s1Id)!;
        for (const aId of [...byVol.keys()]) {
          const a = volById.get(aId)!;
          // can A take S2 once S1 is released?
          unplace(st, a, s1);
          const aCanMove = canTake(a, s2, st);
          if (aCanMove) {
            const backfill = bestFor(s1, volunteers, st, a.id);
            if (backfill) {
              byVol.delete(aId);
              const b2 = scoreAssignment(a, s2, st.volShifts.get(a.id)!, st.ctx);
              add(s2, a, b2.total, describe(s2, b2, a));
              add(s1, backfill.v, backfill.total, backfill.reason);
              iterations++;
              improved = true;
              done = true;
              break;
            }
          }
          place(st, a, s1); // revert
        }
      }
      if (iterations >= MAX_SWAP_ITERATIONS) break;
    }
  }

  const assignments = [...planned.values()].flatMap((m) => [...m.values()].map((p) => p.a));
  return { assignments, gaps: buildGaps(shifts, volunteers, st), stats: computeStats(input, st, t0) };
}

/** Benchmark baseline: first-come-first-served in shift order and list order.
 *  Valid (respects every hard constraint) but blind to scarcity, fairness and preferences. */
export function naiveAssign(input: AutoAssignInput): AutoAssignResult {
  const t0 = performance.now();
  const { volunteers, shifts } = input;
  const st = buildState(input);
  const assignments: NewAssignment[] = [];
  for (const shift of shifts) {
    while (shift.headcount - (st.filled.get(shift.id) ?? 0) > 0) {
      const v = volunteers.find((x) => canTake(x, shift, st));
      if (!v) break;
      place(st, v, shift);
      assignments.push({ shift_id: shift.id, volunteer_id: v.id, score: 0, reason: 'First available volunteer with the required skills' });
    }
  }
  return { assignments, gaps: buildGaps(shifts, volunteers, st), stats: computeStats(input, st, t0) };
}
