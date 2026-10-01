// Route-handler helpers (server only): auth, event-role checks, JSON responses.
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { Snapshot } from './types';
import { getSnapshot } from './db/queries';
import { serverClient } from './db/server';
import { getEventNow } from './clockMath';

export type EventRole = 'owner' | 'coordinator' | 'volunteer' | 'attendee';
export const COORD: EventRole[] = ['owner', 'coordinator'];
export const MEMBER: EventRole[] = ['owner', 'coordinator', 'volunteer'];
export const ANYONE: EventRole[] = ['owner', 'coordinator', 'volunteer', 'attendee'];

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function ok<T>(data: T) {
  return NextResponse.json(data);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export interface Ctx { db: SupabaseClient; user: User; role: EventRole | null; eventId: string | null }

async function userFrom(req: Request, db: SupabaseClient): Promise<User> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'Please sign in first.');
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'Your session has expired. Please sign in again.');
  return data.user;
}

/** The caller's role in an event: owner, coordinator, volunteer, attendee, or null (no access). */
export async function eventRole(db: SupabaseClient, userId: string, eventId: string): Promise<EventRole | null> {
  const { data: ev } = await db.from('events').select('owner_id').eq('id', eventId).maybeSingle();
  if (!ev) return null;
  if (ev.owner_id === userId) return 'owner';
  const { data: v } = await db.from('volunteers').select('role').eq('event_id', eventId).eq('user_id', userId).maybeSingle();
  if (v) return v.role === 'volunteer' ? 'volunteer' : 'coordinator';
  const { data: a } = await db.from('attendees').select('id').eq('event_id', eventId).eq('user_id', userId).maybeSingle();
  return a ? 'attendee' : null;
}

/**
 * Wraps a handler: verifies the bearer token and (when an eventId is given) the caller's role in that event.
 * Errors come back as JSON { error } instead of an HTML 500 page.
 */
export async function handle(
  req: Request,
  opts: { eventId?: string | null; roles?: EventRole[] },
  fn: (ctx: Ctx) => Promise<Response>,
): Promise<Response> {
  try {
    const db = serverClient();
    const user = await userFrom(req, db);
    let role: EventRole | null = null;
    if (opts.eventId) {
      role = await eventRole(db, user.id, opts.eventId);
      if (!role || (opts.roles && !opts.roles.includes(role))) throw new HttpError(403, "You don't have access to do that in this event.");
    }
    return await fn({ db, user, role, eventId: opts.eventId ?? null });
  } catch (e) {
    if (e instanceof HttpError) return fail(e.message, e.status);
    return fail(e instanceof Error ? e.message : 'Unexpected error', 500);
  }
}

/** Public routes (sign-up): no token needed. */
export async function handlePublic(fn: (db: SupabaseClient) => Promise<Response>): Promise<Response> {
  try {
    return await fn(serverClient());
  } catch (e) {
    if (e instanceof HttpError) return fail(e.message, e.status);
    return fail(e instanceof Error ? e.message : 'Unexpected error', 500);
  }
}

export async function loadSnapshot(db: SupabaseClient, eventId: string): Promise<{ snap: Snapshot; now: Date }> {
  const snap = await getSnapshot(eventId, db);
  return { snap, now: getEventNow(snap.event.clock_offset_minutes) };
}

export async function readJson<T>(req: Request): Promise<T> {
  try { return (await req.json()) as T; } catch { throw new HttpError(400, 'Invalid request body.'); }
}

// ---------- attendees (QR join, no account) ----------

/** Attendees prove who they are with a secret kept on their device; only its hash is stored. */
export const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');
export const newAttendeeToken = (): string => randomBytes(24).toString('hex');

export async function verifyAttendee(db: SupabaseClient, eventId: string, attendeeId: string | undefined, token: string | undefined) {
  if (!attendeeId || !token) throw new HttpError(401, 'Open the event from its QR code again to continue.');
  const { data } = await db.from('attendees').select('*').eq('id', attendeeId).eq('event_id', eventId).maybeSingle();
  if (!data || !data.token_hash || data.token_hash !== hashToken(token)) throw new HttpError(401, 'Open the event from its QR code again to continue.');
  return data as { id: string; name: string; event_id: string };
}

export function cleanName(raw: string | undefined): string {
  const name = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (name.length < 2) throw new HttpError(400, 'Please enter a name (at least 2 characters).');
  if (name.length > 40) throw new HttpError(400, 'That name is too long (40 characters at most).');
  return name;
}
