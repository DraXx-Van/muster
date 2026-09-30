// Derived numbers for the UI. Every stat on screen comes from here (no hardcoded fake data).
import type { Assignment, CoverageCell, CoverageStatus, Shift, Snapshot, Volunteer, Zone } from './types';
import { computeCoverage, fmtTime, isActiveStatus } from './engine';
import { HOUR, ms } from './engine/time';

export const STATUS_STYLE: Record<CoverageStatus, { label: string; text: string; bg: string; border: string; solid: string; var: string }> = {
  covered: { label: 'Covered', text: 'text-covered', bg: 'bg-covered/15', border: 'border-covered/40', solid: 'bg-covered', var: 'var(--covered)' },
  partial: { label: 'Partial', text: 'text-partial', bg: 'bg-partial/15', border: 'border-partial/40', solid: 'bg-partial', var: 'var(--partial)' },
  gap: { label: 'Gap', text: 'text-gap', bg: 'bg-gap/15', border: 'border-gap/40', solid: 'bg-gap', var: 'var(--gap)' },
};

export const initials = (name: string) =>
  name.replace(/^(dr|mr|mrs|ms)\.?\s+/i, '').split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');

export interface Block { key: string; start: string; end: string; label: string }

/** Distinct shift time windows, sorted. */
export function timeBlocks(shifts: Shift[]): Block[] {
  const map = new Map<string, Block>();
  for (const s of shifts) {
    const key = `${s.starts_at}|${s.ends_at}`;
    if (!map.has(key)) map.set(key, { key, start: s.starts_at, end: s.ends_at, label: `${fmtTime(s.starts_at)}-${fmtTime(s.ends_at)}` });
  }
  return [...map.values()].sort((a, b) => a.start.localeCompare(b.start));
}

export const blockKey = (s: Shift) => `${s.starts_at}|${s.ends_at}`;

export const volunteersOnly = (snap: Snapshot) => snap.volunteers.filter((v) => v.role === 'volunteer');

export function coverageCells(snap: Snapshot, mode: 'planned' | 'live', now: Date): CoverageCell[] {
  return computeCoverage(snap.shifts, snap.assignments, mode, now);
}

/** Share of seats filled (capped per shift), over the given shifts. */
export function coveragePct(cells: CoverageCell[]): number {
  const req = cells.reduce((n, c) => n + c.required, 0);
  if (!req) return 100;
  return (cells.reduce((n, c) => n + Math.min(c.present, c.required), 0) / req) * 100;
}

/** The shift a zone should be judged on right now: the one running, else the next, else the last. */
export function focusShift(zoneId: string, shifts: Shift[], now: Date): Shift | undefined {
  const t = now.getTime();
  const mine = shifts.filter((s) => s.zone_id === zoneId).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  return mine.find((s) => ms(s.starts_at) <= t && t < ms(s.ends_at)) ?? mine.find((s) => ms(s.starts_at) > t) ?? mine[mine.length - 1];
}

export interface HourBreakdown { done: number; running: number; scheduled: number; live: number }

/** Per volunteer: hours completed, hours running right now (demo clock) and total scheduled. */
export function hoursByVolunteer(snap: Snapshot, now: Date): Map<string, HourBreakdown> {
  const shiftById = new Map(snap.shifts.map((s) => [s.id, s]));
  const out = new Map<string, HourBreakdown>();
  const get = (id: string) => out.get(id) ?? (out.set(id, { done: 0, running: 0, scheduled: 0, live: 0 }), out.get(id)!);
  for (const a of snap.assignments) {
    const s = shiftById.get(a.shift_id);
    if (!s) continue;
    const h = get(a.volunteer_id);
    if (isActiveStatus(a.status) || a.status === 'checked_in') h.scheduled += (ms(s.ends_at) - ms(s.starts_at)) / HOUR;
    if (a.status === 'completed' && a.checked_in_at && a.checked_out_at) {
      h.done += Math.max(0, (ms(a.checked_out_at) - ms(a.checked_in_at)) / HOUR);
    } else if (a.status === 'checked_in' && a.checked_in_at) {
      h.running += Math.max(0, (Math.min(now.getTime(), ms(s.ends_at) + 30 * 60_000) - ms(a.checked_in_at)) / HOUR);
    }
  }
  for (const h of out.values()) h.live = h.done + h.running;
  return out;
}

