// ALL data access lives here. Functions take an optional client so route handlers can pass the server client.
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Announcement, Assignment, AssignmentStatus, EventRow, Issue, Notification, Shift, Snapshot, Task, TaskStatus, Volunteer, Zone,
} from '../types';
import { supabase } from './client';

type Db = SupabaseClient;

function check<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}

// ---------- reads ----------

export async function getSnapshot(db: Db = supabase): Promise<Snapshot> {
  const [event, zones, volunteers, shifts, assignments, tasks, issues, announcements, notifications] = await Promise.all([
    db.from('events').select('*').order('created_at', { ascending: false }).limit(1),
    db.from('zones').select('*').order('name'),
    db.from('volunteers').select('*').order('name'),
    db.from('shifts').select('*').order('starts_at'),
    db.from('assignments').select('*'),
    db.from('tasks').select('*').order('created_at', { ascending: false }),
    db.from('issues').select('*').order('created_at', { ascending: false }),
    db.from('announcements').select('*').order('created_at', { ascending: false }),
    db.from('notifications').select('*').order('created_at', { ascending: false }).limit(500),
  ]);
  const ev = check<EventRow[]>(event, 'events');
  if (!ev.length) throw new Error('No event found. Run `npm run seed`.');
  return {
    event: ev[0],
    zones: check<Zone[]>(zones, 'zones'),
    volunteers: check<Volunteer[]>(volunteers, 'volunteers'),
    shifts: check<Shift[]>(shifts, 'shifts'),
    assignments: check<Assignment[]>(assignments, 'assignments'),
    tasks: check<Task[]>(tasks, 'tasks'),
    issues: check<Issue[]>(issues, 'issues'),
    announcements: check<Announcement[]>(announcements, 'announcements'),
    notifications: check<Notification[]>(notifications, 'notifications'),
  };
}

export async function getEvent(db: Db = supabase): Promise<EventRow> {
  const rows = check<EventRow[]>(await db.from('events').select('*').order('created_at', { ascending: false }).limit(1), 'events');
  if (!rows.length) throw new Error('No event found. Run `npm run seed`.');
  return rows[0];
}

// ---------- event / clock ----------

export async function updateEvent(id: string, patch: Partial<Pick<EventRow, 'name' | 'venue' | 'starts_at' | 'ends_at'>>, db: Db = supabase) {
  check(await db.from('events').update(patch).eq('id', id).select().single(), 'update event');
}

export async function setClockOffset(eventId: string, minutes: number, db: Db = supabase) {
  check(await db.from('events').update({ clock_offset_minutes: Math.round(minutes) }).eq('id', eventId).select().single(), 'set clock');
}

// ---------- zones and shifts (setup) ----------

export type ZoneInput = Omit<Zone, 'id'>;
export async function createZone(z: ZoneInput, db: Db = supabase): Promise<Zone> {
  return check<Zone>(await db.from('zones').insert(z).select().single(), 'create zone');
}
export async function updateZone(id: string, patch: Partial<ZoneInput>, db: Db = supabase) {
  check(await db.from('zones').update(patch).eq('id', id).select().single(), 'update zone');
}
export async function deleteZone(id: string, db: Db = supabase) {
  check(await db.from('zones').delete().eq('id', id).select(), 'delete zone');
}

export type ShiftInput = Omit<Shift, 'id'>;
export async function createShifts(rows: ShiftInput[], db: Db = supabase): Promise<Shift[]> {
  return check<Shift[]>(await db.from('shifts').insert(rows).select(), 'create shifts');
}
export async function updateShift(id: string, patch: Partial<ShiftInput>, db: Db = supabase) {
  check(await db.from('shifts').update(patch).eq('id', id).select().single(), 'update shift');
}
export async function deleteShift(id: string, db: Db = supabase) {
  check(await db.from('shifts').delete().eq('id', id).select(), 'delete shift');
}

