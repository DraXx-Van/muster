import { cleanName, handlePublic, hashToken, HttpError, newAttendeeToken, ok, readJson, verifyAttendee } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * Attendees join with the QR code's join code and a display name. No account, no email.
 * First visit: creates the attendee and returns a secret token for their device.
 * Returning visit (attendeeId + token): optionally renames them and returns the same identity.
 */
export async function POST(req: Request) {
  const b = await readJson<{ code?: string; name?: string; attendeeId?: string; token?: string }>(req);
  return handlePublic(async (db) => {
    const code = (b.code ?? '').trim().toUpperCase();
    const { data: event } = await db.from('events').select('id, name').eq('join_code', code).maybeSingle();
    if (!event) throw new HttpError(404, 'This QR code or link is not valid any more. Ask the organizers for a new one.');

    // returning attendee on the same device
    if (b.attendeeId && b.token) {
      const existing = await verifyAttendee(db, event.id, b.attendeeId, b.token);
      if (b.name && b.name.trim() && b.name.trim() !== existing.name) {
        const name = cleanName(b.name);
        const { error } = await db.from('attendees').update({ name }).eq('id', existing.id);
        if (error) throw new HttpError(500, error.message);
        return ok({ eventId: event.id, eventName: event.name, attendeeId: existing.id, token: b.token, name });
      }
      return ok({ eventId: event.id, eventName: event.name, attendeeId: existing.id, token: b.token, name: existing.name });
    }

    const name = cleanName(b.name);
    const token = newAttendeeToken();
    const { data, error } = await db.from('attendees').insert({ event_id: event.id, name, token_hash: hashToken(token) }).select('id').single();
    if (error || !data) throw new HttpError(500, error?.message ?? 'Could not join the event.');
    return ok({ eventId: event.id, eventName: event.name, attendeeId: data.id, token, name });
  });
}
