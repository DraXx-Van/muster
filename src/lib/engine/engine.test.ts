import { describe, expect, it } from 'vitest';
import { buildSeed } from '../seed/data';
import type { Assignment, AutoAssignInput, Issue, NewAssignment, Shift, Volunteer } from '../types';
import {
  autoAssign, clashes, computeCoverage, isAvailable, hasSkills, naiveAssign, routeIssue,
  suggestMoves, suggestReplacements, tickEscalations,
} from './index';
import { totalHours } from './constraints';

const seed = buildSeed();
const people = seed.volunteers;
const volunteers = people.filter((v) => v.role === 'volunteer');
const input: AutoAssignInput = { volunteers, shifts: seed.shifts, existing: [] };
const NOW = new Date('2026-10-03T03:00:00Z'); // 08:30 IST, before the first shift

const toAssignments = (list: NewAssignment[], status: Assignment['status'] = 'assigned'): Assignment[] =>
  list.map((a, i) => ({ id: `a${i}`, event_id: 'e', ...a, status, checked_in_at: null, checked_out_at: null }));

/** Asserts every hard constraint for a full set of assignments. */
function expectValid(list: { shift_id: string; volunteer_id: string }[]) {
  const shiftById = new Map(seed.shifts.map((s) => [s.id, s]));
  const volById = new Map(volunteers.map((v) => [v.id, v]));
  const perVol = new Map<string, Shift[]>();
  const perShift = new Map<string, number>();
  for (const a of list) {
    const s = shiftById.get(a.shift_id)!;
    const v = volById.get(a.volunteer_id)!;
    expect(hasSkills(v, s), `${v.name} lacks skills for ${s.role_name}`).toBe(true);
    expect(isAvailable(v, s), `${v.name} unavailable`).toBe(true);
    perVol.set(v.id, [...(perVol.get(v.id) ?? []), s]);
    perShift.set(s.id, (perShift.get(s.id) ?? 0) + 1);
  }
  for (const [id, shifts] of perVol) {
    for (let i = 0; i < shifts.length; i++)
      for (let j = i + 1; j < shifts.length; j++)
        expect(clashes(shifts[i], shifts[j]), 'double booking / missing travel buffer').toBe(false);
    expect(totalHours(shifts)).toBeLessThanOrEqual(volById.get(id)!.max_hours + 1e-9);
  }
  for (const [id, n] of perShift) expect(n).toBeLessThanOrEqual(shiftById.get(id)!.headcount);
}

describe('seed', () => {
  it('has the scarce skills the demo relies on', () => {
    expect(volunteers).toHaveLength(60);
    expect(seed.shifts).toHaveLength(32);
    expect(volunteers.filter((v) => v.skills.includes('First Aid'))).toHaveLength(4);
    expect(volunteers.filter((v) => v.skills.includes('AV/Tech'))).toHaveLength(6);
    const seats = seed.shifts.reduce((n, s) => n + s.headcount, 0);
    expect(seats).toBeGreaterThan(95);
    expect(seats).toBeLessThan(115);
  });
});