export function stdDev(values: number[]): number {
  if (!values.length) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((a, v) => a + (v - avg) ** 2, 0) / values.length);
}

export interface Kpis {
  coverage: number; checkedIn: number; attendance: number | null; openIssues: number; tasksDone: number; tasksTotal: number;
}

export function computeKpis(snap: Snapshot, cells: CoverageCell[], now: Date): Kpis {
  const t = now.getTime();
  const shiftById = new Map(snap.shifts.map((s) => [s.id, s]));
  const remaining = snap.shifts.filter((s) => ms(s.ends_at) > t).map((s) => s.id);
  const scope = cells.filter((c) => remaining.includes(c.shift_id));
  // attendance = checked in / expected, over shifts that started more than 15 min ago
  const started = snap.assignments.filter((a) => {
    const s = shiftById.get(a.shift_id);
    return s && ms(s.starts_at) + 15 * 60_000 <= t && a.status !== 'dropped';
  });
  const present = started.filter((a) => a.status === 'checked_in' || a.status === 'completed').length;
  const tasksDone = snap.tasks.filter((x) => x.status === 'resolved').length;
  return {
    coverage: coveragePct(scope.length ? scope : cells),
    checkedIn: snap.assignments.filter((a) => a.status === 'checked_in').length,
    attendance: started.length ? (present / started.length) * 100 : null,
    openIssues: snap.issues.filter((i) => i.status !== 'resolved').length,
    tasksDone,
    tasksTotal: snap.tasks.length,
  };
}

export interface SeatGap { shift: Shift; missing: number }

/** Open seats in the current database state (planned view). */
export function openSeats(snap: Snapshot): SeatGap[] {
  const filled = new Map<string, number>();
  for (const a of snap.assignments) if (isActiveStatus(a.status) || a.status === 'checked_in') filled.set(a.shift_id, (filled.get(a.shift_id) ?? 0) + 1);
  return snap.shifts
    .map((shift) => ({ shift, missing: shift.headcount - (filled.get(shift.id) ?? 0) }))
    .filter((g) => g.missing > 0);
}

export function activeAssignments(snap: Snapshot): Assignment[] {
  return snap.assignments.filter((a) => isActiveStatus(a.status) || a.status === 'checked_in');
}

export const zoneName = (zones: Zone[], id: string | null | undefined) => zones.find((z) => z.id === id)?.name ?? 'No zone';
export const volunteerName = (vs: Volunteer[], id: string | null | undefined) => vs.find((v) => v.id === id)?.name ?? 'Unassigned';

/** Who an announcement reaches (mirrors /api/announce): everyone, people assigned in a zone, or people on a shift role. */
export function recipientCount(snap: Snapshot, audience: 'all' | 'zone' | 'role', zoneId: string, roleName: string): number {
  if (audience === 'all') return snap.volunteers.length;
  const shiftById = new Map(snap.shifts.map((s) => [s.id, s]));
  const ids = new Set<string>();
  for (const a of activeAssignments(snap)) {
    const s = shiftById.get(a.shift_id);
    if (s && (audience === 'zone' ? s.zone_id === zoneId : s.role_name === roleName)) ids.add(a.volunteer_id);
  }
  if (audience === 'zone') {
    const coord = snap.zones.find((z) => z.id === zoneId)?.coordinator_id;
    if (coord) ids.add(coord);
  }
  return ids.size;
}

export const CHECK_WINDOW_MS = 15 * 60_000;
/** Check-in/out is allowed from 15 min before the shift starts to 15 min after it ends (demo clock). */
export function inCheckWindow(shift: Shift, now: Date): boolean {
  const t = now.getTime();
  return t >= ms(shift.starts_at) - CHECK_WINDOW_MS && t <= ms(shift.ends_at) + CHECK_WINDOW_MS;
}