// ---------- volunteers ----------

export type VolunteerInput = Omit<Volunteer, 'id' | 'verified'> & { verified?: boolean };
export async function createVolunteer(v: VolunteerInput, db: Db = supabase): Promise<Volunteer> {
  return check<Volunteer>(await db.from('volunteers').insert(v).select().single(), 'register volunteer');
}
export async function updateVolunteer(id: string, patch: Partial<VolunteerInput>, db: Db = supabase) {
  check(await db.from('volunteers').update(patch).eq('id', id).select().single(), 'update volunteer');
}

// ---------- assignments and attendance ----------

/** Note: for dropped / no_show rows, checked_out_at stores WHEN the change happened (used by the live feed). */
export async function setAssignmentStatus(id: string, status: AssignmentStatus, at: Date, db: Db = supabase) {
  const patch: Partial<Assignment> = { status };
  if (status === 'checked_in') patch.checked_in_at = at.toISOString();
  if (status === 'completed') patch.checked_out_at = at.toISOString();
  if (status === 'dropped' || status === 'no_show') patch.checked_out_at = at.toISOString();
  check(await db.from('assignments').update(patch).eq('id', id).select().single(), 'update assignment');
}

export async function insertAssignments(
  rows: { shift_id: string; volunteer_id: string; score: number; reason: string }[], db: Db = supabase,
): Promise<Assignment[]> {
  if (!rows.length) return [];
  return check<Assignment[]>(
    await db.from('assignments').upsert(rows.map((r) => ({ ...r, status: 'assigned' })), { onConflict: 'shift_id,volunteer_id', ignoreDuplicates: true }).select(),
    'insert assignments',
  );
}

export async function moveAssignment(id: string, toShiftId: string, reason: string, db: Db = supabase) {
  check(await db.from('assignments').update({ shift_id: toShiftId, reason }).eq('id', id).select().single(), 'move assignment');
}

// ---------- tasks ----------

export type TaskInput = Pick<Task, 'title' | 'zone_id' | 'priority' | 'assignee_id'> & { description?: string | null; created_by?: string | null; event_id: string };
export async function createTask(t: TaskInput, db: Db = supabase): Promise<Task> {
  return check<Task>(await db.from('tasks').insert(t).select().single(), 'create task');
}
export async function updateTaskStatus(id: string, status: TaskStatus, db: Db = supabase) {
  check(await db.from('tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', id).select().single(), 'update task');
}
export async function updateTask(id: string, patch: Partial<Pick<Task, 'assignee_id' | 'priority' | 'title' | 'zone_id'>>, db: Db = supabase) {
  check(await db.from('tasks').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).select().single(), 'update task');
}

// ---------- issues (creation with routing goes through /api/issues) ----------

export async function acknowledgeIssue(id: string, by: string | null, db: Db = supabase) {
  check(
    await db.from('issues').update({ status: 'acknowledged', acknowledged_at: new Date().toISOString(), assigned_to: by }).eq('id', id).select().single(),
    'acknowledge issue',
  );
}
export async function resolveIssue(id: string, db: Db = supabase) {
  check(await db.from('issues').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', id).select().single(), 'resolve issue');
}

// ---------- notifications ----------

export async function insertNotifications(rows: Omit<Notification, 'id' | 'read' | 'created_at'>[], db: Db = supabase) {
  if (!rows.length) return;
  check(await db.from('notifications').insert(rows).select('id'), 'insert notifications');
}
export async function markNotificationsRead(volunteerId: string, db: Db = supabase) {
  check(await db.from('notifications').update({ read: true }).eq('volunteer_id', volunteerId).eq('read', false).select('id'), 'mark read');
}

export async function insertAnnouncement(a: Omit<Announcement, 'id' | 'created_at'>, db: Db = supabase): Promise<Announcement> {
  return check<Announcement>(await db.from('announcements').insert(a).select().single(), 'create announcement');
}
