// ALL data access lives here. Functions take an optional client so route handlers can pass the server client.
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Announcement, Assignment, AssignmentStatus, Attendee, Complaint, ComplaintStatus, EventRow, Issue, Notification, NotificationDraft,
  Profile, Shift, Snapshot, Task, TaskStatus, Volunteer, Zone,
} from '../types';
import { supabase } from './client';

type Db = SupabaseClient;

function check<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}

// ---------- profiles ----------

export async function getProfile(id: string, db: Db = supabase): Promise<Profile | null> {
  const res = await db.from('profiles').select('*').eq('id', id).maybeSingle();
  return check<Profile | null>(res, 'profile');
}

export async function updateProfile(id: string, patch: Partial<Pick<Profile, 'full_name' | 'phone' | 'avatar_url'>>, db: Db = supabase) {
  check(await db.from('profiles').update(patch).eq('id', id).select().single(), 'update profile');
  // keep the per-event roster copies in step with the account
  const rosterPatch: Partial<Volunteer> = {};
  if (patch.full_name !== undefined) rosterPatch.name = patch.full_name;
  if (patch.phone !== undefined) rosterPatch.phone = patch.phone;
  if (patch.avatar_url !== undefined) rosterPatch.avatar_url = patch.avatar_url;
  if (Object.keys(rosterPatch).length) await db.from('volunteers').update(rosterPatch).eq('user_id', id);
  const attPatch: Partial<Attendee> = {};
  if (patch.full_name !== undefined) attPatch.name = patch.full_name;
  if (patch.phone !== undefined) attPatch.phone = patch.phone;
  if (patch.avatar_url !== undefined) attPatch.avatar_url = patch.avatar_url;
  if (Object.keys(attPatch).length) await db.from('attendees').update(attPatch).eq('user_id', id);
}

// ---------- event lists (per account type) ----------

export interface EventSummary { event: EventRow; volunteers: number; seats: number; role?: string }

/** Events a coordinator created, plus events they were added to as a coordinator. */
export async function listCoordinatorEvents(userId: string, db: Db = supabase): Promise<EventSummary[]> {
  const [owned, member] = await Promise.all([
    db.from('events').select('*').eq('owner_id', userId),
    db.from('volunteers').select('event_id, role').eq('user_id', userId).in('role', ['coordinator', 'organizer']),
  ]);
  const ownedRows = check<EventRow[]>(owned, 'events');
  const memberIds = check<{ event_id: string; role: string }[]>(member, 'memberships').map((m) => m.event_id).filter((id) => !ownedRows.some((e) => e.id === id));
  const extra = memberIds.length ? check<EventRow[]>(await db.from('events').select('*').in('id', memberIds), 'events') : [];
  const events = [...ownedRows, ...extra].sort((a, b) => b.created_at.localeCompare(a.created_at));
  return summarise(events, userId, db);
}

async function summarise(events: EventRow[], userId: string, db: Db): Promise<EventSummary[]> {
  if (!events.length) return [];
  const ids = events.map((e) => e.id);
  const [vols, shifts] = await Promise.all([
    db.from('volunteers').select('event_id').eq('role', 'volunteer').in('event_id', ids),
    db.from('shifts').select('event_id, headcount').in('event_id', ids),
  ]);
  const vc = new Map<string, number>();
  for (const v of check<{ event_id: string }[]>(vols, 'volunteers')) vc.set(v.event_id, (vc.get(v.event_id) ?? 0) + 1);
  const sc = new Map<string, number>();
  for (const s of check<{ event_id: string; headcount: number }[]>(shifts, 'shifts')) sc.set(s.event_id, (sc.get(s.event_id) ?? 0) + s.headcount);
  return events.map((event) => ({ event, volunteers: vc.get(event.id) ?? 0, seats: sc.get(event.id) ?? 0, role: event.owner_id === userId ? 'owner' : 'coordinator' }));
}

/** Events a volunteer or attendee joined. */
export async function listJoinedEvents(userId: string, kind: 'volunteer' | 'attendee', db: Db = supabase): Promise<EventRow[]> {
  const table = kind === 'volunteer' ? 'volunteers' : 'attendees';
  const rows = check<{ events: EventRow | EventRow[] | null }[]>(await db.from(table).select('events(*)').eq('user_id', userId), 'joined events');
  return rows.flatMap((r) => (Array.isArray(r.events) ? r.events : r.events ? [r.events] : []));
}

// ---------- one event ----------