describe('autoAssign', () => {
  const result = autoAssign(input);

  it('never double-books, never breaks skills/availability/max hours/headcount', () => {
    expectValid(result.assignments);
  });

  it('leaves only a few explained gaps on the tight seed', () => {
    console.log('engine', result.stats, 'gaps', result.gaps.map((g) => g.reason));
    expect(result.stats.coveragePct).toBeGreaterThan(85);
    expect(result.gaps.length).toBeGreaterThanOrEqual(1);
    for (const g of result.gaps) expect(g.reason.length).toBeGreaterThan(10);
  });

  it('is at least as good as naive on coverage and fairer on hours', () => {
    const naive = naiveAssign(input);
    console.log('naive', naive.stats);
    expectValid(naive.assignments);
    expect(result.stats.coveragePct).toBeGreaterThanOrEqual(naive.stats.coveragePct);
    expect(result.stats.hoursStdDev).toBeLessThan(naive.stats.hoursStdDev);
  });

  it('is deterministic and keeps existing assignments', () => {
    expect(autoAssign(input).assignments.map((a) => a.volunteer_id + a.shift_id))
      .toEqual(result.assignments.map((a) => a.volunteer_id + a.shift_id));
    const keep = toAssignments(result.assignments.slice(0, 10));
    const second = autoAssign({ ...input, existing: keep });
    expect(second.assignments.length).toBe(result.assignments.length - 10 + (second.stats.filledSeats - result.stats.filledSeats));
    expectValid([...keep, ...second.assignments]);
  });

  it('explains every pick', () => {
    for (const a of result.assignments.slice(0, 5)) expect(a.reason).toMatch(/reliable/);
  });

  it('runs fast on 500 volunteers', () => {
    const big: Volunteer[] = [];
    const shifts: Shift[] = [];
    for (let k = 0; k < 8; k++) {
      volunteers.forEach((v) => big.push({ ...v, id: `${v.id}-${k}` }));
      seed.shifts.forEach((s) => shifts.push({ ...s, id: `${s.id}-${k}` }));
    }
    const r = autoAssign({ volunteers: big.slice(0, 500), shifts, existing: [] });
    console.log('500 volunteers:', r.stats);
    expect(r.stats.computeMs).toBeLessThan(5000);
  });
});

describe('suggestReplacements', () => {
  const plan = autoAssign(input);
  const assigned = toAssignments(plan.assignments);
  const faShift = seed.shifts.find((s) => s.role_name === 'First Aid Responder' && s.headcount === 2)!;

  it('suggests eligible, ranked, different people for a dropped seat', () => {
    const dropped = assigned.find((a) => a.shift_id === faShift.id)!;
    const out = suggestReplacements({ ...input, existing: assigned }, dropped, NOW);
    console.log('replacements', out.length, out[0]?.reason);
    expect(out.length).toBeLessThanOrEqual(5);
    for (const s of out) {
      expect(s.volunteer_id).not.toBe(dropped.volunteer_id);
      const v = volunteers.find((x) => x.id === s.volunteer_id)!;
      expect(hasSkills(v, faShift)).toBe(true);
      expect(isAvailable(v, faShift)).toBe(true);
      const others = assigned.filter((a) => a.volunteer_id === v.id && a.id !== dropped.id).map((a) => seed.shifts.find((s2) => s2.id === a.shift_id)!);
      for (const o of others) expect(clashes(o, faShift)).toBe(false);
    }
    for (let i = 1; i < out.length; i++) expect(out[i - 1].score).toBeGreaterThanOrEqual(out[i].score);
  });

  it('returns nothing for a shift that is already over', () => {
    const dropped = assigned.find((a) => a.shift_id === faShift.id)!;
    expect(suggestReplacements({ ...input, existing: assigned }, dropped, new Date('2026-10-03T20:00:00Z'))).toEqual([]);
  });
});

