import { handle, HttpError, ok, readJson } from '@/lib/api';
import { getProfile } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

/** Volunteers and attendees join an event with its join code. */
export async function POST(req: Request) {
  const b = await readJson<{ code?: string }>(req);
  return handle(req, {}, async ({ db, user }) => {
    const code = (b.code ?? '').trim().toUpperCase().replace(/\s+/g, '');
    if (code.length < 4) throw new HttpError(400, 'Enter the join code you were given.');
    const profile = await getProfile(user.id, db);
    if (!profile) throw new HttpError(403, 'Finish creating your account first.');
    const { data: event } = await db.from('events').select('id, name, starts_at, ends_at, owner_id').eq('join_code', code).maybeSingle();
    if (!event) throw new HttpError(404, 'No event matches that code. Check it and try again.');

    if (profile.account_type === 'coordinator') {
      throw new HttpError(403, event.owner_id === user.id ? 'You own this event. Open it from your events list.' : 'Coordinator accounts create events. Ask the organizer to add you as a co-coordinator.');
    }

    if (profile.account_type === 'volunteer') {
      const { data: existing } = await db.from('volunteers').select('id').eq('event_id', event.id).eq('user_id', user.id).maybeSingle();
      if (existing) return ok({ eventId: event.id, name: event.name, already: true });
      const { error } = await db.from('volunteers').insert({
        event_id: event.id, user_id: user.id, name: profile.full_name, email: profile.email, phone: profile.phone, avatar_url: profile.avatar_url,
        role: 'volunteer', skills: [], availability: [{ start: event.starts_at, end: event.ends_at }], max_hours: 6, reliability: 1, verified: false,
      });
      if (error) throw new HttpError(500, error.message);
      return ok({ eventId: event.id, name: event.name, already: false });
    }

    const { data: existing } = await db.from('attendees').select('id').eq('event_id', event.id).eq('user_id', user.id).maybeSingle();
    if (existing) return ok({ eventId: event.id, name: event.name, already: true });
    const { error } = await db.from('attendees').insert({ event_id: event.id, user_id: user.id, name: profile.full_name, email: profile.email, phone: profile.phone, avatar_url: profile.avatar_url });
    if (error) throw new HttpError(500, error.message);
    return ok({ eventId: event.id, name: event.name, already: false });
  });
}