export async function getSnapshot(eventId: string, db: Db = supabase): Promise<Snapshot> {
  const e = (t: string) => db.from(t).select('*').eq('event_id', eventId);
  const [event, zones, volunteers, shifts, assignments, tasks, issues, announcements, notifications, complaints, attendees] = await Promise.all([
    db.from('events').select('*').eq('id', eventId).maybeSingle(),
    e('zones').order('name'),
    e('volunteers').order('name'),
    e('shifts').order('starts_at'),
    e('assignments'),
    e('tasks').order('created_at', { ascending: false }),
    e('issues').order('created_at', { ascending: false }),
    e('announcements').order('created_at', { ascending: false }),
    e('notifications').order('created_at', { ascending: false }).limit(500),
    e('complaints').order('created_at', { ascending: false }),
    e('attendees').order('name'),
  ]);
  const ev = check<EventRow | null>(event, 'event');
  if (!ev) throw new Error('This event does not exist or you no longer have access to it.');
  return {
    event: ev,
    zones: check<Zone[]>(zones, 'zones'),
    volunteers: check<Volunteer[]>(volunteers, 'volunteers'),
    shifts: check<Shift[]>(shifts, 'shifts'),
    assignments: check<Assignment[]>(assignments, 'assignments'),
    tasks: check<Task[]>(tasks, 'tasks'),
    issues: check<Issue[]>(issues, 'issues'),
    announcements: check<Announcement[]>(announcements, 'announcements'),
    notifications: check<Notification[]>(notifications, 'notifications'),
    complaints: check<Complaint[]>(complaints, 'complaints'),
    attendees: check<Attendee[]>(attendees, 'attendees'),
  };
}

export async function getEvent(eventId: string, db: Db = supabase): Promise<EventRow | null> {
  return check<EventRow | null>(await db.from('events').select('*').eq('id', eventId).maybeSingle(), 'event');
}

export async function updateEvent(id: string, patch: Partial<Pick<EventRow, 'name' | 'venue' | 'description' | 'starts_at' | 'ends_at' | 'cover_url'>>, db: Db = supabase) {
  check(await db.from('events').update(patch).eq('id', id).select().single(), 'update event');
}

export async function deleteEvent(id: string, db: Db = supabase) {
  check(await db.from('events').delete().eq('id', id).select(), 'delete event');
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

export type VolunteerInput = Omit<Volunteer, 'id' | 'verified' | 'user_id' | 'avatar_url'> & { verified?: boolean; user_id?: string | null; avatar_url?: string | null };
export async function createVolunteer(v: VolunteerInput, db: Db = supabase): Promise<Volunteer> {
  return check<Volunteer>(await db.from('volunteers').insert(v).select().single(), 'register volunteer');
}
export async function updateVolunteer(id: string, patch: Partial<VolunteerInput>, db: Db = supabase) {
  check(await db.from('volunteers').update(patch).eq('id', id).select().single(), 'update volunteer');
}
export async function deleteVolunteer(id: string, db: Db = supabase) {
  check(await db.from('volunteers').delete().eq('id', id).select(), 'remove volunteer');
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
  eventId: string, rows: { shift_id: string; volunteer_id: string; score: number; reason: string }[], db: Db = supabase,
): Promise<Assignment[]> {
  if (!rows.length) return [];
  return check<Assignment[]>(
    await db.from('assignments').upsert(rows.map((r) => ({ ...r, event_id: eventId, status: 'assigned' })), { onConflict: 'shift_id,volunteer_id', ignoreDuplicates: true }).select(),
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

// ---------- complaints (creation goes through /api/complaints) ----------

export async function updateComplaint(id: string, patch: { status: ComplaintStatus; response?: string | null }, db: Db = supabase) {
  const row = { ...patch, updated_at: new Date().toISOString(), resolved_at: patch.status === 'resolved' ? new Date().toISOString() : null };
  check(await db.from('complaints').update(row).eq('id', id).select().single(), 'update complaint');
}

/** Attendee view: only complaints sent from this attendee's device identity. */
export async function listComplaintsByAttendee(eventId: string, attendeeId: string, db: Db = supabase): Promise<Complaint[]> {
  return check<Complaint[]>(await db.from('complaints').select('*').eq('event_id', eventId).eq('attendee_id', attendeeId).order('created_at', { ascending: false }), 'complaints');
}

/** Attendee view: announcements meant for attendees. */
export async function listAttendeeAnnouncements(eventId: string, db: Db = supabase): Promise<Announcement[]> {
  return check<Announcement[]>(
    await db.from('announcements').select('*').eq('event_id', eventId).in('audience', ['all', 'attendees']).order('created_at', { ascending: false }),
    'announcements',
  );
}

// ---------- notifications and announcements ----------

export async function insertNotifications(eventId: string, rows: NotificationDraft[], db: Db = supabase) {
  if (!rows.length) return;
  check(await db.from('notifications').insert(rows.map((r) => ({ ...r, event_id: eventId }))).select('id'), 'insert notifications');
}
export async function markNotificationsRead(volunteerId: string, db: Db = supabase) {
  check(await db.from('notifications').update({ read: true }).eq('volunteer_id', volunteerId).eq('read', false).select('id'), 'mark read');
}

export async function insertAnnouncement(a: Omit<Announcement, 'id' | 'created_at'>, db: Db = supabase): Promise<Announcement> {
  return check<Announcement>(await db.from('announcements').insert(a).select().single(), 'create announcement');
}
