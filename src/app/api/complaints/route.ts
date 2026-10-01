import { ANYONE, fail, handle, handlePublic, HttpError, loadSnapshot, ok, readJson, verifyAttendee } from '@/lib/api';
import { insertNotifications } from '@/lib/db/queries';
import { routeIssue } from '@/lib/engine';
import type { ComplaintCategory } from '@/lib/types';
import type { SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const CATEGORIES: ComplaintCategory[] = ['medical', 'safety', 'facilities', 'food', 'crowd', 'staff', 'lost_found', 'other'];

interface Body { eventId?: string; category?: ComplaintCategory; zone_id?: string | null; description?: string; attendeeId?: string; token?: string }

/** Shared by attendees (QR identity) and signed-in members. Medical and safety reports also raise an issue. */
async function lodge(db: SupabaseClient, b: Body, who: { submitted_by: string | null; attendee_id: string | null; name: string; contact: string | null }) {
  if (!b.category || !CATEGORIES.includes(b.category)) throw new HttpError(400, 'Pick what this is about.');
  const description = b.description?.trim() ?? '';
  if (description.length < 5) throw new HttpError(400, 'Describe what happened (5+ characters).');

  const { snap } = await loadSnapshot(db, b.eventId!);
  const zone = snap.zones.find((z) => z.id === b.zone_id) ?? null;

  let issueId: string | null = null;
  if (b.category === 'medical' || b.category === 'safety') {
    const sev = b.category === 'medical' ? 'critical' : 'high';
    const cat = b.category === 'medical' ? 'medical' : 'security';
    const text = `Alert from ${who.name}: ${description}`;
    const route = routeIssue({ category: cat, severity: sev, zone_id: zone?.id ?? null, description: text }, snap.volunteers, snap.zones, new Date());
    const { data: issue, error } = await db.from('issues').insert({
      event_id: b.eventId, zone_id: zone?.id ?? null, category: cat, severity: sev, description: text,
      assigned_to: route.assigned_to, escalation_level: 0, ack_deadline: route.ack_deadline,
    }).select('id').single();
    if (error) throw new HttpError(500, error.message);
    issueId = issue.id;
    await insertNotifications(b.eventId!, route.notifications, db);
  }

  const { data, error } = await db.from('complaints').insert({
    event_id: b.eventId, submitted_by: who.submitted_by, attendee_id: who.attendee_id, submitter_name: who.name,
    contact: who.contact, category: b.category, zone_id: zone?.id ?? null, description, issue_id: issueId,
  }).select().single();
  if (error) throw new HttpError(500, error.message);
  return ok({ complaint: data, urgent: !!issueId });
}

export async function POST(req: Request) {
  const b = await readJson<Body>(req);
  if (!b.eventId) return fail('eventId is required');

  // attendee scanned a QR: identified by the secret on their device, no login
  if (b.attendeeId) {
    return handlePublic(async (db) => {
      const att = await verifyAttendee(db, b.eventId!, b.attendeeId, b.token);
      return lodge(db, b, { submitted_by: null, attendee_id: att.id, name: att.name, contact: null });
    });
  }

  // signed-in volunteer or coordinator
  return handle(req, { eventId: b.eventId, roles: ANYONE }, async ({ db, user }) => {
    const { data: profile } = await db.from('profiles').select('full_name, email, phone').eq('id', user.id).single();
    return lodge(db, b, { submitted_by: user.id, attendee_id: null, name: profile?.full_name ?? 'Member', contact: profile?.phone || profile?.email || null });
  });
}