describe('computeCoverage + suggestMoves', () => {
  const plan = autoAssign(input);
  const assigned = toAssignments(plan.assignments);

  it('planned coverage matches the engine', () => {
    const cells = computeCoverage(seed.shifts, assigned, 'planned', NOW);
    expect(cells.reduce((n, c) => n + Math.min(c.present, c.required), 0)).toBe(plan.stats.filledSeats);
    expect(cells.every((c) => ['covered', 'partial', 'gap'].includes(c.status))).toBe(true);
  });

  it('live mode counts only checked-in people once the grace period is over', () => {
    const s = seed.shifts[0];
    const a: Assignment[] = [
      { id: '1', event_id: 'e', shift_id: s.id, volunteer_id: 'x', status: 'checked_in', score: 0, reason: '', checked_in_at: null, checked_out_at: null },
      { id: '2', event_id: 'e', shift_id: s.id, volunteer_id: 'y', status: 'assigned', score: 0, reason: '', checked_in_at: null, checked_out_at: null },
    ];
    const late = new Date(new Date(s.starts_at).getTime() + 30 * 60_000);
    const early = new Date(new Date(s.starts_at).getTime() - 30 * 60_000);
    expect(computeCoverage([s], a, 'live', late)[0].present).toBe(1);
    expect(computeCoverage([s], a, 'live', early)[0].present).toBe(2);
  });

  it('suggests moving a skilled person from an overstaffed zone to a short one', () => {
    const [zA, zB] = seed.zones;
    const start = '2026-10-03T03:30:00.000Z';
    const end = '2026-10-03T06:30:00.000Z';
    const mk = (id: string, zone: string, hc: number): Shift => ({ id, event_id: 'e', zone_id: zone, role_name: 'r', required_skills: ['Hospitality'], starts_at: start, ends_at: end, headcount: hc });
    const shifts = [mk('over', zA.id, 1), mk('short', zB.id, 1)];
    const vols = [1, 2].map((n): Volunteer => ({ ...volunteers[0], id: `v${n}`, name: `V${n}`, skills: ['Hospitality'], availability: [{ start, end }], preferred_zone_ids: [] }));
    const asg: Assignment[] = vols.map((v, i) => ({ id: `${i}`, event_id: 'e', shift_id: 'over', volunteer_id: v.id, status: 'assigned', score: 0, reason: '', checked_in_at: null, checked_out_at: null }));
    const cells = computeCoverage(shifts, asg, 'planned', NOW);
    const moves = suggestMoves(cells, vols, shifts, asg, NOW, seed.zones);
    expect(moves).toHaveLength(1);
    expect(moves[0]).toMatchObject({ from_zone_id: zA.id, to_zone_id: zB.id, to_shift_id: 'short' });
    expect(moves[0].reason).toContain(zB.name);
  });
});

describe('issues: routing and escalation', () => {
  const now = new Date('2026-10-03T05:00:00Z');
  const zone = seed.zones.find((z) => z.name === 'Parking')!;
  const firstAid = seed.zones.find((z) => z.name === 'First Aid')!;

  it('routes to the zone coordinator; medical also pages First Aid', () => {
    const r = routeIssue({ category: 'crowd_surge', severity: 'critical', zone_id: zone.id, description: 'x' }, people, seed.zones, now);
    expect(r.assigned_to).toBe(zone.coordinator_id);
    expect(new Date(r.ack_deadline).getTime() - now.getTime()).toBe(30_000);
    const m = routeIssue({ category: 'medical', severity: 'high', zone_id: zone.id, description: 'x' }, people, seed.zones, now);
    expect(m.notifications.map((n) => n.volunteer_id)).toContain(firstAid.coordinator_id);
  });

  it('escalates zone coordinator -> head coordinator -> organizer, then stops', () => {
    const base = routeIssue({ category: 'security', severity: 'critical', zone_id: zone.id, description: 'x' }, people, seed.zones, now);
    let issue: Issue = {
      id: 'i1', event_id: 'e', zone_id: zone.id, category: 'security', severity: 'critical', description: 'x', status: 'open',
      raised_by: null, assigned_to: base.assigned_to, escalation_level: 0, ack_deadline: base.ack_deadline,
      acknowledged_at: null, resolved_at: null, created_at: now.toISOString(),
    };
    expect(tickEscalations([issue], people, seed.zones, now).updates).toEqual([]); // deadline not reached
    const t1 = new Date(now.getTime() + 31_000);
    const r1 = tickEscalations([issue], people, seed.zones, t1);
    expect(r1.updates[0].escalation_level).toBe(1);
    expect(r1.updates[0].assigned_to).not.toBe(issue.assigned_to);
    issue = { ...issue, ...r1.updates[0] } as Issue;
    const r2 = tickEscalations([issue], people, seed.zones, new Date(t1.getTime() + 31_000));
    expect(r2.updates[0].escalation_level).toBe(2);
    expect(people.find((p) => p.id === r2.updates[0].assigned_to)?.role).toBe('organizer');
    issue = { ...issue, ...r2.updates[0] } as Issue;
    expect(tickEscalations([issue], people, seed.zones, new Date(t1.getTime() + 120_000)).updates).toEqual([]);
  });

  it('ignores acknowledged issues', () => {
    const issue = { id: 'i', status: 'acknowledged', ack_deadline: new Date(0).toISOString(), escalation_level: 0 } as Issue;
    expect(tickEscalations([issue], people, seed.zones, now).updates).toEqual([]);
  });
});
