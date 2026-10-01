import { handle, HttpError, ok, readJson } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Owner adds another coordinator account to the event (they then see it in their events list). */
export async function POST(req: Request) {
  const b = await readJson<{ eventId?: string; email?: string }>(req);
  return handle(req, { eventId: b.eventId, roles: ['owner'] }, async ({ db, eventId }) => {
    const email = (b.email ?? '').trim().toLowerCase();
    if (!email) throw new HttpError(400, 'Enter their email address.');
    const { data: p } = await db.from('profiles').select('*').eq('email', email).maybeSingle();
    if (!p) throw new HttpError(404, 'No account with that email. Ask them to create a coordinator account first.');
    if (p.account_type !== 'coordinator') throw new HttpError(400, `${p.full_name} has a ${p.account_type} account. Only coordinator accounts can be added to the team.`);
    const { data: event } = await db.from('events').select('starts_at, ends_at, owner_id').eq('id', eventId!).single();
    if (event?.owner_id === p.id) throw new HttpError(400, 'That is you. You already own this event.');
    const { data: existing } = await db.from('volunteers').select('id').eq('event_id', eventId!).eq('user_id', p.id).maybeSingle();
    if (existing) throw new HttpError(409, `${p.full_name} is already on this event.`);
    const { error } = await db.from('volunteers').insert({
      event_id: eventId, user_id: p.id, name: p.full_name, email: p.email, phone: p.phone, avatar_url: p.avatar_url, role: 'coordinator',
      skills: [], availability: [{ start: event!.starts_at, end: event!.ends_at }], max_hours: 12, reliability: 1, verified: true,
    });
    if (error) throw new HttpError(500, error.message);
    return ok({ name: p.full_name });
  });
}
